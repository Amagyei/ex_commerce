const { defineConfig } = require('frappe-ui');

module.exports = defineConfig({
  // The directory where your app's frontend code lives
  app: 'ex_commerce',
  
  // The directory where the built files will be copied to
  output: 'www',
  
  // The entry point for your frontend
  entry: 'src/main.tsx',
  
  // Build configuration
  build: {
    // Output directory relative to the app root
    outDir: 'www',
    // Assets directory
    assetsDir: 'assets',
    // Whether to generate source maps
    sourcemap: false,
    // Whether to minify
    minify: true,
  },
  
  // Development server configuration
  dev: {
    port: 8080,
    // Proxy API requests to the Frappe backend
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8004',
        changeOrigin: true,
      },
    },
  },
});
