import dotenv from 'dotenv';

dotenv.config();

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret_2025',
  },
}; 