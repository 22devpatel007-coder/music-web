import { Link } from 'react-router-dom';

const NotFound = () => (
  <div style={styles.page}>
    <div style={styles.icon}>♪</div>
    <h1 style={styles.code}>404</h1>
    <p style={styles.msg}>This page doesn't exist.</p>
    <Link to="/home" style={styles.btn}>Go Home</Link>
  </div>
);

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0f0f0f',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: '24px',
  },
  icon: {
    width: '56px',
    height: '56px',
    background: '#1a1a1a',
    border: '1px solid #2d2d2d',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    color: '#22c55e',
  },
  code: {
    color: '#fff',
    fontSize: '48px',
    fontWeight: '800',
    letterSpacing: '-2px',
  },
  msg: {
    color: '#6b7280',
    fontSize: '15px',
  },
  btn: {
    background: '#22c55e',
    color: '#000',
    textDecoration: 'none',
    borderRadius: '8px',
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: '600',
    marginTop: '8px',
  },
};

export default NotFound;