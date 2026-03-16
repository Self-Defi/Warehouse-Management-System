const SUPABASE_URL = "https://yscuhozzbjlzfqgxxlgr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_j0e4kjoU4YYL03sAucnhYQ_yfzDAetp";

if (!window.supabase) {
  throw new Error("Supabase client library failed to load.");
}

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.db = db;
