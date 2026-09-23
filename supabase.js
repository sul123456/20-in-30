import { createClient } from "@supabase/supabase-js";

// Only the public URL and the anon/publishable key are used in the browser.
// Row Level Security + the save_video() function control what they can do.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
// The Vercel ↔ Supabase integration sets one of these two automatically.
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;
