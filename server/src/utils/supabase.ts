import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { config } from '../config';

const { url, serviceKey } = config.supabase;

if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials');
}

export const supabase = createClient<Database>(url, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

export const getSupabaseClient = (accessToken?: string) => {
    if (!accessToken) {
        return supabase;
    }

    return createClient<Database>(url, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        },
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    });
}; 