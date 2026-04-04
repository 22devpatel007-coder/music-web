// hooks/useSearch.js
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '';
const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 1;

/**
 * useSearch — debounced server-side search hook.
 *
 * Usage:
 *   const { results, isSearching, searchError, query, setQuery, clearSearch } = useSearch();
 *
 * - Debounces input by 300 ms before hitting the server.
 * - Cancels in-flight requests when a newer query arrives (AbortController).
 * - Returns empty results immediately when query is cleared.
 * - No FlexSearch, no local index, no dependency on allSongs.
 */
const useSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Ref to abort in-flight fetch when query changes
  const abortRef = useRef(null);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSearchError(null);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();

    // Immediately clear results for empty / too-short queries
    if (!trimmed || trimmed.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    // Debounce: wait before firing the request
    const timer = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSearching(true);
      setSearchError(null);

      try {
        const res = await axios.get(`${API_BASE}/api/search`, {
          params: { q: trimmed, limit: 20 },
          signal: controller.signal,
        });

        // res.data = { songs, total, query }
        const songs = Array.isArray(res.data?.songs) ? res.data.songs : [];
        setResults(songs);
      } catch (err) {
        // Ignore cancellation errors — they are intentional
        if (axios.isCancel(err) || err.name === 'CanceledError') return;

        console.error('[useSearch] fetch error:', err.message);
        setSearchError('Search failed. Please try again.');
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      // Abort any in-flight request on cleanup
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [query]);

  return { query, setQuery, results, isSearching, searchError, clearSearch };
};

export default useSearch;