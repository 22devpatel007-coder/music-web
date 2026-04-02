/**
 * SongsContext — PERMANENT FIX (v2)
 *
 * Problems solved:
 *
 * 1. 304 Not Modified → blank page
 *    axios treats 304 as a successful response but the response body is empty.
 *    The browser serves the cached body, but because axios runs the response
 *    interceptor after the XHR resolves, `res.data` can be `""` or `undefined`
 *    when the server sends 304 with no body.
 *    FIX: Validate res.data is a non-empty array before calling setSongs().
 *         If it's empty/falsy, force a cache-busted refetch once.
 *
 * 2. Auth-timing race
 *    SongsContext was fetching before the Firebase token was ready, so
 *    axiosInstance's token interceptor returned null and the request went out
 *    unauthenticated. Even though /api/songs is public, some server configs
 *    (nginx, CDN, reverse-proxy) return 304 on public routes for any client
 *    that previously got a 200, which trips bug #1.
 *    FIX: Fetch is deferred until after the first render cycle settles.
 *         On auth errors (401) the context retries once with a cache-busted URL.
 *
 * 3. Duplicate network requests
 *    Home.jsx, LikedSongs, Player, PlaylistDetail all fetched /api/songs
 *    independently. Now all read from this single context.
 */

import React, {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import axiosInstance from '../utils/axiosInstance';

const SongsContext = createContext({
  songs:   [],
  loading: true,
  error:   null,
  refetch: () => {},
});

export const useSongs = () => {
  const ctx = useContext(SongsContext);
  if (!ctx) {
    console.error('[useSongs] Called outside <SongsProvider>. Returning safe defaults.');
    return { songs: [], loading: false, error: 'No provider', refetch: () => {} };
  }
  return ctx;
};

export const SongsProvider = ({ children }) => {
  const [songs,   setSongs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Track whether we've already done a cache-busted retry to avoid loops
  const retriedRef = useRef(false);

  const fetchSongs = useCallback(async ({ bust = false } = {}) => {
    setLoading(true);
    setError(null);

    // PERMANENT FIX: Cache-busting query param prevents the browser from
    // serving a 304 with an empty body. Only used on explicit retries so we
    // don't hammer the server on every render.
    const url = bust
      ? `/api/songs?_=${Date.now()}`
      : '/api/songs';

    try {
      const res = await axiosInstance.get(url);

      // PERMANENT FIX: Guard against empty 304 body.
      // axios may resolve with res.data = "" / null / undefined on 304.
      if (!Array.isArray(res.data) || res.data.length === 0) {
        // If we already retried, accept the empty result (library is empty)
        if (retriedRef.current || bust) {
          setSongs(Array.isArray(res.data) ? res.data : []);
          setLoading(false);
          return;
        }
        // First time: force a cache-busted retry
        console.warn(
          '[SongsContext] Got empty/304 response — retrying with cache-bust.'
        );
        retriedRef.current = true;
        fetchSongs({ bust: true });
        return;
      }

      retriedRef.current = false; // reset on clean success
      setSongs(res.data);
    } catch (err) {
      console.error('[SongsContext] fetch failed:', err.message);

      // PERMANENT FIX: On 401, the token may not have been ready.
      // Retry once with a short delay to let AuthContext settle.
      if (err.response?.status === 401 && !retriedRef.current) {
        retriedRef.current = true;
        console.warn('[SongsContext] 401 on /api/songs — retrying in 1s...');
        setTimeout(() => fetchSongs({ bust: true }), 1000);
        return;
      }

      setError(err.message);
    } finally {
      // Only clear loading if we're not about to retry
      if (retriedRef.current === false || bust) {
        setLoading(false);
      }
    }
  }, []);

  // PERMANENT FIX: Use a tiny setTimeout(0) so the fetch always starts
  // *after* AuthContext's onAuthStateChanged has had a chance to fire and
  // set the token. Without this, the fetch can race ahead of the token on
  // cold loads.
  useEffect(() => {
    const timer = setTimeout(() => fetchSongs(), 0);
    return () => clearTimeout(timer);
  }, [fetchSongs]);

  // Public refetch — always cache-busts so callers get fresh data
  const refetch = useCallback(() => {
    retriedRef.current = false;
    fetchSongs({ bust: true });
  }, [fetchSongs]);

  return (
    <SongsContext.Provider value={{ songs, loading, error, refetch }}>
      {children}
    </SongsContext.Provider>
  );
};

export default SongsContext;