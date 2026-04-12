import fs from 'fs'
import path from 'path'

const publicDir = path.resolve(process.cwd(), 'public')
const outFile = path.join(publicDir, 'songs.json')
const allowedExt = ['.mp3', '.m4a', '.wav', '.ogg']

const generateSongs = () => {
  try {
    console.log('Scanning public folder for audio files...')
    
    // Read all files in the public directory
    const files = fs.readdirSync(publicDir)
    
    const songs = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase()
        return allowedExt.includes(ext)
      })
      .map(file => {
        const name = path.parse(file).name
        const parts = name.split(' - ').filter(p => p.trim())
        const title = parts[0]?.trim() || 'Unknown Title'
        const artist = parts.slice(1).join(' - ').trim() || ''
        
        return { 
          title, 
          artist, 
          src: file 
        }
      })
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    
    fs.writeFileSync(outFile, JSON.stringify(songs, null, 2) + '\n', 'utf-8')
    
    if (songs.length > 0) {
      console.log(`✓ Generated ${songs.length} song(s) to songs.json`)
      songs.forEach(song => {
        console.log(`  - ${song.title}${song.artist ? ' by ' + song.artist : ''}`)
      })
    } else {
      console.log('⚠ No audio files found in public folder')
    }
  } catch (error) {
    console.error('✗ Error generating songs:', error.message)
    // Create empty songs.json so app can still run
    fs.writeFileSync(outFile, JSON.stringify([], null, 2) + '\n', 'utf-8')
  }
}

generateSongs()
