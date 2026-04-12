# Paatify

A Spotify-inspired MP3 player web application built with React, TypeScript, and Vite.

## Features

- Play/Pause controls
- Progress bar with seek functionality
- Volume control
- Dynamic playlist generation from public folder
- Responsive design for mobile and web
- Dark theme inspired by Spotify

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

### Running the Application

Start the development server:
```bash
npm run dev
```

The app will automatically regenerate the playlist when you add or remove music files in the `public` folder.

Open your browser and navigate to `http://localhost:5173` to view Paatify.

### Building for Production

Build the application:
```bash
npm run build
```

Preview the production build:
```bash
npm run preview
```

## Adding Your Own Music

1. Place your MP3 or M4A files directly in the `public` folder.
2. (Optional) Clean file names by running `node scripts/cleanFileNames.js <path-to-music-folder>` to remove website traces.
3. The playlist will update automatically when running `npm run dev`.

The project automatically generates `public/songs.json` from the files in `public` before starting the dev server or building the app, and cleans any remaining website traces from the names.

If you want to see the generated playlist manually, open `public/songs.json` after running the app.

## Technologies Used

- React 19
- TypeScript
- Vite
- ESLint

## License

This project is open source and available under the [MIT License](LICENSE).
