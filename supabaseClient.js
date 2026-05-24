// Supabase client setup for the browser.
// Replace the placeholders with your project values or inject them securely.

// IMPORTANT: Do NOT commit real keys to a public repo. Use environment variables
// and server-side secrets in production. For local testing, replace values below.

const SUPABASE_URL = 'https://cifxontsefxnhcpkjdrk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpZnhvbnRzZWZ4bmhjcGtqZHJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDk1MTcsImV4cCI6MjA5NTIyNTUxN30.fgPdTVbVPdnOUXkcU26u9YF6e96IhqAwm-S6xQmm3j0';

// supabase (the library) is available from the CDN; replace it with a client instance
window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// helper: get current user
async function getCurrentUser() {
  try {
    const { data } = await window.supabase.auth.getUser();
    return data?.user || null;
  } catch (err) {
    return null;
  }
}
