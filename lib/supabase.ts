import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export type Shift = {
  id: string;
  name: string;
  code: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
};

export type AttendanceRecord = {
  id: string;
  shift_id: string;
  ist_id: string;
  timestamp: string;
  students: { name: string; ist_id: string } | null;
};