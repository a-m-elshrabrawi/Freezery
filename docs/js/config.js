const hostname = window.location.hostname;
const isDev = hostname === 'localhost' || hostname === '127.0.0.1';

const config = {
  API_BASE: isDev
    ? `http://${hostname}:3000`
    : 'https://freezery-api.onrender.com',
};

export default config;
