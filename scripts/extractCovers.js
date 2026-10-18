import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { parseFile, selectCover } from 'music-metadata'
import sharp from 'sharp'

const publicDir = path.resolve(process.cwd(), 'public')
const songsFile = path.join(publicDir, 'songs.json')
const coversDir = path.join(publicDir, 'covers')
const COVER_SIZE = 400
const coverFilePattern = /^[0-9a-f]{10}\.jpg$/

// Download sites often embed their own logo instead of the film's cover.
// These are the ones found so far (first 10 hex chars of the image's SHA-1).
const SITE_LOGOS = new Set([
  '7174de9b71', // MassTamilan.com
  '127779b990', // MassTamilan.com
  '21a148bcf5', // MassTamilan.io
  'e77474518c', // Masstamilan.in
  '07973492ae', // Masstamilan.in
  '2c2475b1a0', // isaimini.net
  'a1456baab2', // Tnwap.net
  '1f1cfa8241', // TamilFreeMP3.net
])

// "Guna - MassTamilan.com" -> "guna"
const albumKey = (album) => (album ?? '').split(' - ')[0].trim().toLowerCase()

const readCover = async (file) => {
  try {
    const { common } = await parseFile(file, { duration: false, skipPostHeaders: true })
    const picture = selectCover(common.picture)
    if (!picture) return null
    const data = Buffer.from(picture.data)
    const hash = crypto.createHash('sha1').update(data).digest('hex').slice(0, 10)
    return { hash, data, album: albumKey(common.album) }
  } catch (error) {
    console.warn(`  ! Could not read tags from ${path.basename(file)}: ${error.message}`)
    return null
  }
}

// Most common vivid hue in the cover (used to tint the player), or null when the art is mostly grey
const dominantHue = async (file) => {
  const pixels = await sharp(file).resize(32, 32, { fit: 'cover' }).removeAlpha().raw().toBuffer()
  const buckets = Array.from({ length: 36 }, () => ({ weight: 0, x: 0, y: 0 }))
  let vivid = 0

  for (let i = 0; i < pixels.length; i += 3) {
    const [r, g, b] = [pixels[i] / 255, pixels[i + 1] / 255, pixels[i + 2] / 255]
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const delta = max - min
    const lightness = (max + min) / 2
    if (delta === 0 || lightness < 0.12 || lightness > 0.88) continue
    const saturation = delta / (1 - Math.abs(2 * lightness - 1))
    if (saturation < 0.3) continue

    let hue
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue = (hue * 60 + 360) % 360

    const bucket = buckets[Math.floor(hue / 10) % 36]
    bucket.weight += saturation
    bucket.x += Math.cos((hue * Math.PI) / 180) * saturation
    bucket.y += Math.sin((hue * Math.PI) / 180) * saturation
    vivid++
  }

  if (vivid < (pixels.length / 3) * 0.1) return null
  const best = buckets.reduce((a, b) => (b.weight > a.weight ? b : a))
  return Math.round(((Math.atan2(best.y, best.x) * 180) / Math.PI + 360) % 360)
}

const extractCovers = async () => {
  console.log('Extracting album art from audio files...')
  const songs = JSON.parse(fs.readFileSync(songsFile, 'utf-8'))
  fs.mkdirSync(coversDir, { recursive: true })

  const covers = new Map()
  const albumsByHash = new Map()
  for (const song of songs) {
    const cover = await readCover(path.join(publicDir, song.src))
    if (!cover) continue
    covers.set(song.src, cover)
    if (!albumsByHash.has(cover.hash)) albumsByHash.set(cover.hash, new Set())
    albumsByHash.get(cover.hash).add(cover.album)
  }

  // The same picture on songs from different films is a site logo, not album art
  const isSiteLogo = (hash) => SITE_LOGOS.has(hash) || albumsByHash.get(hash).size > 1

  const hues = new Map()
  for (const song of songs) {
    delete song.cover
    delete song.coverHue

    const cover = covers.get(song.src)
    if (!cover || isSiteLogo(cover.hash)) continue

    const name = `${cover.hash}.jpg`
    const outFile = path.join(coversDir, name)
    if (!fs.existsSync(outFile)) {
      await sharp(cover.data)
        .resize(COVER_SIZE, COVER_SIZE, { fit: 'cover' })
        .jpeg({ quality: 80, mozjpeg: true })
        .toFile(outFile)
    }
    if (!hues.has(name)) hues.set(name, await dominantHue(outFile))

    song.cover = `covers/${name}`
    if (hues.get(name) !== null) song.coverHue = hues.get(name)
  }

  // Remove covers that no song uses any more
  for (const file of fs.readdirSync(coversDir)) {
    if (coverFilePattern.test(file) && !hues.has(file)) fs.rmSync(path.join(coversDir, file))
  }

  fs.writeFileSync(songsFile, JSON.stringify(songs, null, 2) + '\n', 'utf-8')
  const withCover = songs.filter((song) => song.cover).length
  console.log(`✓ ${withCover} of ${songs.length} song(s) have album art (${hues.size} image(s) in public/covers)`)
}

extractCovers().catch((error) => {
  console.error('✗ Error extracting covers:', error.message)
  process.exitCode = 1
})
