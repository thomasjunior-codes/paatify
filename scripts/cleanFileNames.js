import fs from 'fs'
import path from 'path'

// Usage: node cleanFileNames.js <directoryPath>

const dirPath = process.argv[2]
if (!dirPath) {
  console.error('Usage: node cleanFileNames.js <directoryPath>')
  process.exit(1)
}

const allowedExt = ['.mp3', '.m4a', '.wav', '.ogg']

// Common website suffixes to remove
const websitePatterns = [
  /- MassTamilan(?:\.(?:com|dev|io|org|so))?/gi,
  /- SenSongsMp3(?:\.(?:Co|com))?/gi,
  /- Songspkred(?:\.(?:co))?/gi,
  /- Pagalworld(?:\.(?:gay))?/gi,
  /- Mr-Jatt(?:\.(?:com))?/gi,
  /- Mp3Beet(?:\.(?:com))?/gi,
  /- Team Music/gi,
  /- ETERNAL LOVE/gi,
  /- BGM/gi,
  /- Background score/gi,
  /- (?:Mp3Beet|Songspkred|Pagalworld|Mr-Jatt|MassTamilan|SenSongsMp3)\.[\w]+/gi,
  /\s*\([^)]*\)$/g, // Remove anything in parentheses at the end
  /- My Free Mp3/gi,
  /- Masstamilan/gi,
  /MassTamilan\.io/gi,
  /MassTamilan\.com/gi,
  /MassTamilan\.dev/gi,
  /MassTamilan\.org/gi,
  /MassTamilan\.so/gi,
  /SenSongsMp3\.Co/gi,
  /Songspkred\.co/gi,
  /Pagalworld\.gay/gi,
  /Mr-Jatt\.com/gi,
  /Mp3Beet\.com/gi,
]

const cleanName = (name) => {
  let cleaned = name
  websitePatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '')
  })
  return cleaned.trim()
}

const files = fs.readdirSync(dirPath).filter((file) => {
  const ext = path.extname(file).toLowerCase()
  return allowedExt.includes(ext)
})

files.forEach((file) => {
  const fullPath = path.join(dirPath, file)
  const parsed = path.parse(file)
  const cleanedName = cleanName(parsed.name).replace(/-/g, ' ').trim()
  const newFileName = `${cleanedName}${parsed.ext}`
  const newPath = path.join(dirPath, newFileName)

  if (newFileName !== file) {
    fs.renameSync(fullPath, newPath)
    console.log(`Renamed: ${file} -> ${newFileName}`)
  }
})

console.log(`Processed ${files.length} files.`)