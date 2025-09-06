import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Menu,
  MenuItem,
  useMediaQuery,
  Tooltip,
  Slider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import QueueMusicIcon from '@mui/icons-material/QueueMusic';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';

type Track = {
  title: string;
  url: string;
  pubDate?: string;
};

const FALLBACK_TRACKS: Track[] = [
  { title: 'Mako in der Krise', url: '/media/mako_krise.mp3' },
  { title: 'Whitepaper Bilateral', url: '/media/whitepaper_bilateral.m4a' },
];

function parsePodcastRss(xmlText: string): Track[] {
  try {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');
    const items = Array.from(xml.getElementsByTagName('item'));
    const tracks: Track[] = [];
    for (const item of items) {
      const title = item.getElementsByTagName('title')[0]?.textContent?.trim() || '';
      const enclosure = item.getElementsByTagName('enclosure')[0];
      const url = enclosure?.getAttribute('url')
        || item.getElementsByTagName('link')[0]?.textContent?.trim()
        || '';
      const type = enclosure?.getAttribute('type') || '';
      if (url && (type.startsWith('audio/') || type === '' )) {
        tracks.push({ title: title || 'Audio', url, pubDate: item.getElementsByTagName('pubDate')[0]?.textContent || undefined });
      }
    }
    return tracks.filter(t => !!t.url);
  } catch {
    return [];
  }
}

const formatTime = (s: number) => {
  if (!isFinite(s) || s < 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

const RadioWilliPlayer: React.FC = () => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('md'));

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>(FALLBACK_TRACKS);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);

  // Fetch RSS playlist if available
  useEffect(() => {
    let cancelled = false;
    fetch('/podcast.rss', { cache: 'no-cache' })
      .then(async (res) => {
        if (!res.ok) throw new Error('no feed');
        const text = await res.text();
        const tracks = parsePodcastRss(text);
        if (!cancelled && tracks.length) {
          setPlaylist(tracks);
          setIndex(0);
        }
      })
      .catch(() => {
        // keep fallback
      });
    return () => { cancelled = true; };
  }, []);

  // Setup audio element listeners
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setProgress(el.currentTime || 0);
    const onLoaded = () => setDuration(el.duration || 0);
    const onEnded = () => handleNext();
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onLoaded);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onLoaded);
      el.removeEventListener('ended', onEnded);
    };
  }, [index]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const current = useMemo(() => playlist[index] || FALLBACK_TRACKS[0], [playlist, index]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => {/* ignore */});
    }
  };

  const handlePrev = () => {
    setIndex((i) => (i - 1 + playlist.length) % playlist.length);
    setPlaying(false);
    setTimeout(() => audioRef.current?.play().then(() => setPlaying(true)).catch(() => {}), 0);
  };

  const handleNext = () => {
    setIndex((i) => (i + 1) % playlist.length);
    setPlaying(false);
    setTimeout(() => audioRef.current?.play().then(() => setPlaying(true)).catch(() => {}), 0);
  };

  const handleSelect = (idx: number) => {
    setIndex(idx);
    setPlaying(false);
    setAnchorEl(null);
    setTimeout(() => audioRef.current?.play().then(() => setPlaying(true)).catch(() => {}), 0);
  };

  const handleSeek = (_: Event, value: number | number[]) => {
    const v = Array.isArray(value) ? value[0] : value;
    if (audioRef.current) {
      audioRef.current.currentTime = v;
      setProgress(v);
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      minWidth: 0,
      flex: 1,
    }}>
      <audio ref={audioRef} src={current.url} preload="metadata" />

      {playlist.length > 1 && (
        <Tooltip title="Vorheriger Track">
          <span>
            <IconButton size="small" onClick={handlePrev} disabled={playlist.length < 2}>
              <SkipPreviousIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}

      <Tooltip title={playing ? 'Pause' : 'Abspielen'}>
        <IconButton size="small" color="primary" onClick={togglePlay}>
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Tooltip>

      {playlist.length > 1 && (
        <Tooltip title="Nächster Track">
          <span>
            <IconButton size="small" onClick={handleNext} disabled={playlist.length < 2}>
              <SkipNextIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}

      {/* Title and time */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
        <Tooltip title={current.title}>
          <Typography variant="body2" noWrap sx={{ maxWidth: isSmall ? 140 : 260 }}>
            Radio Willi: {current.title}
          </Typography>
        </Tooltip>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {formatTime(progress)} / {formatTime(duration)}
        </Typography>
      </Box>

      {/* Seek bar (hide on very small screens) */}
      {!isSmall && (
        <Slider
          size="small"
          value={Math.min(progress, duration || 0)}
          min={0}
          max={duration || 0}
          onChange={handleSeek}
          sx={{ width: 140 }}
        />
      )}

      {/* Volume (hide on small) */}
      {!isSmall && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VolumeUpIcon fontSize="small" />
          <Slider
            size="small"
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={(_, v) => setVolume(Array.isArray(v) ? v[0] : v)}
            sx={{ width: 80 }}
          />
        </Box>
      )}

      {/* Track selector */}
      <Tooltip title="Playlist">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <QueueMusicIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        {playlist.map((t, i) => (
          <MenuItem key={`${t.url}-${i}`} selected={i === index} onClick={() => handleSelect(i)}>
            <Typography variant="body2" noWrap>
              {t.title}
            </Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default RadioWilliPlayer;
