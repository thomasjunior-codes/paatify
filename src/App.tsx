import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

interface Song {
  title: string
  artist: string
  src: string
}

function App() {
  const [songs, setSongs] = useState<Song[]>([])
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [search, setSearch] = useState('')
  const [shuffle, setShuffle] = useState(false)
  const [queueNextIndex, setQueueNextIndex] = useState<number | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)

  const filteredSongs = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return songs
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query)
    )
  }, [search, songs])

  const currentSong = songs[currentSongIndex]

  useEffect(() => {
    fetch('/songs.json')
      .then((res) => res.json())
      .then((data: Song[]) => {
        if (Array.isArray(data) && data.length) {
          setSongs(data)
          setCurrentSongIndex(0)
        }
      })
      .catch(() => setSongs([]))
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || songs.length === 0) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => nextSong(true)

    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [songs])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (!audioContextRef.current) {
      try {
        const context = new AudioContext()
        audioContextRef.current = context

        const source = context.createMediaElementSource(audio)
        const analyser = context.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.8

        source.connect(analyser)
        analyser.connect(context.destination)

        analyserRef.current = analyser

        // Mute the audio element to route through Web Audio
        audio.muted = true
      } catch (error) {
        console.warn('AudioContext unavailable:', error)
      }
    }
  }, [])

  useEffect(() => {
    const analyser = analyserRef.current
    const canvas = canvasRef.current
    if (!analyser || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const barWidth = (canvas.width / bufferLength) * 2.5
    let x = 0

    if (!isPlaying) {
      ctx.fillStyle = 'rgb(18,18,18)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      return
    }

    const updateVisualizer = () => {
      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = 'rgb(18,18,18)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = 'rgb(29,185,84)'
      x = 0
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }

      animationFrameRef.current = requestAnimationFrame(updateVisualizer)
    }

    updateVisualizer()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [currentSongIndex, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || songs.length === 0) return

    audio.currentTime = 0
    setCurrentTime(0)
    setDuration(0)

    if (isPlaying) {
      const resumeContext = async () => {
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume().catch(() => {})
        }
        audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
      }
      resumeContext()
    }
  }, [currentSongIndex, songs, isPlaying])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const resumeAudioContext = async () => {
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume().catch(() => {})
    }
  }

  const playAudio = async () => {
    const audio = audioRef.current
    if (!audio) return

    await resumeAudioContext()
    audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      playAudio()
    }
  }

  const getNextIndex = (current: number) => {
    if (queueNextIndex !== null) return queueNextIndex
    if (shuffle && songs.length > 1) {
      const remaining = songs.map((_, index) => index).filter((index) => index !== current)
      return remaining[Math.floor(Math.random() * remaining.length)]
    }
    return (current + 1) % songs.length
  }

  const nextSong = (autoPlay = false) => {
    const nextIndex = getNextIndex(currentSongIndex)
    if (queueNextIndex !== null) {
      setQueueNextIndex(null)
    }
    setCurrentSongIndex(nextIndex)
    setIsPlaying(isPlaying || autoPlay)
  }

  const prevSong = () => {
    setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length)
    setIsPlaying(false)
  }

  const selectSong = (index: number) => {
    setCurrentSongIndex(index)
    setIsPlaying(true)
    setQueueNextIndex(null)
  }

  const queueNext = (song: Song) => {
    const index = songs.findIndex(s => s.src === song.src)
    if (index !== -1) {
      setQueueNextIndex(index)
    }
  }

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = (parseFloat(e.target.value) / 100) * duration
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  if (songs.length === 0) {
    return (
      <div className="app">
        <div className="sidebar">
          <h2>Paatify</h2>
          <p>No songs found. Add MP3 or M4A files to the public folder and restart the app.</p>
        </div>
        <div className="main">
          <div className="player">
            <h1>Paatify</h1>
            <p>No songs found. Add MP3 or M4A files to the public folder and restart the app.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Paatify</h2>
          <div className="search-box">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search songs..."
            />
          </div>
          <h3>Your Library</h3>
        </div>
        {search ? (
          <div className="search-results">
            <ul>
              {filteredSongs.map((song, index) => (
                <li key={`${song.src}-search`}>
                  <div>
                    <strong>{song.title}</strong>
                    <span>{song.artist || 'Unknown artist'}</span>
                  </div>
                  <button onClick={() => queueNext(song)}>Play Next</button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="playlist">
          <ul>
            {songs.map((song, index) => (
              <li
                key={song.src}
                className={index === currentSongIndex ? 'active' : ''}
                onClick={() => selectSong(index)}
              >
                <div className="song-info">
                  <strong>{song.title}</strong>
                  <span>{song.artist || 'Unknown artist'}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="main">
        <div className="player">
          <div className="player-header">
            <div className="track-labels">
              <h2>{currentSong.title}</h2>
              <p>{currentSong.artist || 'Unknown artist'}</p>
            </div>
            <div className="action-buttons">
              <button className={shuffle ? 'active' : ''} onClick={() => setShuffle((prev) => !prev)}>
                🔀
              </button>
            </div>
          </div>
          <div className="album-art">
            <canvas ref={canvasRef} width="240" height="240" />
          </div>
          <div className="queue-status">
            {queueNextIndex !== null && (
              <span>Queued next: {songs[queueNextIndex]?.title}</span>
            )}
          </div>
          <div className="controls">
            <button onClick={prevSong}>⏮</button>
            <button className="play-btn" onClick={togglePlay}>
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button onClick={() => nextSong(false)}>⏭</button>
          </div>
          <div className="progress">
            <span>{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleProgressChange}
            />
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <audio ref={audioRef} src={currentSong.src} />
      </div>
    </div>
  )
}

export default App
