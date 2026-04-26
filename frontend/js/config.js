const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

const config = {
  API_BASE: isDev
    ? 'http://localhost:3000'
    : 'https://YOUR_RENDER_APP_NAME.onrender.com', // ← replace during deployment
};

export default config;
