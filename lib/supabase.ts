import { createClient } from '@supabase/supabase-js';

// Shared itaibechor-site project; this app lives in its own `rental` schema.
// Publishable key: public by design, RLS protects the data (supabase/schema.sql).
export const supabase = createClient('https://hyeslwlewvvjiyizoduf.supabase.co', 'sb_publishable_de6tynv8AkIVfS9U5HYxyA_8NMR4tLo', {
  db: { schema: 'rental' },
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true },
});

export type Value = string | number | boolean | null;
export type Row = { id: number } & Record<string, Value>;

export const ils = (n: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(n);
