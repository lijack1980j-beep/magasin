import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://ntupihuarkcwzkpccldk.supabase.co", // SUPABASE_URL
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXBpaHVhcmtjd3prcGNjbGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjMzOTksImV4cCI6MjA4NTYzOTM5OX0.06aW6X0Azpj3iXyCKOnJEWnE5R19WE5awc6u0iXeeSU"                      // anon key ONLY
);
