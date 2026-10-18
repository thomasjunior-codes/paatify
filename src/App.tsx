import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, ReactNode } from 'react'
import './App.css'
import {
  ChevronDownIcon,
  CloseIcon,
  LibraryIcon,
  LogoIcon,
  NextIcon,
  NoteIcon,
  PauseIcon,
  PlayIcon,
  PrevIcon,
  QueueIcon,
  RepeatIcon,
  SearchIcon,
  ShuffleIcon,
  VolumeIcon,
} from './icons'

interface Song {
  title: string
  artist: string
  src: string
  // Album art extracted by scripts/extractCovers.js, and the hue of its main colour
  cover?: string
  coverHue?: number
}

interface Artist {
  name: string
  count: number
}

const ALL_SONGS_HUE = 141
const SEARCH_HUE = 220

// Filenames often join words with dashes or underscores ("Aadiyile-Sedhi")
const cleanTitle = (title: string) => title.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()

const splitArtists = (artist: string) =>
  artist.split(',').map((name) => name.trim()).filter(Boolean)

const artistLabel = (song: Song) => song.artist || 'Unknown artist'

const songCount = (count: number) => `${count} ${count === 1 ? 'song' : 'songs'}`

// Stable colour per name, used for the generated cover art
const hueFor = (text: string) => {
  let hash = 0
  for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

const initialsFor = (name: string) =>
  name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase()

const hueStyle = (hue: number) => ({ '--hue': hue }) as CSSProperties

const songHue = (song: Song) => song.coverHue ?? hueFor(song.title)

// Tint the player with the cover's colour; greyscale art gets a neutral tint
const songTintStyle = (song: Song) =>
  ({ '--hue': songHue(song), '--tint': song.cover && song.coverHue === undefined ? 0 : 1 }) as CSSProperties

// First few distinct covers in a list, for playlist-style mosaics
const coversOf = (songs: Song[], indices: number[], limit = 4) => {
  const covers: string[] = []
  for (const index of indices) {
    const cover = songs[index].cover
    if (cover && !covers.includes(cover)) covers.push(cover)
    if (covers.length === limit) break
  }
  return covers
}

// Indices of the songs that belong to an artist (null = the whole library)
const indicesFor = (songs: Song[], artist: string | null) =>
  songs.reduce<number[]>((list, song, index) => {
    if (artist === null || splitArtists(song.artist).includes(artist)) list.push(index)
    return list
  }, [])

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time < 0) return '0:00'
  const minutes = Math.floor(time / 60)
  const seconds = Math.floor(time % 60)
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const isMobileLayout = () => window.matchMedia('(max-width: 768px)').matches

// Lock-screen artwork for songs without album art
const FALLBACK_ARTWORK = `${import.meta.env.BASE_URL}artwork.png`

// Lets the lock screen show a progress bar that it can scrub
const syncPositionState = (audio: HTMLAudioElement) => {
  if (!('mediaSession' in navigator) || !Number.isFinite(audio.duration) || audio.duration <= 0) return
  try {
    navigator.mediaSession.setPositionState({
      duration: audio.duration,
      playbackRate: audio.playbackRate,
      position: Math.min(audio.currentTime, audio.duration),
    })
  } catch {
    // Older browsers don't support position state
  }
}

// Album art when we have it, otherwise a generated gradient tile.
// Four images make a 2x2 mosaic, like Spotify's playlist covers.
function Cover({
  hue,
  images = [],
  round = false,
  className = '',
  children,
  overlay,
}: {
  hue: number
  images?: (string | undefined)[]
  round?: boolean
  className?: string
  children?: ReactNode
  overlay?: ReactNode
}) {
  const [failed, setFailed] = useState<string[]>([])
  const usable = images.filter((src): src is string => !!src && !failed.includes(src))
  const shown = usable.length >= 4 ? usable.slice(0, 4) : usable.slice(0, 1)

  return (
    <div
      className={`cover${round ? ' round' : ''}${shown.length === 4 ? ' mosaic' : ''} ${className}`}
      style={hueStyle(hue)}
    >
      {children ?? <NoteIcon />}
      {shown.map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed((prev) => [...prev, src])}
        />
      ))}
      {overlay}
    </div>
  )
}

function Equalizer({ large = false }: { large?: boolean }) {
  return (
    <span className={`eq${large ? ' eq-lg' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

function App() {
  const [songs, setSongs] = useState<Song[]>([])
  const [loaded, setLoaded] = useState(false)
  const [currentSongIndex, setCurrentSongIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [search, setSearch] = useState('')
  const [shuffle, setShuffle] = useState(false)
  const [repeatOne, setRepeatOne] = useState(false)
  const [queueNextIndex, setQueueNextIndex] = useState<number | null>(null)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  // Artist shown in the main view, and the artist whose songs are playing (null = all songs)
  const [viewArtist, setViewArtist] = useState<string | null>(null)
  const [playingArtist, setPlayingArtist] = useState<string | null>(null)
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const toastTimerRef = useRef<number | undefined>(undefined)

  const artists = useMemo<Artist[]>(() => {
    const counts = new Map<string, number>()
    for (const song of songs) {
      for (const name of splitArtists(song.artist)) {
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
    }
    return [...counts]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [songs])

  const libraryCovers = useMemo(() => coversOf(songs, songs.map((_, index) => index)), [songs])
  const viewIndices = useMemo(() => indicesFor(songs, viewArtist), [songs, viewArtist])
  const playingIndices = useMemo(() => indicesFor(songs, playingArtist), [songs, playingArtist])

  const query = search.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!query) return []
    return songs.reduce<number[]>((list, song, index) => {
      if (song.title.toLowerCase().includes(query) || song.artist.toLowerCase().includes(query)) {
        list.push(index)
      }
      return list
    }, [])
  }, [query, songs])

  const isSearching = query.length > 0
  const listedIndices = isSearching ? searchResults : viewIndices
  const listContext = isSearching ? null : viewArtist

  const currentSong = songs[currentSongIndex]

  useEffect(() => {
    const baseUrl = import.meta.env.BASE_URL
    fetch(`${baseUrl}songs.json`)
      .then((res) => res.json())
      .then((data: Song[]) => {
        if (Array.isArray(data) && data.length) {
          // Prepend baseUrl to each song's src path
          const songsWithBasePath = data.map((song) => ({
            ...song,
            title: cleanTitle(song.title),
            src: `${baseUrl}${song.src}`,
            cover: song.cover && `${baseUrl}${song.cover}`,
          }))
          setSongs(songsWithBasePath)
          setCurrentSongIndex(0)
        }
      })
      .catch(() => setSongs([]))
      .finally(() => setLoaded(true))
  }, [])

  // Start playback whenever we should be playing (new song, or resumed)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || songs.length === 0 || !isPlaying) return

    audio.play().catch((error: DOMException) => {
      // Switching songs quickly aborts the previous play() call; that is not a stop
      if (error.name !== 'AbortError') setIsPlaying(false)
    })
  }, [currentSongIndex, songs, isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  useEffect(() => {
    document.title = isPlaying && currentSong ? `${currentSong.title} • ${artistLabel(currentSong)}` : 'Paatify'
  }, [currentSong, isPlaying])

  // What the lock screen and media notification show
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: artistLabel(currentSong),
      album: 'Paatify',
      artwork: currentSong.cover
        ? [{ src: currentSong.cover, sizes: '400x400', type: 'image/jpeg' }]
        : [{ src: FALLBACK_ARTWORK, sizes: '512x512', type: 'image/png' }],
    })
  }, [currentSong])

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
  }, [isPlaying])

  useEffect(() => {
    if (!nowPlayingOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNowPlayingOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nowPlayingOpen])

  useEffect(() => () => window.clearTimeout(toastTimerRef.current), [])

  const showToast = (message: string) => {
    setToast(message)
    window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500)
  }

  const playAudio = () => {
    const audio = audioRef.current
    if (!audio) return
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

  const restartSong = (play: boolean) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = 0
    setCurrentTime(0)
    if (play) playAudio()
  }

  const getNextIndex = (current: number) => {
    if (queueNextIndex !== null) return queueNextIndex
    if (shuffle && playingIndices.length > 1) {
      const remaining = playingIndices.filter((index) => index !== current)
      return remaining[Math.floor(Math.random() * remaining.length)]
    }
    const position = playingIndices.indexOf(current)
    return playingIndices[(position + 1) % playingIndices.length]
  }

  const nextSong = (autoPlay = false) => {
    const nextIndex = getNextIndex(currentSongIndex)
    if (queueNextIndex !== null) {
      setQueueNextIndex(null)
    }
    const shouldPlay = isPlaying || autoPlay
    if (nextIndex === currentSongIndex) {
      restartSong(shouldPlay)
    } else {
      setCurrentSongIndex(nextIndex)
      setIsPlaying(shouldPlay)
    }
  }

  const prevSong = () => {
    const audio = audioRef.current
    // Like Spotify: a few seconds into a song, "previous" restarts it
    if (audio && audio.currentTime > 3) {
      restartSong(isPlaying)
      return
    }
    const position = playingIndices.indexOf(currentSongIndex)
    const prevIndex =
      position === -1
        ? playingIndices[0]
        : playingIndices[(position - 1 + playingIndices.length) % playingIndices.length]
    if (prevIndex === currentSongIndex) {
      restartSong(isPlaying)
    } else {
      setCurrentSongIndex(prevIndex)
    }
  }

  const handleEnded = () => {
    if (repeatOne) {
      restartSong(true)
    } else {
      nextSong(true)
    }
  }

  // Lock screen, notification and headphone buttons
  const handleMediaAction = useEffectEvent((details: MediaSessionActionDetails) => {
    const audio = audioRef.current
    if (!audio || songs.length === 0) return

    switch (details.action) {
      case 'play':
        playAudio()
        break
      case 'pause':
        audio.pause()
        setIsPlaying(false)
        break
      case 'previoustrack':
        prevSong()
        break
      case 'nexttrack':
        nextSong(false)
        break
      case 'seekto':
        if (details.seekTime !== undefined) {
          audio.currentTime = details.seekTime
          setCurrentTime(details.seekTime)
        }
        break
    }
  })

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    // No seekbackward/seekforward: iOS would show those instead of previous/next
    const actions: MediaSessionAction[] = ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto']
    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, (details) => handleMediaAction(details))
      } catch {
        // This browser doesn't support the action
      }
    }
    return () => {
      for (const action of actions) {
        try {
          navigator.mediaSession.setActionHandler(action, null)
        } catch {
          // This browser doesn't support the action
        }
      }
    }
  }, [])

  // Play a song from a list; `context` is the artist list it was picked from
  const playSong = (index: number, context: string | null) => {
    const sameContext = context === playingArtist
    setPlayingArtist(context)
    if (index === currentSongIndex) {
      // Paused: resume. Playing from the same list: pause. Otherwise keep playing.
      if (!isPlaying || sameContext) togglePlay()
      return
    }
    setQueueNextIndex(null)
    setCurrentSongIndex(index)
    setIsPlaying(true)
  }

  const viewHasCurrent = playingArtist === viewArtist && viewIndices.includes(currentSongIndex)
  const viewIsPlaying = isPlaying && viewHasCurrent

  const playView = () => {
    if (viewHasCurrent) {
      togglePlay()
      return
    }
    const start = shuffle
      ? viewIndices[Math.floor(Math.random() * viewIndices.length)]
      : viewIndices[0]
    playSong(start, viewArtist)
  }

  const openView = (artist: string | null) => {
    setViewArtist(artist)
    setSearch('')
    mainRef.current?.scrollTo({ top: 0 })
  }

  const queueNext = (index: number) => {
    if (queueNextIndex === index) {
      setQueueNextIndex(null)
      showToast('Removed from queue')
      return
    }
    setQueueNextIndex(index)
    showToast(`Playing next: ${songs[index].title}`)
  }

  const showCurrentSong = () => {
    if (isMobileLayout()) {
      setNowPlayingOpen(true)
      return
    }
    mainRef.current
      ?.querySelector('.track-row.current')
      ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return

    const newTime = Number(e.target.value)
    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleVolume = (e: ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value)
    setVolume(newVolume)
    setMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (muted || volume === 0) {
      setMuted(false)
      if (volume === 0) setVolume(0.5)
    } else {
      setMuted(true)
    }
  }

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0
  const shownVolume = muted ? 0 : volume
  const volumeLevel = shownVolume === 0 ? 'mute' : shownVolume < 0.5 ? 'low' : 'high'

  const upNextIndex =
    queueNextIndex ??
    (shuffle
      ? null
      : playingIndices[(playingIndices.indexOf(currentSongIndex) + 1) % playingIndices.length])
  const upNext = upNextIndex === null ? undefined : songs[upNextIndex]

  const renderControls = (large: boolean) => (
    <div className={`controls${large ? ' controls-lg' : ''}`}>
      <button
        type="button"
        className={`icon-btn toggle${shuffle ? ' active' : ''}`}
        onClick={() => setShuffle((prev) => !prev)}
        aria-label="Shuffle"
        aria-pressed={shuffle}
        title={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
      >
        <ShuffleIcon />
      </button>
      <button type="button" className="icon-btn skip" onClick={prevSong} aria-label="Previous" title="Previous">
        <PrevIcon />
      </button>
      <button
        type="button"
        className="play-btn"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button type="button" className="icon-btn skip" onClick={() => nextSong(false)} aria-label="Next" title="Next">
        <NextIcon />
      </button>
      <button
        type="button"
        className={`icon-btn toggle${repeatOne ? ' active' : ''}`}
        onClick={() => setRepeatOne((prev) => !prev)}
        aria-label="Repeat song"
        aria-pressed={repeatOne}
        title={repeatOne ? 'Disable repeat' : 'Repeat this song'}
      >
        <RepeatIcon one={repeatOne} />
      </button>
    </div>
  )

  const renderProgress = () => (
    <div className="progress">
      <span className="time">{formatTime(currentTime)}</span>
      <input
        type="range"
        className="slider"
        min={0}
        max={duration || 0}
        step="any"
        value={Math.min(currentTime, duration || 0)}
        onChange={handleSeek}
        style={{ '--pct': `${progress}%` } as CSSProperties}
        aria-label="Seek"
        disabled={!duration}
      />
      <span className="time">{formatTime(duration)}</span>
    </div>
  )

  const currentHue = currentSong ? songHue(currentSong) : ALL_SONGS_HUE
  const viewHue = isSearching ? SEARCH_HUE : viewArtist ? hueFor(viewArtist) : ALL_SONGS_HUE
  const viewTitle = viewArtist ?? 'All Songs'

  return (
    <>
      {currentSong ? (
        <div className="app">
          <header className="topbar">
            <div className="brand">
              <LogoIcon size={32} />
              <span>Paatify</span>
            </div>
            <label className="search">
              <SearchIcon />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="What do you want to play?"
                aria-label="Search songs and artists"
              />
              {search && (
                <button type="button" className="icon-btn search-clear" onClick={() => setSearch('')} aria-label="Clear search">
                  <CloseIcon />
                </button>
              )}
            </label>
          </header>

          <aside className="sidebar" aria-label="Your Library">
            <h2 className="library-header">
              <LibraryIcon />
              Your Library
            </h2>
            <ul className="library-list">
              <li>
                <button
                  type="button"
                  className={`library-item${viewArtist === null && !isSearching ? ' active' : ''}${playingArtist === null ? ' playing' : ''}`}
                  onClick={() => openView(null)}
                >
                  <Cover hue={ALL_SONGS_HUE} images={libraryCovers} />
                  <span className="library-text">
                    <strong>All Songs</strong>
                    <span>Playlist · {songCount(songs.length)}</span>
                  </span>
                  {isPlaying && playingArtist === null && <VolumeIcon level="high" className="playing-icon" />}
                </button>
              </li>
              {artists.map((artist) => (
                <li key={artist.name}>
                  <button
                    type="button"
                    className={`library-item${viewArtist === artist.name && !isSearching ? ' active' : ''}${playingArtist === artist.name ? ' playing' : ''}`}
                    onClick={() => openView(artist.name)}
                  >
                    <Cover hue={hueFor(artist.name)} round>
                      <span className="cover-initials">{initialsFor(artist.name)}</span>
                    </Cover>
                    <span className="library-text">
                      <strong>{artist.name}</strong>
                      <span>Artist · {songCount(artist.count)}</span>
                    </span>
                    {isPlaying && playingArtist === artist.name && (
                      <VolumeIcon level="high" className="playing-icon" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <main className="main" ref={mainRef}>
            <div className="view" style={hueStyle(viewHue)}>
              {!isSearching && (
                <nav className="chips" aria-label="Browse by artist">
                  <button
                    type="button"
                    className={`chip${viewArtist === null ? ' active' : ''}`}
                    onClick={() => openView(null)}
                  >
                    All Songs
                  </button>
                  {artists.map((artist) => (
                    <button
                      type="button"
                      key={artist.name}
                      className={`chip${viewArtist === artist.name ? ' active' : ''}`}
                      onClick={() => openView(artist.name)}
                    >
                      {artist.name}
                    </button>
                  ))}
                </nav>
              )}

              {isSearching ? (
                <header className="search-header">
                  <h1>Songs</h1>
                  <p>
                    {songCount(searchResults.length)} matching “{search.trim()}”
                  </p>
                </header>
              ) : (
                <header className="hero">
                  {viewArtist ? (
                    <Cover hue={viewHue} round className="cover-hero">
                      <span className="cover-initials">{initialsFor(viewArtist)}</span>
                    </Cover>
                  ) : (
                    <Cover hue={ALL_SONGS_HUE} images={libraryCovers} className="cover-hero" />
                  )}
                  <div className="hero-text">
                    <span className="hero-type">{viewArtist ? 'Artist' : 'Playlist'}</span>
                    <h1 className={viewTitle.length > 12 ? 'long' : ''}>{viewTitle}</h1>
                    <p>
                      <strong>Paatify</strong> · {songCount(viewIndices.length)}
                    </p>
                  </div>
                </header>
              )}

              <div className="view-body">
                {!isSearching && (
                  <div className="action-bar">
                    <button
                      type="button"
                      className="big-play"
                      onClick={playView}
                      aria-label={viewIsPlaying ? `Pause ${viewTitle}` : `Play ${viewTitle}`}
                    >
                      {viewIsPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button
                      type="button"
                      className={`icon-btn toggle action-shuffle${shuffle ? ' active' : ''}`}
                      onClick={() => setShuffle((prev) => !prev)}
                      aria-label="Shuffle"
                      aria-pressed={shuffle}
                      title={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
                    >
                      <ShuffleIcon />
                    </button>
                  </div>
                )}

                <div className="tracklist">
                  <div className="tracklist-head" aria-hidden="true">
                    <span>#</span>
                    <span>Title</span>
                    <span />
                  </div>
                  <ul>
                    {listedIndices.map((index, position) => {
                      const song = songs[index]
                      const isCurrent = index === currentSongIndex
                      const isQueued = index === queueNextIndex
                      const pausesOnClick = isCurrent && isPlaying && listContext === playingArtist
                      return (
                        <li key={song.src} className={`track-row${isCurrent ? ' current' : ''}`}>
                          <button
                            type="button"
                            className="track-play"
                            onClick={() => playSong(index, listContext)}
                            aria-label={`${pausesOnClick ? 'Pause' : 'Play'} ${song.title} by ${artistLabel(song)}`}
                          >
                            <span className="track-num">
                              {isCurrent && isPlaying ? <Equalizer /> : <span className="num">{position + 1}</span>}
                              <span className="row-icon">{pausesOnClick ? <PauseIcon /> : <PlayIcon />}</span>
                            </span>
                            <Cover hue={songHue(song)} images={[song.cover]} className="cover-row" />
                            <span className="track-text">
                              <span className="track-title">{song.title}</span>
                              <span className="track-artist">{artistLabel(song)}</span>
                            </span>
                          </button>
                          <button
                            type="button"
                            className={`icon-btn queue-btn${isQueued ? ' active' : ''}`}
                            onClick={() => queueNext(index)}
                            aria-label={isQueued ? `Remove ${song.title} from queue` : `Play ${song.title} next`}
                            aria-pressed={isQueued}
                            title={isQueued ? 'Remove from queue' : 'Play next'}
                          >
                            <QueueIcon />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {listedIndices.length === 0 && (
                    <p className="empty">No songs match “{search.trim()}”. Try another title or artist.</p>
                  )}
                </div>
              </div>
            </div>
          </main>

          <aside
            className={`now-playing${nowPlayingOpen ? ' open' : ''}`}
            style={songTintStyle(currentSong)}
            aria-label="Now playing"
          >
            <div className="np-header">
              <button
                type="button"
                className="icon-btn np-close"
                onClick={() => setNowPlayingOpen(false)}
                aria-label="Close now playing"
              >
                <ChevronDownIcon />
              </button>
              <div className="np-context">
                <span>Playing from</span>
                <strong>{playingArtist ?? 'All Songs'}</strong>
              </div>
              <span className="np-spacer" />
            </div>
            <div className="np-body">
              <Cover
                hue={currentHue}
                images={[currentSong.cover]}
                className="cover-xl"
                overlay={isPlaying && <Equalizer large />}
              />
              <div className="np-meta">
                <h2>{currentSong.title}</h2>
                <p>{artistLabel(currentSong)}</p>
              </div>
              <div className="np-player">
                {renderProgress()}
                {renderControls(true)}
              </div>
              <section className="np-queue">
                <h3>Next in queue</h3>
                {upNext && upNextIndex !== null ? (
                  <button
                    type="button"
                    className="library-item"
                    onClick={() => playSong(upNextIndex, playingArtist)}
                  >
                    <Cover hue={songHue(upNext)} images={[upNext.cover]} />
                    <span className="library-text">
                      <strong>{upNext.title}</strong>
                      <span>{artistLabel(upNext)}</span>
                    </span>
                    {queueNextIndex !== null && <span className="badge">Queued</span>}
                  </button>
                ) : (
                  <p className="np-note">Shuffle is on, so the next song is a surprise.</p>
                )}
              </section>
            </div>
          </aside>

          <footer className="player-bar" style={songTintStyle(currentSong)}>
            <button
              type="button"
              className="pb-track"
              onClick={showCurrentSong}
              aria-label={`Now playing: ${currentSong.title}. Show song`}
            >
              <Cover hue={currentHue} images={[currentSong.cover]} className="cover-pb" />
              <span className="pb-text">
                <strong>{currentSong.title}</strong>
                <span>{artistLabel(currentSong)}</span>
              </span>
            </button>
            <div className="pb-center">
              {renderControls(false)}
              {renderProgress()}
            </div>
            <div className="pb-right">
              <button
                type="button"
                className="icon-btn"
                onClick={toggleMute}
                aria-label={volumeLevel === 'mute' ? 'Unmute' : 'Mute'}
                title={volumeLevel === 'mute' ? 'Unmute' : 'Mute'}
              >
                <VolumeIcon level={volumeLevel} />
              </button>
              <input
                type="range"
                className="slider volume-slider"
                min={0}
                max={1}
                step={0.01}
                value={shownVolume}
                onChange={handleVolume}
                style={{ '--pct': `${shownVolume * 100}%` } as CSSProperties}
                aria-label="Volume"
              />
            </div>
            <button
              type="button"
              className="icon-btn pb-mobile-play"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <span className="pb-line" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </span>
          </footer>

          {toast && (
            <div className="toast" role="status">
              {toast}
            </div>
          )}
        </div>
      ) : (
        <div className="app-empty">
          <LogoIcon size={56} />
          <h1>Paatify</h1>
          <p>
            {loaded
              ? 'No songs found. Add MP3 or M4A files to the public folder and restart the app.'
              : 'Loading your library…'}
          </p>
        </div>
      )}
      <audio
        ref={audioRef}
        src={currentSong?.src}
        preload="metadata"
        onLoadStart={() => {
          setCurrentTime(0)
          setDuration(0)
        }}
        onDurationChange={(e) => {
          const { duration } = e.currentTarget
          setDuration(Number.isFinite(duration) ? duration : 0)
          syncPositionState(e.currentTarget)
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onSeeked={(e) => syncPositionState(e.currentTarget)}
        onPlay={(e) => {
          setIsPlaying(true)
          syncPositionState(e.currentTarget)
        }}
        onPause={(e) => {
          syncPositionState(e.currentTarget)
          // The end of a song also fires "pause"; let onEnded decide what plays next
          if (!e.currentTarget.ended) setIsPlaying(false)
        }}
        onEnded={handleEnded}
      />
    </>
  )
}

export default App
