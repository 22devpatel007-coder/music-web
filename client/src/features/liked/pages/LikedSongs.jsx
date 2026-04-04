import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "features/auth/context/AuthContext";
import { useSongs } from "features/songs/context/SongsContext";
import Navbar from "shared/components/Navbar";
import SongList from "features/songs/components/SongList";
import Loader from "shared/components/Loader";

const LikedSongs = () => {
  const { likedSongs } = useAuth();
  // PERMANENT FIX: Read from SongsContext — no duplicate /api/songs fetch
  const { songs, loading } = useSongs();

  const liked = useMemo(() => {
    if (!likedSongs || likedSongs.length === 0) return [];
    return songs.filter((s) => likedSongs.includes(s.id));
  }, [songs, likedSongs]);

  if (loading) return <Loader />;

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.iconWrap}>
            <HeartIcon />
          </div>
          <div>
            <h1 style={styles.heading}>Liked Songs</h1>
            <p style={styles.subheading}>
              {liked.length} {liked.length === 1 ? "song" : "songs"} saved
            </p>
          </div>
        </div>

        <div style={styles.divider} />

        {liked.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIconWrap}>
              <HeartOutlineIcon />
            </div>
            <p style={styles.emptyTitle}>No liked songs yet</p>
            <p style={styles.emptySubtitle}>
              Like a song to save it here for quick access.
            </p>
            <Link to="/home" style={styles.browseBtn}>
              Browse Library
            </Link>
          </div>
        ) : (
          <SongList songs={liked} />
        )}
      </div>

      <div style={{ height: 88 }} />
    </div>
  );
};

const HeartIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.09C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 14 21 12 21Z"
      fill="#fff"
    />
  </svg>
);

const HeartOutlineIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      d="M12 21C12 21 3 14.5 3 8.5C3 5.42 5.42 3 8.5 3C10.24 3 11.91 3.81 13 5.09C14.09 3.81 15.76 3 17.5 3C20.58 3 23 5.42 23 8.5C23 14.5 14 21 12 21Z"
      stroke="#4b5563"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f0f0f",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  container: { maxWidth: "1200px", margin: "0 auto", padding: "36px 20px 0" },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "24px",
  },
  iconWrap: {
    width: "52px",
    height: "52px",
    background: "#e11d48",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heading: {
    color: "#fff",
    fontSize: "22px",
    fontWeight: "700",
    letterSpacing: "-0.3px",
    marginBottom: "4px",
  },
  subheading: { color: "#6b7280", fontSize: "13px" },
  divider: { height: "1px", background: "#2d2d2d", marginBottom: "28px" },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "72px 20px",
    gap: "12px",
  },
  emptyIconWrap: {
    width: "60px",
    height: "60px",
    background: "#1a1a1a",
    border: "1px solid #2d2d2d",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  emptyTitle: { color: "#fff", fontSize: "16px", fontWeight: "600" },
  emptySubtitle: { color: "#6b7280", fontSize: "13px", maxWidth: "260px" },
  browseBtn: {
    display: "inline-block",
    marginTop: "8px",
    background: "#22c55e",
    color: "#000",
    textDecoration: "none",
    borderRadius: "8px",
    padding: "10px 24px",
    fontSize: "13px",
    fontWeight: "600",
  },
};

export default LikedSongs;
