const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use('/api', createProxyMiddleware({
    target: `http://127.0.0.1:${process.env.BACKEND_PORT || 5001}`,
    changeOrigin: true,
  }));
};
