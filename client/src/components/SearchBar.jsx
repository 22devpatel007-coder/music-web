// PERMANENT FIX: This file previously exported the entire Search PAGE
// component instead of a SearchBar input widget. Any page importing
// SearchBar (Home, Search) would silently render wrong or crash.
// This is now the correct standalone SearchBar input component.

import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SearchBar = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(val.trim())}`, { replace: true });
    } else if (val.trim().length === 0) {
      navigate('/search', { replace: true });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    navigate('/search', { replace: true });
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form} role="search">
      <div style={{
        ...styles.wrap,
        borderColor: focused ? '#22c55e' : '#2d2d2d',
        boxShadow: focused ? '0 0 0 3px rgba(34,197,94,0.1)' : 'none',
      }}>
        {/* Search icon */}
        <svg
          width="16" height="16" viewBox="0 0 20 20" fill="none"
          style={{ flexShrink: 0, color: focused ? '#22c55e' : '#6b7280', transition: 'color 0.2s' }}
        >
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M14 14l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        <input
          type="search"
          placeholder="Search songs or artists…"
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={styles.input}
          aria-label="Search songs or artists"
          autoComplete="off"
          spellCheck={false}
        />

        {/* Clear button */}
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
    </form>
  );
};

const styles = {
  form: {
    width: '100%',
    maxWidth: '340px',
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
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '14px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    // Remove native search input styling (the X button in Chrome/Safari)
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
};

export default SearchBar;