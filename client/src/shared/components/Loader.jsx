const Loader = () => (
  <div style={styles.wrap}>
    <div style={styles.spinner} />
  </div>
);

const styles = {
  wrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f0f0f',
  },
  spinner: {
    width: '36px',
    height: '36px',
    border: '3px solid #2d2d2d',
    borderTop: '3px solid #22c55e',
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
  },
};

// Inject keyframe once
if (typeof document !== 'undefined' && !document.getElementById('melo-spin')) {
  const s = document.createElement('style');
  s.id = 'melo-spin';
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}

export default Loader;