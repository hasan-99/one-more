import { cachedRequest } from '@/lib/request-cache';
import { getSupabaseClient } from '@/lib/supabase';

// Cities and areas change a few times a year: share one request and keep the rows for 10 minutes.
const referenceTtlMs = 10 * 60 * 1000;

export function loadCityRows() {
  return cachedRequest('ref:cities', referenceTtlMs, async () => {
    const result = await getSupabaseClient().from('cities').select('*').order('name_en');
    if (result.error) throw result.error; // never keep a failed answer
    return result;
  });
}

export function loadAreaRows() {
  return cachedRequest('ref:areas', referenceTtlMs, async () => {
    const result = await getSupabaseClient().from('areas').select('*').order('name_en');
    if (result.error) throw result.error;
    return result;
  });
}
