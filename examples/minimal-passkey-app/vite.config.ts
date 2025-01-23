import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        sdk: resolve(__dirname, 'sdk.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 5173,
  },
  // Create a second server for SDK
  plugins: [{
    name: 'sdk-server',
    configureServer(server) {
      const sdkPort = 5174;
      const app2Port = 5175;
      server.httpServer?.once('listening', () => {
        // Start another server for SDK
        const sdkServer = server.middlewares.listen(sdkPort, '0.0.0.0', () => {
          console.log(`SDK server running at http://localhost:${sdkPort}/sdk.html`);
        });
        const app2Server = server.middlewares.listen(app2Port, '0.0.0.0', () => {
          console.log(`SDK server running at http://localhost:${app2Port}/sdk.html`);
        });
      });
    }
  }]
}) 