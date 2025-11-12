const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Fix for stream pipeline and header issues with Expo web
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Track if response has been handled
      let responseHandled = false;
      
      // Override end method to track completion
      const originalEnd = res.end.bind(res);
      res.end = function(...args) {
        if (!responseHandled) {
          responseHandled = true;
          return originalEnd(...args);
        }
      };
      
      // Override writeHead to prevent duplicate headers
      const originalWriteHead = res.writeHead.bind(res);
      res.writeHead = function(...args) {
        if (!res.headersSent) {
          return originalWriteHead(...args);
        }
      };
      
      // Handle premature connection close
      res.on('close', () => {
        if (!responseHandled && !res.writableEnded) {
          responseHandled = true;
          try {
            res.end();
          } catch (e) {
            // Ignore errors on close
          }
        }
      });
      
      return middleware(req, res, next);
    };
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
