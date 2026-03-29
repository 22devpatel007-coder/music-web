import { useEffect, useState } from 'react';

export default function useSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSongs([]);
    setLoading(false);
  }, []);

  return { songs, loading };
}
