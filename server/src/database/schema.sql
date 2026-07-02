-- Enable Row Level Security (RLS) on tables to prevent unauthorized public access
-- Since this project uses a Node.js backend (Express) to interact with Supabase,
-- the backend should use the Supabase `service_role` key to bypass RLS.
-- This ensures no one can read or write data directly from the client/browser using the anon key.

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Note: We are intentionally NOT creating any policies. 
-- By enabling RLS without policies, all access via the `anon` key is completely blocked.
-- Your server must use the `service_role` key in its .env file to continue working.
