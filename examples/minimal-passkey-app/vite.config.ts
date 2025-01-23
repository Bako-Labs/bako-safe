import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 5173,
  },
  plugins: [
    {
      name: 'sdk-server',
      configureServer(server) {
        const app2Port = 5175;
        server.httpServer?.once('listening', () => {
          const app2Server = server.middlewares.listen(
            app2Port,
            '0.0.0.0',
            () => {
              console.log(
                `SDK server running at http://localhost:${app2Port}/sdk.html`,
              );
            },
          );
        });
      },
    },
  ],
});
