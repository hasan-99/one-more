import type { Json, Tables } from '@/lib/database.types';
import { loadAreaRows, loadCityRows } from '@/lib/reference-data';
import { getSupabaseClient } from '@/lib/supabase';
import { filterCityAreaOptions } from '@/features/location/city-options';

import { matchPageSize, parseOpenPositions, type OpenPosition } from './match-validation';

export type MatchFilters = {
  cityId: string | null;
  areaId: string | null;
  sideSize: number | null;
  minimumFreeSpots: number | null;
  priceMaximum: number | null;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  dateFrom: string;
  dateThrough: string;
};

export type MatchDiscoveryItem = {
  id: string;
  title: string;
  sideSize: number;
  cityId: string;
  cityNameEn: string;
  cityNameEl: string;
  areaId: string;
  areaNameEn: string;
  areaNameEl: string;
  venueName: string;
  venueAddress: string;
  startsAt: string;
  durationMinutes: number;
  skillLevel: string | null;
  priceEur: number;
  capacity: number;
  activePlayers: number;
  freeSpots: number;
  openPositions: OpenPosition[];
  notes: string | null;
  bookingStatus: 'not_booked' | 'pending' | 'confirmed';
  isOrganizer: boolean;
};

export type MatchEditorValues = {
  title: string;
  sideSize: number;
  cityId: string;
  areaId: string;
  venueName: string;
  venueAddress: string;
  startsAt: string;
  durationMinutes: number;
  skillLevel: string;
  priceEur: number;
  reservedGuestSlots: number;
  notes: string;
  eventStatus: 'draft' | 'published';
  bookingStatus: 'not_booked' | 'pending' | 'confirmed';
  waitlistOfferMinutes: number;
  positions: { position: string; x_pct: number; y_pct: number }[];
  booking: { organizer_notes: string; reference: string };
};

export type MatchEditorBundle = { values: MatchEditorValues; activePlayers: number };

export type MatchDiscoveryPage = { items: MatchDiscoveryItem[]; hasMore: boolean };
export type MatchCity = Tables<'cities'>;
export type MatchArea = Tables<'areas'>;

export function mapDiscoveryRow(row: Tables<'match_discovery'>): MatchDiscoveryItem | null {
  if (
    !row.id ||
    !row.title ||
    row.side_size === null ||
    !row.city_id ||
    !row.city_name_en ||
    !row.city_name_el ||
    !row.area_id ||
    !row.area_name_en ||
    !row.area_name_el ||
    !row.venue_display_name ||
    !row.venue_address ||
    !row.starts_at ||
    row.duration_minutes === null ||
    row.price_eur === null ||
    row.capacity === null ||
    row.active_players === null ||
    row.free_spots === null
  )
    return null;
  return {
    id: row.id,
    title: row.title,
    sideSize: row.side_size,
    cityId: row.city_id,
    cityNameEn: row.city_name_en,
    cityNameEl: row.city_name_el,
    areaId: row.area_id,
    areaNameEn: row.area_name_en,
    areaNameEl: row.area_name_el,
    venueName: row.venue_display_name,
    venueAddress: row.venue_address,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    skillLevel: row.skill_level,
    priceEur: row.price_eur,
    capacity: row.capacity,
    activePlayers: row.active_players,
    freeSpots: row.free_spots,
    openPositions: parseOpenPositions(row.open_positions as Json),
    notes: row.notes,
    bookingStatus:
      row.booking_status === 'pending' || row.booking_status === 'confirmed'
        ? row.booking_status
        : 'not_booked',
    isOrganizer: row.is_organizer ?? false,
  };
}

export async function loadMatchForEditor(id: string): Promise<MatchEditorBundle> {
  const client = getSupabaseClient();
  const [match, positions, booking, discovery] = await Promise.all([
    client
      .from('matches')
      .select(
        'id,title,side_size,city_id,area_id,venue_display_name,venue_address,starts_at,duration_minutes,skill_level,price_eur,reserved_guest_slots,event_status,notes,booking_status,waitlist_offer_minutes',
      )
      .eq('id', id)
      .maybeSingle(),
    client
      .from('match_position_slots')
      .select('id,position_code,status,x_pct,y_pct,created_at')
      .eq('match_id', id)
      .eq('status', 'open')
      .order('created_at'),
    client
      .from('match_booking_private_details')
      .select('organizer_notes,reference')
      .eq('match_id', id)
      .maybeSingle(),
    client.from('match_discovery').select('active_players').eq('id', id).maybeSingle(),
  ]);
  for (const result of [match, positions, booking, discovery]) if (result.error) throw result.error;
  if (!match.data) throw new Error('match_not_owned_or_unavailable');
  const row = match.data;
  return {
    activePlayers: discovery.data?.active_players ?? 0,
    values: {
      title: row.title,
      sideSize: row.side_size,
      cityId: row.city_id,
      areaId: row.area_id,
      venueName: row.venue_display_name,
      venueAddress: row.venue_address,
      startsAt: row.starts_at,
      durationMinutes: row.duration_minutes,
      skillLevel: row.skill_level ?? '',
      priceEur: row.price_eur,
      reservedGuestSlots: row.reserved_guest_slots,
      notes: row.notes ?? '',
      eventStatus: row.event_status === 'published' ? 'published' : 'draft',
      bookingStatus:
        row.booking_status === 'pending' || row.booking_status === 'confirmed'
          ? row.booking_status
          : 'not_booked',
      waitlistOfferMinutes: row.waitlist_offer_minutes,
      positions: (positions.data ?? []).map((slot) => ({
        position: slot.position_code,
        x_pct: slot.x_pct,
        y_pct: slot.y_pct,
      })),
      booking: {
        organizer_notes: booking.data?.organizer_notes ?? '',
        reference: booking.data?.reference ?? '',
      },
    },
  };
}

export async function saveMatch(values: MatchEditorValues, id?: string): Promise<string> {
  const client = getSupabaseClient();
  const p_match = {
    title: values.title,
    side_size: values.sideSize,
    city_id: values.cityId,
    area_id: values.areaId,
    venue_display_name: values.venueName,
    venue_address: values.venueAddress,
    starts_at: values.startsAt,
    duration_minutes: values.durationMinutes,
    skill_level: values.skillLevel || null,
    price_eur: values.priceEur,
    reserved_guest_slots: values.reservedGuestSlots,
    event_status: values.eventStatus,
    notes: values.notes,
    booking_status: values.bookingStatus,
    waitlist_offer_minutes: values.waitlistOfferMinutes,
  } satisfies Json;
  const p_positions = values.positions satisfies Json;
  const p_booking = values.booking satisfies Json;
  const result = id
    ? await client.rpc('update_match_with_positions', {
        p_match_id: id,
        p_match,
        p_positions,
        p_booking,
      })
    : await client.rpc('create_match_with_positions', { p_match, p_positions, p_booking });
  if (result.error) throw result.error;
  return result.data;
}

/** How many players were told about a game (only the organizer gets a number). */
export async function countPublishedNotifications(matchId: string): Promise<number> {
  const { data, error } = await getSupabaseClient().rpc('count_match_published_notifications', {
    p_match_id: matchId,
  });
  if (error) throw error;
  return data;
}

export async function cancelMatch(id: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('cancel_match', { p_match_id: id });
  if (error) throw error;
}

export async function loadMatchFilters(): Promise<{ cities: MatchCity[]; areas: MatchArea[] }> {
  const [cities, areas] = await Promise.all([loadCityRows(), loadAreaRows()]);
  if (cities.error) throw cities.error;
  if (areas.error) throw areas.error;
  return filterCityAreaOptions(cities.data, areas.data);
}

export async function loadMatches(
  filters: MatchFilters,
  page: number,
): Promise<MatchDiscoveryPage> {
  const from = page * matchPageSize;
  const client = getSupabaseClient();
  let query = client
    .from('match_discovery')
    .select('*')
    .gt('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .order('id', { ascending: true })
    .range(from, from + matchPageSize - 1);

  if (filters.cityId) query = query.eq('city_id', filters.cityId);
  if (filters.areaId) query = query.eq('area_id', filters.areaId);
  if (filters.sideSize) query = query.eq('side_size', filters.sideSize);
  if (filters.minimumFreeSpots !== null) query = query.gte('free_spots', filters.minimumFreeSpots);
  if (filters.priceMaximum !== null) query = query.lte('price_eur', filters.priceMaximum);
  if (filters.skillLevel) query = query.eq('skill_level', filters.skillLevel);
  if (filters.dateFrom) query = query.gte('starts_at', filters.dateFrom);
  if (filters.dateThrough) query = query.lt('starts_at', filters.dateThrough);

  const { data, error } = await query;
  if (error) throw error;
  const items = (data ?? []).flatMap((row) => {
    const item = mapDiscoveryRow(row);
    return item ? [item] : [];
  });
  return { items, hasMore: (data?.length ?? 0) === matchPageSize };
}

export async function loadMatch(id: string): Promise<MatchDiscoveryItem | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return null;
  }
  const { data, error } = await getSupabaseClient()
    .from('match_discovery')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapDiscoveryRow(data) : null;
}
