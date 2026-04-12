import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const publicDir = path.resolve(process.cwd(), 'public')
const songsJson = path.join(publicDir, 'songs.json')

function generateSongs() {
  try {
    execSync('node scripts/generateSongList.js', { stdio: 'inherit' })
    console.log('Songs list updated.')
  } catch (error) {
    console.error('Error generating songs:', error)
  }
}

// Initial generation
generateSongs()

// Watch for changes in public directory
fs.watch(publicDir, { recursive: true }, (eventType, filename) => {
  if (filename && (filename.endsWith('.mp3') || filename.endsWith('.m4a') || filename.endsWith('.wav') || filename.endsWith('.ogg'))) {
    console.log(`File ${filename} changed, regenerating songs...`)
    generateSongs()
  }
})

console.log('Watching public folder for music files...')