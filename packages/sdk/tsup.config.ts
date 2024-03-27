import { defineConfig } from 'tsup';
//@ts-ignore
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  sourcemap: true,
  shims: true,
  treeshake: true,
  format: ['cjs', 'esm'],
  minify: true,
  entry: ['./src/index.ts'],
  dts: true,
  replaceNodeEnv: true,
});
