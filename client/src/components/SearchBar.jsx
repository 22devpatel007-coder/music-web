import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length >= 2) {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <div style={{ ...styles.wrap, borderColor: focused ? '#22c55e' : '#2d2d2d' }}>
      <svg style={styles.icon} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="8.5" cy="8.5" r="5.5" stroke={focused ? '#22c55e' : '#6b7280'} strokeWidth="1.5"/>
        <path d="M14 14l3 3" stroke={focused ? '#22c55e' : '#6b7280'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Search songs or artists…"
        style={styles.input}
      />
      {query && (
        <button
          onClick={() => { setQuery(''); navigate('/home'); }}
          style={styles.clearBtn}
          aria-label="Clear search"
        >
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <path d="M5 5l10 10M15 5L5 15" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  );
};

const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    background: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '10px',
    padding: '0 14px',
    gap: '10px',
    maxWidth: '520px',
    width: '100%',
    transition: 'border-color 0.2s',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  icon: {
    width: '18px',
    height: '18px',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '14px',
    padding: '12px 0',
    fontFamily: 'inherit',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

export default SearchBar;