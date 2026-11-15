import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppCard, AppPage } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import { CreateGameWizard } from '@/features/matches/CreateGameWizard';
import { MatchPositionPicker } from '@/features/matches/MatchPositionPicker';
import {
  loadMatchFilters,
  loadMatchForEditor,
  saveMatch,
  type MatchArea,
  type MatchCity,
  type MatchEditorValues,
} from '@/features/matches/match-service';
import {
  cyprusDateTimeToIso,
  parseOptionalPrice,
  type OpenPosition,
  type OpenPositionCode,
} from '@/features/matches/match-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

type Form = Omit<MatchEditorValues, 'startsAt' | 'positions'> & {
  startsAt: string;
  positions: OpenPosition[];
};
const emptyForm: Form = {
  title: '',
  sideSize: 5,
  cityId: '',
  areaId: '',
  venueName: '',
  venueAddress: '',
  startsAt: '',
  durationMinutes: 90,
  skillLevel: '',
  priceEur: 0,
  reservedGuestSlots: 0,
  notes: '',
  eventStatus: 'draft',
  bookingStatus: 'not_booked',
  waitlistOfferMinutes: 15,
  positions: [],
  booking: { organizer_notes: '', reference: '' },
};

function MatchForm({ matchId }: { matchId: string | undefined }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const { showToast } = useToast();
  const [form, setForm] = useState<Form>(emptyForm);
  const [catalog, setCatalog] = useState<{ cities: MatchCity[]; areas: MatchArea[] } | null>(null);
  const [activePlayers, setActivePlayers] = useState(0);
  const [priceText, setPriceText] = useState('0');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const styles = makeStyles(colors);
  const capacity = form.sideSize * 2;
  const maximumOpen = Math.max(0, capacity - form.reservedGuestSlots - activePlayers);
  const areas = useMemo(
    () => catalog?.areas.filter((area) => area.city_id === form.cityId) ?? [],
    [catalog, form.cityId],
  );
  const positionCopy: Record<OpenPositionCode, string> = {
    goalkeeper: copy.matchGoalkeeper,
    defender: copy.matchDefender,
    midfielder: copy.matchMidfielder,
    forward: copy.matchForward,
    any: copy.matchAnyPosition,
  };

  const load = useCallback(async () => {
    try {
      const [nextCatalog, editor] = await Promise.all([
        loadMatchFilters(),
        matchId ? loadMatchForEditor(matchId) : Promise.resolve(null),
      ]);
      setCatalog(nextCatalog);
      if (editor) {
        setActivePlayers(editor.activePlayers);
        const startsAt = formatCyprusInput(editor.values.startsAt);
        setForm({
          ...editor.values,
          startsAt,
          positions: editor.values.positions.map((position, index) => ({
            id: `loaded-${index}`,
            position: position.position as OpenPositionCode,
            xPct: position.x_pct,
            yPct: position.y_pct,
          })),
        });
        setPriceText(String(editor.values.priceEur));
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load, retry]);

  const update = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const selectedCity = catalog?.cities.find((city) => city.id === form.cityId);
  const submit = async (status: 'draft' | 'published') => {
    const startsAt = cyprusDateTimeToIso(form.startsAt);
    const parsedPrice = parseOptionalPrice(priceText);
    if (form.title.trim().length < 3 || form.title.trim().length > 100)
      return showToast(copy.matchValidationTitle, 'error');
    if (
      !selectedCity ||
      !areas.some((area) => area.id === form.areaId) ||
      form.venueName.trim().length < 2 ||
      form.venueAddress.trim().length < 3 ||
      !startsAt ||
      new Date(startsAt) <= new Date()
    )
      return showToast(copy.matchValidationFields, 'error');
    if (Number.isNaN(parsedPrice)) return showToast(copy.matchValidationPrice, 'error');
    if (
      form.reservedGuestSlots < 0 ||
      form.reservedGuestSlots + activePlayers > capacity ||
      form.positions.length > maximumOpen
    )
      return showToast(copy.matchValidationCapacity, 'error');
    setSaving(true);
    try {
      const id = await saveMatch(
        {
          ...form,
          title: form.title.trim(),
          venueName: form.venueName.trim(),
          venueAddress: form.venueAddress.trim(),
          startsAt,
          priceEur: parsedPrice ?? 0,
          eventStatus: status,
          notes: form.notes.trim(),
          positions: form.positions.map((position) => ({
            position: position.position,
            x_pct: position.xPct ?? 50,
            y_pct: position.yPct ?? 50,
          })),
          booking: {
            organizer_notes: form.booking.organizer_notes.trim(),
            reference: form.booking.reference.trim(),
          },
        },
        matchId,
      );
      showToast(copy.matchCreateSuccess, 'success');
      router.replace(`/matches/${id}`);
    } catch {
      showToast(copy.matchSaveError, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPage
      title={matchId ? copy.matchEditTitle : copy.matchCreateTitle}
      description={copy.matchFormDescription}
    >
      {loading ? (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={copy.matchLoading}
          style={styles.state}
        >
          <Text style={styles.secondary}>{copy.matchLoading}</Text>
        </View>
      ) : null}
      {!loading && loadError ? (
        <AppCard>
          <Text accessibilityRole="alert" style={styles.error}>
            {matchId ? copy.matchEditUnavailable : copy.matchLoadError}
          </Text>
          <Action
            label={copy.matchRetry}
            onPress={() => {
              setLoading(true);
              setLoadError(false);
              setRetry((value) => value + 1);
            }}
            colors={colors}
          />
        </AppCard>
      ) : null}
      {!loading && !loadError && catalog ? (
        <>
          <AppCard>
            <Text style={styles.heading}>{copy.matchSectionGame}</Text>
            <Field
              label={copy.matchTitleLabel}
              value={form.title}
              onChangeText={(value) => update('title', value)}
              colors={colors}
              maxLength={100}
            />
            <Text style={styles.label}>{copy.matchFormat}</Text>
            <View style={styles.row}>
              {[5, 7, 8, 11].map((size) => (
                <Choice
                  key={size}
                  label={`${size}v${size}`}
                  selected={form.sideSize === size}
                  onPress={() => {
                    update('sideSize', size);
                    if (
                      form.positions.length >
                      Math.max(0, size * 2 - form.reservedGuestSlots - activePlayers)
                    )
                      update(
                        'positions',
                        form.positions.slice(
                          0,
                          Math.max(0, size * 2 - form.reservedGuestSlots - activePlayers),
                        ),
                      );
                  }}
                  colors={colors}
                />
              ))}
            </View>
            <Text style={styles.label}>{copy.matchSkillLabel}</Text>
            <View style={styles.row}>
              {[
                ['', copy.matchNoSkill],
                ['beginner', copy.profileBeginner],
                ['intermediate', copy.profileIntermediate],
                ['advanced', copy.profileAdvanced],
              ].map(([value, label]) => (
                <Choice
                  key={value}
                  label={label}
                  selected={form.skillLevel === value}
                  onPress={() => update('skillLevel', value)}
                  colors={colors}
                />
              ))}
            </View>
            <Field
              label={copy.matchStartLocal}
              value={form.startsAt}
              onChangeText={(value) => update('startsAt', value)}
              colors={colors}
              placeholder="YYYY-MM-DDTHH:mm"
            />
            <Text style={styles.label}>{copy.matchDuration}</Text>
            <View style={styles.row}>
              {[60, 90, 120, 150].map((minutes) => (
                <Choice
                  key={minutes}
                  label={`${minutes} ${copy.matchMinutes}`}
                  selected={form.durationMinutes === minutes}
                  onPress={() => update('durationMinutes', minutes)}
                  colors={colors}
                />
              ))}
            </View>
            <Field
              label={copy.matchGuestSlots}
              value={String(form.reservedGuestSlots)}
              onChangeText={(value) =>
                update('reservedGuestSlots', Math.max(0, Number(value) || 0))
              }
              colors={colors}
              keyboardType="number-pad"
            />
            <Field
              label={copy.matchPriceLabel}
              value={priceText}
              onChangeText={setPriceText}
              colors={colors}
              keyboardType="decimal-pad"
            />
            <Field
              label={copy.matchNotesLabel}
              value={form.notes}
              onChangeText={(value) => update('notes', value)}
              colors={colors}
              multiline
              maxLength={1000}
            />
          </AppCard>
          <AppCard>
            <Text style={styles.heading}>{copy.matchSectionLocation}</Text>
            <Text style={styles.label}>{copy.matchCity}</Text>
            <View style={styles.row}>
              {catalog.cities.map((city) => (
                <Choice
                  key={city.id}
                  label={locale === 'el' ? city.name_el : city.name_en}
                  selected={city.id === form.cityId}
                  onPress={() =>
                    setForm((current) => ({ ...current, cityId: city.id, areaId: '' }))
                  }
                  colors={colors}
                />
              ))}
            </View>
            <Text style={styles.label}>{copy.matchArea}</Text>
            <View style={styles.row}>
              {areas.map((area) => (
                <Choice
                  key={area.id}
                  label={locale === 'el' ? area.name_el : area.name_en}
                  selected={area.id === form.areaId}
                  onPress={() => update('areaId', area.id)}
                  colors={colors}
                />
              ))}
            </View>
            <Field
              label={copy.matchVenueName}
              value={form.venueName}
              onChangeText={(value) => update('venueName', value)}
              colors={colors}
            />
            <Field
              label={copy.matchVenueAddress}
              value={form.venueAddress}
              onChangeText={(value) => update('venueAddress', value)}
              colors={colors}
            />
          </AppCard>
          <AppCard>
            <Text style={styles.heading}>
              {copy.matchSectionPositions} · {form.positions.length}/{maximumOpen}
            </Text>
            <MatchPositionPicker
              positions={form.positions}
              maximum={maximumOpen}
              onAdd={(position) => update('positions', [...form.positions, position])}
            />
            {form.positions.map((position, index) => (
              <View key={position.id} style={styles.positionRow}>
                <Text style={styles.body}>
                  {index + 1}. {positionCopy[position.position]} · (
                  {Math.round(position.xPct ?? 50)}%, {Math.round(position.yPct ?? 50)}%)
                </Text>
                <Action
                  label={`${copy.matchRemovePosition}: ${positionCopy[position.position]}`}
                  onPress={() =>
                    update(
                      'positions',
                      form.positions.filter((item) => item.id !== position.id),
                    )
                  }
                  colors={colors}
                />
              </View>
            ))}
          </AppCard>
          <AppCard>
            <Text style={styles.heading}>{copy.matchSectionBooking}</Text>
            <Text style={styles.body}>{copy.matchBookingDisclosure}</Text>
            <View style={styles.row}>
              {(
                [
                  ['not_booked', copy.matchBookingNotBooked],
                  ['pending', copy.matchBookingPending],
                  ['confirmed', copy.matchBookingConfirmed],
                ] as const
              ).map(([value, label]) => (
                <Choice
                  key={value}
                  label={label}
                  selected={form.bookingStatus === value}
                  onPress={() => update('bookingStatus', value)}
                  colors={colors}
                />
              ))}
            </View>
            <Field
              label={copy.matchBookingPrivateNotes}
              value={form.booking.organizer_notes}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  booking: { ...current.booking, organizer_notes: value },
                }))
              }
              colors={colors}
              maxLength={1000}
            />
            <Field
              label={copy.matchBookingReference}
              value={form.booking.reference}
              onChangeText={(value) =>
                setForm((current) => ({
                  ...current,
                  booking: { ...current.booking, reference: value },
                }))
              }
              colors={colors}
              maxLength={120}
            />
          </AppCard>
          <AppCard>
            <Text style={styles.heading}>{copy.matchWaitlistOfferDuration}</Text>
            <Text style={styles.body}>{copy.matchWaitlistOfferDurationHelp}</Text>
            <View style={styles.row}>
              {([5, 10, 15, 30] as const).map((minutes) => (
                <Choice
                  key={minutes}
                  label={copy.matchWaitlistMinutes.replace('{minutes}', String(minutes))}
                  selected={form.waitlistOfferMinutes === minutes}
                  onPress={() => update('waitlistOfferMinutes', minutes)}
                  colors={colors}
                />
              ))}
            </View>
          </AppCard>
          <View style={styles.actions}>
            <Action
              label={
                saving ? copy.matchSaving : matchId ? copy.matchSaveChanges : copy.matchSaveDraft
              }
              onPress={() => void submit('draft')}
              colors={colors}
              disabled={saving}
            />
            <Action
              label={saving ? copy.matchSaving : copy.matchPublish}
              onPress={() => void submit('published')}
              colors={colors}
              disabled={saving}
              primary
            />
          </View>
        </>
      ) : null}
    </AppPage>
  );
}

export default function CreateScreen() {
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const matchId = Array.isArray(params.matchId) ? params.matchId[0] : params.matchId;
  // New games use the step-by-step flow; editing an existing game keeps the full form.
  return matchId ? <MatchForm matchId={matchId} /> : <CreateGameWizard />;
}

function formatCyprusInput(value: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Nicosia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const p = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  placeholder?: string;
  keyboardType?: 'number-pad' | 'decimal-pad';
  multiline?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: props.colors.textSecondary, fontSize: 13, fontWeight: '700' }}>
        {props.label}
      </Text>
      <TextInput
        accessibilityLabel={props.label}
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={props.colors.textSecondary}
        keyboardType={props.keyboardType}
        multiline={props.multiline}
        maxLength={props.maxLength}
        style={{
          minHeight: props.multiline ? 88 : 46,
          borderWidth: 1,
          borderColor: props.colors.border,
          backgroundColor: props.colors.surface,
          color: props.colors.textPrimary,
          borderRadius: 11,
          paddingHorizontal: 12,
          paddingVertical: 10,
          textAlignVertical: props.multiline ? 'top' : 'center',
        }}
      />{' '}
    </View>
  );
}

function Choice({
  label,
  selected,
  onPress,
  colors,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={{
        minHeight: 42,
        paddingHorizontal: 12,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: selected ? colors.accentText : colors.border,
        backgroundColor: selected ? colors.surfaceRaised : colors.surface,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

function Action({
  label,
  onPress,
  colors,
  disabled = false,
  primary = false,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 46,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 14,
        borderRadius: 11,
        backgroundColor: primary ? colors.primaryButton : colors.surfaceRaised,
        borderColor: colors.border,
        borderWidth: 1,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Text
        style={{
          color: primary ? colors.primaryButtonText : colors.textPrimary,
          fontWeight: '800',
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    state: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
    heading: { color: colors.textPrimary, fontSize: 19, fontWeight: '800' },
    label: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
    secondary: { color: colors.textSecondary },
    error: { color: colors.errorText },
    body: { color: colors.textSecondary, fontSize: 13, lineHeight: 20 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    positionRow: {
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingVertical: 5,
    },
    actions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  });
}
