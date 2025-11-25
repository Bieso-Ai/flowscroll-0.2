import { createClient } from '@supabase/supabase-js';

// --- HELPER: Explicit Environment Access ---
// We must access process.env.VARIABLE_NAME explicitly so Vite's build process
// can statically replace these strings with the actual values.
// Dynamic access like process.env[key] DOES NOT WORK in Vite.

let envUrl = '';
let envKey = '';

try {
    // 1. Try Vite's import.meta.env (standard way)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        envUrl = import.meta.env.VITE_SUPABASE_URL || '';
        envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    }
} catch (e) {}

try {
    // 2. Try process.env replacement (configured in vite.config.ts define)
    // We check for the string "process.env.SUPABASE_URL" explicitly
    if (!envUrl && typeof process !== 'undefined' && process.env) {
        // @ts-ignore
        envUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
        // @ts-ignore
        envKey = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
    }
} catch (e) {}

// --- LOCAL STORAGE OVERRIDE ---
// Allow users to input keys manually if env vars are missing
let storageUrl = '';
let storageKey = '';
if (typeof window !== 'undefined') {
    storageUrl = localStorage.getItem('flowscroll_sb_url') || '';
    storageKey = localStorage.getItem('flowscroll_sb_key') || '';
}

// --- FINAL CONFIG ---
const supabaseUrl = storageUrl || envUrl || 'https://placeholder.supabase.co';
const supabaseKey = storageKey || envKey || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const isSupabaseConfigured = () => {
    return !!supabaseUrl && 
           supabaseUrl !== 'https://placeholder.supabase.co' && 
           !!supabaseKey && 
           supabaseKey !== 'placeholder';
};

export const saveSupabaseConfig = (url: string, key: string) => {
    localStorage.setItem('flowscroll_sb_url', url);
    localStorage.setItem('flowscroll_sb_key', key);
    window.location.reload();
};
