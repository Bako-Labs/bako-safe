import { defineConfig } from 'tsup';
//@ts-ignore
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  sourcemap: true,
  shims: true,
  treeshake: true,
  env: {
    BSAFE_URL: process.env.BSAFE_URL!,
    API_URL: process.env.API_URL!,
    REFETCH_TIMEOUT: process.env.REFETCH_TIMEOUT!,
    ENCODER: process.env.ENCODER!,
    GAS_PRICE: process.env.GAS_PRICE!,
    GAS_LIMIT: process.env.GAS_LIMIT!,
    PROVIDER: process.env.PROVIDER!,
  },
  esbuildOptions: (options, context) => {
    options.define = {
      'process.env': JSON.stringify({
        BSAFE_URL: process.env.BSAFE_URL!,
        API_URL: process.env.API_URL!,
        REFETCH_TIMEOUT: process.env.REFETCH_TIMEOUT!,
        ENCODER: process.env.ENCODER!,
        GAS_PRICE: process.env.GAS_PRICE!,
        GAS_LIMIT: process.env.GAS_LIMIT!,
        PROVIDER: process.env.PROVIDER!,
      }),
    };
  },
  format: ['cjs', 'esm'],
  minify: true,
  entry: ['./src/index.ts'],
  dts: true,
  replaceNodeEnv: true,
});
