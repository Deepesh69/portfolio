const server = require('../server');

module.exports = (req, res) => {
  const orig = req.headers['x-forwarded-uri'] || req.headers['x-matched-path'];
  if (orig && (req.url.startsWith('/api/index.js') || req.url === '/api' || req.url === '/api/')) {
    req.url = orig;
  }
  return server.emit('request', req, res);
};
