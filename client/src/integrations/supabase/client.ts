
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://nesxgukzngrupkbuxujg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lc3hndWt6bmdydXBrYnV4dWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyMjk5MTQsImV4cCI6MjA1OTgwNTkxNH0.OTGfcgV6IzXzvo6CDZ5IzbEmTrPRmIKTzi-CW02dhdE";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
