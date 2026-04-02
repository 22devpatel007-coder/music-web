// PERMANENT FIX: SearchBar is fully rewritten to fix the mobile keyboard dismissal bug.
//
// Root cause: navigate() was called inside onChange on every keystroke,
// triggering a history state change that causes Android/iOS virtual keyboards to close.
//
// Fix: input value is purely local React state. URL update happens via a 300ms debounced
// useEffect only. Suggestion dropdown reads from SongsContext (zero network calls).
// The keyboard never closes because nothing navigates while the user is typing.

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSongs } from '../context/SongsContext';
import { usePlayer } from '../context/PlayerContext';

const DEBOUNCE_MS   = 300;
const MAX_RESULTS   = 6;
const BLUR_DELAY_MS = 150; // allow click on suggestion to register before blur closes dropdown

// ── Score a song against a query ──────────────────────────────────────────────
function scoreSong(song, q) {
  const query  = q.toLowerCase();
  const title  = (song.title  || '').toLowerCase();
  const artist = (song.artist || '').toLowerCase();
  let score = 0;

  if (title  === query)               score += 5;
  else if (title.startsWith(query))   score += 4;
  else if (title.includes(query))     score += 3;

  if (artist === query)               score += 3;
  else if (artist.startsWith(query))  score += 2;
  else if (artist.includes(query))    score += 1;

  return score;
}

// ── Highlight matching text ───────────────────────────────────────────────────
function HighlightedText({ text, query, style }) {
  if (!query || !text) return <span style={style}>{text}</span>;

  const lower = text.toLowerCase();
  const idx   = lower.indexOf(query.toLowerCase());
  if (idx === -1) return <span style={style}>{text}</span>;

  const before = text.slice(0, idx);
  const match  = text.slice(idx, idx + query.length);
  const after  = text.slice(idx + query.length);

  return (
    <span style={style}>
      {before}
      <span style={{ color: '#22c55e', fontWeight: 700 }}>{match}</span>
      {after}
    </span>
  );
}

const SearchBar = () => {
  const { songs }    = useSongs();
  const { playSong } = usePlayer();
  const navigate     = useNavigate();
  const [searchParams] = useSearchParams();

  // Local input state — decoupled from URL
  const [query,        setQuery]        = useState(searchParams.get('q') || '');
  const [focused,      setFocused]      = useState(false);
  const [suggestions,  setSuggestions]  = useState([]);
  const [activeIdx,    setActiveIdx]    = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  const inputRef     = useRef(null);
  const debounceRef  = useRef(null);
  const blurTimerRef = useRef(null);
  const containerRef = useRef(null);

  // ── Compute suggestions whenever query or songs changes ───────────────────
  useEffect(() => {
    const q = query.trim();
    if (!q || !songs.length) {
      setSuggestions([]);
      return;
    }

    const scored = songs
      .map(s => ({ song: s, score: scoreSong(s, q) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map(({ song }) => song);

    setSuggestions(scored);
    setActiveIdx(-1);
  }, [query, songs]);

  // ── Show/hide dropdown ────────────────────────────────────────────────────
  useEffect(() => {
    setShowDropdown(focused && query.trim().length >= 1);
  }, [focused, query]);

  // ── Debounced URL update — never fires inside onChange ────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      navigate('/search', { replace: true });
      return;
    }
    debounceRef.current = setTimeout(() => {
      if (query.trim().length >= 2) {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`, { replace: true });
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query]); // intentionally omit navigate to avoid re-running

  // ── Click outside to close ────────────────────────────────────────────────
  useEffect(() => {
    const handleOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    setQuery(e.target.value);
    // No navigate() here — that's the entire fix
  };

  const handleFocus = () => {
    clearTimeout(blurTimerRef.current);
    setFocused(true);
  };

  const handleBlur = () => {
    // Delay so suggestion clicks fire before dropdown hides
    blurTimerRef.current = setTimeout(() => {
      setFocused(false);
    }, BLUR_DELAY_MS);
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    navigate('/search', { replace: true });
    inputRef.current?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (activeIdx >= 0 && suggestions[activeIdx]) {
      playSuggestion(suggestions[activeIdx]);
    } else if (query.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      setShowDropdown(false);
    }
  };

  const playSuggestion = useCallback((song) => {
    playSong(song, suggestions);
    setShowDropdown(false);
    // Keep query as-is — do NOT clear it
    inputRef.current?.blur();
  }, [playSong, suggestions]);

  const handleKeyDown = (e) => {
    if (!showDropdown || !suggestions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(prev => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIdx(-1);
      inputRef.current?.focus();
    }
  };

  const q = query.trim();

  return (
    <div ref={containerRef} style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form} role="search">
        <div style={{
          ...styles.wrap,
          borderColor: focused ? '#22c55e' : '#2d2d2d',
          boxShadow:   focused ? '0 0 0 3px rgba(34,197,94,0.1)' : 'none',
          borderBottomLeftRadius:  showDropdown && (suggestions.length > 0 || q.length >= 2) ? 0 : 10,
          borderBottomRightRadius: showDropdown && (suggestions.length > 0 || q.length >= 2) ? 0 : 10,
        }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none"
            style={{ flexShrink: 0, color: focused ? '#22c55e' : '#6b7280', transition: 'color 0.2s' }}>
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>

          <input
            ref={inputRef}
            type="search"
            placeholder="Search songs or artists…"
            value={query}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={styles.input}
            aria-label="Search songs or artists"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />

          {query.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              style={styles.clearBtn}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Suggestion dropdown */}
        {showDropdown && (
          <div style={styles.dropdown} role="listbox">
            {suggestions.length > 0 ? (
              suggestions.map((song, i) => (
                <div
                  key={song.id}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseDown={() => playSuggestion(song)}
                  onMouseEnter={() => setActiveIdx(i)}
                  style={{
                    ...styles.suggestionRow,
                    background: i === activeIdx
                      ? 'rgba(34,197,94,0.08)'
                      : 'transparent',
                    borderLeft: i === activeIdx
                      ? '2px solid #22c55e'
                      : '2px solid transparent',
                  }}
                >
                  <img
                    src={song.coverUrl || 'https://placehold.co/36x36/111/555?text=♪'}
                    alt=""
                    style={styles.suggestionCover}
                    onError={e => { e.target.src = 'https://placehold.co/36x36/111/555?text=♪'; }}
                  />
                  <div style={styles.suggestionText}>
                    <HighlightedText
                      text={song.title}
                      query={q}
                      style={styles.suggestionTitle}
                    />
                    <HighlightedText
                      text={song.artist}
                      query={q}
                      style={styles.suggestionArtist}
                    />
                  </div>
                  <span style={styles.suggestionPlay}>▶</span>
                </div>
              ))
            ) : q.length >= 2 ? (
              <div style={styles.noResults}>
                No results for <span style={{ color: '#fff' }}>"{q}"</span>
              </div>
            ) : null}
          </div>
        )}
      </form>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    maxWidth: '340px',
    position: 'relative',
    zIndex: 100,
  },
  form: {
    width: '100%',
  },
  wrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '10px',
    padding: '0 12px',
    height: '42px',
    transition: 'border-color 0.2s, box-shadow 0.2s, border-radius 0.1s',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    WebkitAppearance: 'none',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'color 0.15s',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#1a1a1a',
    border: '1px solid #22c55e',
    borderTop: '1px solid #2d2d2d',
    borderRadius: '0 0 10px 10px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  suggestionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'background 0.1s',
    borderBottom: '1px solid #222',
  },
  suggestionCover: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    objectFit: 'cover',
    flexShrink: 0,
  },
  suggestionText: {
    flex: 1,
    minWidth: 0,
  },
  suggestionTitle: {
    display: 'block',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '2px',
  },
  suggestionArtist: {
    display: 'block',
    color: '#6b7280',
    fontSize: '11px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  suggestionPlay: {
    color: '#4b5563',
    fontSize: '10px',
    flexShrink: 0,
  },
  noResults: {
    padding: '14px 16px',
    color: '#6b7280',
    fontSize: '13px',
  },
};

export default SearchBar;