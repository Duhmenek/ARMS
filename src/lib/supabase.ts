import { createClient } from '@supabase/supabase-js';

// Retrieve Supabase environment variables cleanly with multi-framework support (Vite & Next.js)
const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env || {} : {};

// Project URL: read from VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL with safe setup fallback
export const supabaseUrl: string =
  metaEnv.VITE_SUPABASE_URL ||
  metaEnv.NEXT_PUBLIC_SUPABASE_URL ||
  'https://clhfiuqgzguixfkvgctd.supabase.co';

// Publishable Key: read from VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY with fallback to provided publishable key
export const supabaseAnonKey: string =
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_PCXBxbOu2fQMJiuThOhbiw_N_I_QQXN';

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export default supabase;
