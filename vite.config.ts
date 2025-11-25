import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

// Fix for __dirname in ESM environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, '.', '');

    // Resolve keys: Prefer standard names, fallback to VITE_ names, or vice versa
    const sbUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    const sbKey = env.SUPABASE_KEY || env.VITE_SUPABASE_ANON_KEY;

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Manually expose environment variables to the client
        // Vite replaces these strings literally in the code
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        
        'process.env.SUPABASE_URL': JSON.stringify(sbUrl),
        'process.env.SUPABASE_KEY': JSON.stringify(sbKey),
        
        'process.env.VITE_SUPABASE_URL': JSON.stringify(sbUrl),
        'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(sbKey)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
