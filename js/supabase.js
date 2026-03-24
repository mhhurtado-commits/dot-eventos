const SUPABASE_URL = 'https://rwcadppxzpflqojuitzt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_yLO0GibqSE6yfQAKvMxgbQ_YIqv3S1v';
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);