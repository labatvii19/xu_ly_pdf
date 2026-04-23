import { createClient } from '@supabase/supabase-js';

// Thay thế bằng thông tin từ dự án Supabase của anh
// Cấu hình từ dự án Supabase của anh Trung
const supabaseUrl = 'https://nhhkcvhhapjisvzizhwa.supabase.co';
const supabaseAnonKey = 'sb_publishable_nkYJDTejV87jOAhXf2h7KA_mPvSbaSi';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
