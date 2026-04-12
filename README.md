# Paatify

A Spotify-inspired MP3 player web application built with React, TypeScript, and Vite.

## Features

- ▶️ Play/Pause controls with keyboard support
- ⏱️ Progress bar with seek functionality
- 🔊 Volume control
- 📋 Dynamic playlist generation from local music files
- 📱 Responsive design for mobile and web
- 🎨 Dark theme inspired by Spotify

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Setting Up Your Music

#### Option 1: Automatic (Recommended)

Simply place your MP3 files in the `public` folder, then:

```bash
npm run generate-songs
```

This scans the `public` folder and generates `public/songs.json` with all available music.

#### Option 2: Manual with File Naming

For better song titles and artist info:

1. Place your MP3 files in the `public` folder with naming format: `Artist - Song Title.mp3`
   - Example: `The Beatles - Hey Jude.mp3`
   - Example: `Pink Floyd - Comfortably Numb.mp3`

2. Generate the playlist:
   ```bash
   npm run generate-songs
   ```

The script will parse the artist and song title from the filename and generate `songs.json`.

### Running the Application

Start the development server:

```bash
npm run dev
```

The development server includes:
- Automatic song list generation on startup
- File watcher to detect new songs in the `public` folder
- Hot module reloading for code changes

Open your browser and navigate to `http://localhost:5173` to view Paatify.

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with auto-generation and file watching |
| `npm run generate-songs` | Manually scan `public` folder and generate `songs.json` |
| `npm run watch-songs` | Watch for file changes in `public` folder and regenerate `songs.json` |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint to check code quality |

### Building for Production

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Project Structure

```
Paatify/
├── public/                 # Music folder (add MP3 files here)
│   ├── songs.json         # Auto-generated playlist (DO NOT edit)
│   └── [your music files]
├── src/
│   ├── App.tsx            # Main player component
│   ├── App.css            # Player styles
│   ├── main.tsx           # React entry point
│   └── assets/            # Images and assets
├── scripts/
│   ├── generateSongList.js    # Scans public folder and generates songs.json
│   ├── watchSongs.js          # Watches for file changes
│   └── cleanFileNames.js      # Optional: remove website traces from filenames
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## How It Works

1. **Song Discovery**: When you run `npm run generate-songs` or start the dev server, the script scans the `public` folder for audio files (`.mp3`, `.m4a`, `.wav`, `.ogg`)

2. **Metadata Parsing**: Filenames are parsed to extract:
   - Artist name (before the " - ")
   - Song title (after the " - ")
   - If no " - " is found, the filename becomes the title

3. **Playlist Generation**: A `songs.json` file is created with all songs sorted alphabetically by title

4. **Music Playback**: The app loads songs from `songs.json` and streams them from the `public` folder

## Adding Your Own Music

### Simple Way (Recommended)

1. Download or copy your MP3 files
2. Place them in the `public` folder
3. Run:
   ```bash
   npm run generate-songs
   ```
4. Refresh your browser (automatic in dev mode)

### Better Organization

For cleaner display in the player, name your files:

```
public/
├── The Beatles - Hey Jude.mp3
├── Pink Floyd - Comfortably Numb.mp3
├── Led Zeppelin - Stairway to Heaven.mp3
├── David Bowie - Space Oddity.mp3
└── Queen - Bohemian Rhapsody.mp3
```

Then run `npm run generate-songs` and the player will show:

| Artist | Title |
|--------|-------|
| The Beatles | Hey Jude |
| Pink Floyd | Comfortably Numb |
| Led Zeppelin | Stairway to Heaven |
| David Bowie | Space Oddity |
| Queen | Bohemian Rhapsody |

### Optional: Clean Filenames

If your files have website attribution like "Song Title - MassTamilan.com", use:

```bash
node scripts/cleanFileNames.js ./public
```

This removes common website traces from filenames.

## Keyboard Shortcuts

- **Space**: Play/Pause
- **→**: Forward 5 seconds
- **←**: Backward 5 seconds

## Technologies Used

- **React 19**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **ESLint**: Code quality
- **Concurrently**: Run multiple tasks simultaneously

## Notes

- Music files are loaded locally from the `public` folder—no cloud or internet access required
- `songs.json` is automatically generated and regenerated—don't edit it manually
- Large music files may take time to load initially
- Supported formats: MP3, M4A, WAV, OGG

## License

This project is open source and available under the [MIT License](LICENSE).
