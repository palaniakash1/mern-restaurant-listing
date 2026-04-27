import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import process from 'node:process';

import { config as loadDotenv } from 'dotenv';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootEnvDir = resolve(__dirname, '..');

const pickEnv = (env, primaryKey, fallbackKey) =>
  env[primaryKey] || env[fallbackKey] || '';

export default defineConfig(() => {
  const rootEnv = loadDotenv({
    path: resolve(rootEnvDir, '.env'),
    quiet: true
  }).parsed || {};

  const env = {
    ...rootEnv,
    ...process.env
  };

  return {
    define: {
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(
        pickEnv(env, 'VITE_FIREBASE_API_KEY', 'FIREBASE_API_KEY')
      ),
      'import.meta.env.VITE_GOOGLE_MAPS_API_KEY': JSON.stringify(
        pickEnv(env, 'VITE_GOOGLE_MAPS_API_KEY', 'GOOGLE_MAPS_API_KEY')
      ),
      'import.meta.env.VITE_CLOUDINARY_CLOUD_NAME': JSON.stringify(
        pickEnv(env, 'VITE_CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_CLOUD_NAME')
      )
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          secure: false
        }
      }
    },
    plugins: [react()]
  };
});
