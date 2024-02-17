import { defineConfig } from 'tsup';
//@ts-ignore
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  sourcemap: true,
  shims: true,
  treeshake: true,
  env: {
    API_URL: process.env.API_URL!,
    APP_NAME: process.env.APP_NAME!,
    APP_BSAFE_URL: process.env.APP_BSAFE_URL!,
    APP_IMAGE_DARK: process.env.APP_IMAGE_DARK!,
    APP_DESCRIPTION: process.env.APP_DESCRIPTION!,
    APP_IMAGE_LIGHT: process.env.APP_IMAGE_LIGHT!,
  },
  format: ['cjs', 'esm'],
  minify: true,
  entry: ['./src/index.ts'],
  dts: true,
  replaceNodeEnv: true,
});
