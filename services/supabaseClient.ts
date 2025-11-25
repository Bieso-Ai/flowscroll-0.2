import { createClient } from '@supabase/supabase-js';

// Safe environment access that works in both Vite (browser) and Node environments
// Prevents "ReferenceError: process is not defined" crashes
const getEnvVar = (key: string, viteKey: string): string => {
    try {
        // Check import.meta.env (Vite)
        if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
            const val = (import.meta as any).env[viteKey];
            if (val) return val;
        }
    } catch (e) {}

    try {
        // Check process.env (Node/Webpack)
        if (typeof process !== 'undefined' && process.env) {
            const val = process.env[key];
            if (val) return val;
        }
    } catch (e) {}

    return '';
};

const supabaseUrl = getEnvVar('SUPABASE_URL', 'VITE_SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_KEY', 'VITE_SUPABASE_ANON_KEY');

// Fallback to avoid crash if keys are missing.
// createClient throws an error if the URL is empty, so we provide a placeholder.
// The app will load, but Duel Mode will show connection errors instead of a white screen.
const validUrl = supabaseUrl || 'https://placeholder.supabase.co';
const validKey = supabaseKey || 'placeholder';

export const supabase = createClient(validUrl, validKey);

export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseKey;