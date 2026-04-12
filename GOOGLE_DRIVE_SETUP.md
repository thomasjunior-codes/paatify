# Music Setup Guide

The MP3 player loads songs from the `public` folder locally.

## How to Add Songs

1. **Add audio files** to the `public` folder:
   - Place your MP3, M4A, WAV, or OGG files in the `public` folder

2. **Generate the song list**:
   ```bash
   npm run generate-songs
   ```
   This scans the `public` folder and creates `public/songs.json`

3. **Optional: Name your songs for better display**
   - Use the format: `Artist - Song Title.mp3`
   - The script will parse this into title and artist fields

## Example

```
public/
  The Beatles - Hey Jude.mp3
  Pink Floyd - Comfortably Numb.mp3
  Led Zeppelin - Stairway to Heaven.mp3
```

Running `npm run generate-songs` will create `songs.json` with proper metadata.

