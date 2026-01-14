import { createClient } from "@supabase/supabase-js";


const SUPABASE_URL = "https://oyguhhuumjzrcsrnbgzw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95Z3VoaHV1bWp6cmNzcm5iZ3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNzY4NDEsImV4cCI6MjA4Mzk1Mjg0MX0.VN-KSUtegrx4-kJZP-5UjpMaooGyx58w5yypzzODtkc";


export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
