// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://achsqyusedhegqqgpucu.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHNxeXVzZWRoZWdxcWdwdWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5ODgwOTksImV4cCI6MjA2NzU2NDA5OX0.SAC-MRbEmOP_UeP-s5la4VmZ6HDggWaB3GC8SNSokvo";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});