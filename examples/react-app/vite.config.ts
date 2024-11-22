import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      bakowallet: path.resolve(__dirname, '../../packages/react/src'),
    },
  },
});
