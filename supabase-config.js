// Supabase connection config

const SUPABASE_URL = "https://yscuhozzbjlzfqgxxlgr.supabase.co";
const SUPABASE_KEY = "sb_publishable_j0e4kjoU4YYL03sAucnhYQ_yfzDAetp";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false
  }
});

window.db = db;
