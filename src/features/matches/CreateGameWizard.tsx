import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAuth } from '@/auth/AuthProvider';
import { useLoop } from '@/components/motion';
import { StageBackdrop } from '@/components/stage-backdrop';
import { useToast } from '@/components/toast/ToastProvider';
import { getProfileBundle } from '@/features/profile/profile-service';
import { translations, type Locale } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import type { ThemeColors } from '@/theme/tokens';

import {
  countPublishedNotifications,
  loadMatchFilters,
  saveMatch,
  type MatchArea,
  type MatchCity,
} from './match-service';
import { cyprusDateTimeToIso } from './match-validation';

type Copy = { [Key in keyof typeof translations.en]: string };
type Styles = ReturnType<typeof makeStyles>;

const sizes = [5, 8, 11] as const;
const durations = [60, 90, 120] as const;
const prices = [0, 5, 10, 15, 20] as const;
/** Evening kick-offs: 6 PM to midnight. Hour 0 is midnight at the end of the chosen day. */
const hours = [18, 19, 20, 21, 22, 23, 0] as const;
const minutes = [0, 15, 30, 45] as const;
const stepCount = 5;

const names: Record<Locale, string[]> = {
  en: [
    'Thunder Night',
    'Golden Boots',
    'Derby Day',
    'Midnight Strikers',
    'Friday Lights',
    'Last Whistle',
    'Street Kings',
    'Green Machine',
    'Hat-trick Hunt',
    'Full Time FC',
  ],
  el: [
    'Βραδιά Κεραυνών',
    'Χρυσά Παπούτσια',
    'Ντέρμπι',
    'Επιθετικοί Μεσάνυχτα',
    'Φώτα Παρασκευής',
    'Τελευταίος Σφυρίγματος',
    'Βασιλιάδες Γηπέδου',
    'Πράσινη Μηχανή',
    'Χατ-τρικ',
    'Τελική Σφυρίχτρα',
  ],
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** "YYYY-MM-DDTHH:mm" wall-clock text for the chosen day, hour and minute. */
function wallClock(day: Date, hour: number, minute: number) {
  const date = hour === 0 ? addDays(day, 1) : day;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:${pad(minute)}`;
}

function hourLabel(hour: number, locale: Locale) {
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  const suffix =
    locale === 'el'
      ? hour >= 12 && hour < 24
        ? 'μ.μ.'
        : 'π.μ.'
      : hour >= 12 && hour < 24
        ? 'PM'
        : 'AM';
  return `${twelve} ${suffix}`;
}

function dayPartKey(
  hour: number,
): 'gameWizSunset' | 'gameWizEvening' | 'gameWizNight' | 'gameWizMidnight' {
  if (hour < 20) return 'gameWizSunset';
  if (hour < 22) return 'gameWizEvening';
  if (hour === 0) return 'gameWizMidnight';
  return 'gameWizNight';
}

export function CreateGameWizard() {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale] as Copy;
  const { user } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState(() => pickName(locale));
  const [size, setSize] = useState<(typeof sizes)[number]>(5);
  const [day, setDay] = useState(() => addDays(startOfDay(new Date()), 1));
  const [month, setMonth] = useState(() => {
    const tomorrow = addDays(startOfDay(new Date()), 1);
    return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1);
  });
  const [hour, setHour] = useState(21);
  const [minute, setMinute] = useState(0);
  const [duration, setDuration] = useState<(typeof durations)[number]>(90);
  const [sheet, setSheet] = useState<'hour' | 'minute' | null>(null);
  const [cityId, setCityId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [venue, setVenue] = useState('');
  const [need, setNeed] = useState(4);
  const [price, setPrice] = useState<number>(10);
  const [catalog, setCatalog] = useState<{ cities: MatchCity[]; areas: MatchArea[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<{ id: string; notified: number | null } | null>(null);

  const total = size * 2;
  const cityAreas = useMemo(
    () => catalog?.areas.filter((area) => area.city_id === cityId) ?? [],
    [catalog, cityId],
  );
  const city = catalog?.cities.find((item) => item.id === cityId) ?? null;
  const area = cityAreas.find((item) => item.id === areaId) ?? null;
  const cityName = (item: MatchCity) => (locale === 'el' ? item.name_el : item.name_en);
  const areaName = (item: MatchArea) => (locale === 'el' ? item.name_el : item.name_en);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const filters = await loadMatchFilters();
      setCatalog(filters);
      if (user) {
        // The player's own city and area are a sensible start; both stay editable. They arrive
        // in the background so the steps are never held up by the profile request.
        void getProfileBundle(user.id)
          .then((bundle) => {
            const profileCity = bundle.profile.city_id;
            const profileArea = bundle.profile.area_id;
            if (!profileCity || !filters.cities.some((item) => item.id === profileCity)) return;
            setCityId((current) => current || profileCity);
            if (profileArea && filters.areas.some((item) => item.id === profileArea)) {
              setAreaId((current) => current || profileArea);
            }
          })
          .catch(() => undefined);
      }
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const changeSize = (next: (typeof sizes)[number]) => {
    setSize(next);
    setNeed((current) => Math.min(current, next * 2));
  };

  const canNext = step === 0 ? title.trim().length >= 3 : step === 2 ? Boolean(area) : true;

  const submit = async (status: 'draft' | 'published') => {
    const startsAt = cyprusDateTimeToIso(wallClock(day, hour, minute));
    if (title.trim().length < 3 || !city || !area) {
      showToast(copy.matchValidationFields, 'error');
      return;
    }
    if (!startsAt || new Date(startsAt) <= new Date()) {
      showToast(copy.gameWizPastTime, 'error');
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      const open = Math.max(0, Math.min(need, total));
      const id = await saveMatch({
        title: title.trim(),
        sideSize: size,
        cityId: city.id,
        areaId: area.id,
        venueName: venue.trim().length >= 2 ? venue.trim() : areaName(area),
        venueAddress: `${areaName(area)}, ${cityName(city)}`,
        startsAt,
        durationMinutes: duration,
        skillLevel: '',
        priceEur: price,
        // Everyone who is not "needed" is already playing: they take reserved places.
        reservedGuestSlots: total - open,
        notes: '',
        eventStatus: status,
        bookingStatus: 'not_booked',
        waitlistOfferMinutes: 15,
        positions: Array.from({ length: open }, (_, index) => ({
          position: 'any',
          x_pct: 15 + Math.round((70 * (index + 0.5)) / Math.max(open, 1)),
          y_pct: 50,
        })),
        booking: { organizer_notes: '', reference: '' },
      });
      if (status === 'published') {
        // The count is a nice-to-have: a failure here must not hide the celebration.
        const notified = await countPublishedNotifications(id).catch(() => null);
        setDone({ id, notified });
      } else {
        showToast(copy.matchCreateSuccess, 'success');
        router.replace(`/matches/${id}` as Href);
      }
    } catch {
      showToast(copy.matchSaveError, 'error');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!canNext || saving) return;
    if (step < stepCount - 1) setStep(step + 1);
    else void submit('published');
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/home' as Href));
  const stepLabel = copy.gameWizStep
    .replace('{step}', String(step + 1))
    .replace('{total}', String(stepCount));
  const startDate = day;
  const hourText = pad(hour);
  const minuteText = pad(minute);
  const timeText = `${hourText}:${minuteText}`;

  const ticketProps = {
    title,
    size,
    day: startDate,
    time: timeText,
    duration,
    areaLabel: area ? areaName(area) : copy.gameWizAreaPending,
    cityLabel: city ? cityName(city) : '',
    need,
    price,
    locale,
    copy,
    styles,
  };

  return (
    <View style={styles.root}>
      <StageBackdrop id="game-stage" colors={colors} height={260 + insets.top} />
      <KeyboardAvoidingView
        style={styles.frame}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.gameWizClose}
            onPress={close}
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
            {copy.appCreateTitle}
          </Text>
          <Text style={styles.stepLabel}>{stepLabel}</Text>
        </View>
        <View accessibilityElementsHidden style={styles.bars}>
          {Array.from({ length: stepCount }, (_, index) => (
            <View key={index} style={[styles.bar, index <= step && styles.barOn]} />
          ))}
        </View>

        <MatchTicket {...ticketProps} mini={step === 1} />

        <ScrollView
          nativeID="game-create-step"
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <Text accessibilityRole="progressbar" style={styles.hint}>
              {copy.gameWizLoading}
            </Text>
          ) : loadFailed || !catalog ? (
            <View style={styles.block}>
              <Text accessibilityRole="alert" style={styles.hint}>
                {copy.matchLoadError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void load()}
                style={styles.softButton}
              >
                <Text style={styles.softButtonText}>{copy.matchRetry}</Text>
              </Pressable>
            </View>
          ) : step === 0 ? (
            <>
              <Text accessibilityRole="header" style={styles.stepTitle}>
                {copy.gameWizS1Title}
              </Text>
              <Text style={styles.hint}>{copy.gameWizS1Hint}</Text>
              <TextInput
                accessibilityLabel={copy.gameWizNameLabel}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                autoCorrect={false}
                returnKeyType="done"
                style={styles.field}
              />
              <Text style={styles.fieldNote}>{copy.gameWizNameHint}</Text>
              <View accessibilityRole="radiogroup" style={styles.row}>
                {sizes.map((value) => (
                  <Choice
                    key={value}
                    label={`${value}v${value}`}
                    selected={size === value}
                    onPress={() => changeSize(value)}
                    styles={styles}
                  />
                ))}
              </View>
            </>
          ) : step === 1 ? (
            <>
              <Calendar
                day={day}
                month={month}
                locale={locale}
                onDay={setDay}
                onMonth={setMonth}
                copy={copy}
                styles={styles}
              />
              <View style={styles.timeCards}>
                <TimeCard
                  label={copy.gameWizHour}
                  value={hourText}
                  note={hourLabel(hour, locale)}
                  active={sheet === 'hour'}
                  onPress={() => setSheet('hour')}
                  styles={styles}
                />
                <Text style={styles.timeColon}>:</Text>
                <TimeCard
                  label={copy.gameWizMinutes}
                  value={minuteText}
                  note={copy[dayPartKey(hour)]}
                  active={sheet === 'minute'}
                  onPress={() => setSheet('minute')}
                  styles={styles}
                />
              </View>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={copy.gameWizLength}
                style={styles.row}
              >
                {durations.map((value) => (
                  <Choice
                    key={value}
                    label={copy.gameWizMin.replace('{n}', String(value))}
                    selected={duration === value}
                    onPress={() => setDuration(value)}
                    styles={styles}
                  />
                ))}
              </View>
            </>
          ) : step === 2 ? (
            <>
              <Text accessibilityRole="header" style={styles.stepTitle}>
                {copy.gameWizS3Title}
              </Text>
              <Text style={styles.hint}>{copy.gameWizS3Hint}</Text>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={copy.matchCity}
                style={styles.row}
              >
                {catalog.cities.map((item) => (
                  <Choice
                    key={item.id}
                    label={cityName(item)}
                    selected={cityId === item.id}
                    onPress={() => {
                      setCityId(item.id);
                      setAreaId('');
                    }}
                    styles={styles}
                    third
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>{copy.matchArea}</Text>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={copy.matchArea}
                style={styles.row}
              >
                {cityAreas.map((item) => (
                  <Choice
                    key={item.id}
                    label={areaName(item)}
                    selected={areaId === item.id}
                    onPress={() => setAreaId(item.id)}
                    styles={styles}
                    half
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>{copy.gameWizVenue}</Text>
              <TextInput
                accessibilityLabel={copy.gameWizVenue}
                value={venue}
                onChangeText={setVenue}
                maxLength={100}
                placeholder={copy.gameWizVenuePlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={styles.field}
              />
            </>
          ) : step === 3 ? (
            <>
              <Text accessibilityRole="header" style={styles.stepTitle}>
                {copy.gameWizS4Title}
              </Text>
              <Text style={styles.hint}>{copy.gameWizS4Hint}</Text>
              <Text style={styles.fieldLabel}>{copy.gameWizNeedLabel}</Text>
              <View style={styles.needCard}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.gameWizNeedLess}
                  disabled={need <= 1}
                  onPress={() => setNeed((value) => Math.max(1, value - 1))}
                  style={[styles.stepper, need <= 1 && { opacity: 0.4 }]}
                >
                  <Text style={styles.stepperText}>−</Text>
                </Pressable>
                <View style={styles.needCopy} accessibilityLiveRegion="polite">
                  <Text style={styles.needNumber}>{need}</Text>
                  <Text style={styles.needNote}>
                    {copy.gameWizNeedOpen.replace('{total}', String(total))}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={copy.gameWizNeedMore}
                  disabled={need >= total}
                  onPress={() => setNeed((value) => Math.min(total, value + 1))}
                  style={[styles.stepper, need >= total && { opacity: 0.4 }]}
                >
                  <Text style={styles.stepperText}>+</Text>
                </Pressable>
              </View>
              <View style={styles.dots}>
                {Array.from({ length: total }, (_, index) => (
                  <View
                    key={index}
                    style={[styles.dotBar, index < total - need ? styles.dotIn : styles.dotOpen]}
                  />
                ))}
              </View>
              <View style={styles.legend}>
                <Text style={styles.legendText}>
                  {copy.gameWizPlaying.replace('{n}', String(total - need))}
                </Text>
                <Text style={styles.legendText}>
                  {copy.gameWizMissing.replace('{n}', String(need))}
                </Text>
              </View>
              <Text style={styles.fieldLabel}>{copy.gameWizPriceLabel}</Text>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={copy.gameWizPriceLabel}
                style={styles.row}
              >
                {prices.map((value) => (
                  <Choice
                    key={value}
                    label={value ? `€${value}` : copy.gameWizFree}
                    selected={price === value}
                    onPress={() => setPrice(value)}
                    styles={styles}
                    fifth
                  />
                ))}
              </View>
            </>
          ) : (
            <>
              <Text accessibilityRole="header" style={styles.stepTitle}>
                {copy.gameWizS5Title}
              </Text>
              <Text style={styles.hint}>{copy.gameWizS5Hint}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => void submit('draft')}
                style={[styles.softButton, saving && { opacity: 0.55 }]}
              >
                <Text style={styles.softButtonText}>{copy.gameWizDraft}</Text>
              </Pressable>
              <Text style={styles.centerNote}>{copy.gameWizApproval}</Text>
            </>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep(step - 1)}
              style={styles.back}
            >
              <Text style={styles.backText}>{copy.teamWizardBack}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={!canNext || saving || loading || loadFailed}
            onPress={next}
            style={({ pressed }) => [
              styles.next,
              (!canNext || saving || loading || loadFailed) && { opacity: 0.5 },
              pressed && { opacity: 0.88 },
            ]}
          >
            <Text style={styles.nextText}>
              {step === stepCount - 1
                ? saving
                  ? copy.matchSaving
                  : copy.gameWizPublish
                : step === 2 && !area
                  ? copy.gameWizPickArea
                  : `${copy.teamWizardNext}  →`}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {done ? (
        <Celebration
          notified={done.notified}
          copy={copy}
          styles={styles}
          ticket={<MatchTicket {...ticketProps} mini={false} />}
          onView={() => router.replace(`/matches/${done.id}` as Href)}
          onShare={() =>
            void Share.share({
              message: copy.gameWizShareMessage.replace('{title}', title.trim()),
            }).catch(() => undefined)
          }
        />
      ) : null}
      <TimeSheet
        kind={sheet}
        hour={hour}
        minute={minute}
        locale={locale}
        copy={copy}
        styles={styles}
        onClose={() => setSheet(null)}
        onHour={(value) => {
          setHour(value);
          setSheet('minute');
        }}
        onMinute={(value) => {
          setMinute(value);
          setSheet(null);
        }}
      />
    </View>
  );
}

const confettiColors = ['#cfff4a', '#f2f5ec', '#5cc8ff', '#ffa94d', '#ff8fc0'];

function Celebration({
  notified,
  copy,
  styles,
  ticket,
  onView,
  onShare,
}: {
  notified: number | null;
  copy: Copy;
  styles: Styles;
  ticket: ReactNode;
  onView: () => void;
  onShare: () => void;
}) {
  const { height } = useWindowDimensions();
  const [drop] = useState(() => new Animated.Value(0));
  const [rise] = useState(() => new Animated.Value(0));
  const [stamp] = useState(() => new Animated.Value(0));
  const [pieces] = useState(() =>
    Array.from({ length: 36 }, (_, index) => ({
      left: Math.random() * 100,
      color: confettiColors[index % confettiColors.length] ?? '#cfff4a',
      delay: Math.random() * 700,
      duration: 2200 + Math.random() * 1400,
      spin: 360 + Math.random() * 540,
      value: new Animated.Value(0),
    })),
  );
  useEffect(() => {
    const animations = [
      Animated.spring(drop, { toValue: 1, speed: 6, bounciness: 12, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(450),
        Animated.timing(rise, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(800),
        Animated.spring(stamp, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: true }),
      ]),
      ...pieces.map((piece) =>
        Animated.sequence([
          Animated.delay(piece.delay),
          Animated.timing(piece.value, {
            toValue: 1,
            duration: piece.duration,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    ];
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [drop, rise, stamp, pieces]);
  return (
    <View accessibilityViewIsModal style={styles.celebration}>
      <View pointerEvents="none" style={styles.confetti}>
        {pieces.map((piece, index) => (
          <Animated.View
            key={index}
            style={[
              styles.piece,
              {
                left: `${piece.left}%`,
                backgroundColor: piece.color,
                transform: [
                  {
                    translateY: piece.value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, height + 20],
                    }),
                  },
                  {
                    rotate: piece.value.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${piece.spin}deg`],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Animated.View
        style={{
          opacity: drop,
          transform: [
            { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-280, 0] }) },
            { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['-8deg', '0deg'] }) },
          ],
        }}
      >
        {ticket}
        <Animated.View
          style={[
            styles.stamp,
            {
              opacity: stamp,
              transform: [
                { rotate: '12deg' },
                { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) },
              ],
            },
          ]}
        >
          <Text style={styles.stampText}>{copy.gameWizPublished}</Text>
        </Animated.View>
      </Animated.View>
      <Animated.View
        style={[
          styles.celebrationCopy,
          {
            opacity: rise,
            transform: [
              { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
            ],
          },
        ]}
      >
        <Text accessibilityRole="header" style={styles.celebrationTitle}>
          {copy.gameWizDoneTitle}
        </Text>
        <Text style={styles.celebrationBody}>{copy.gameWizDoneBody}</Text>
        <View accessibilityLiveRegion="polite" style={styles.notifiedPill}>
          <Text style={styles.notifiedNumber}>{notified ?? '–'}</Text>
          <Text style={styles.notifiedLabel}>
            {notified === 0 ? copy.gameWizNotifiedNone : copy.gameWizNotified}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onView}
          style={[styles.next, { flexShrink: 0, flexGrow: 0, minHeight: 52 }]}
        >
          <Text style={styles.nextText}>{copy.gameWizViewGame}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onShare}
          style={[styles.softButton, { flexShrink: 0 }]}
        >
          <Text style={styles.softButtonText}>{copy.gameWizShare}</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function pickName(locale: Locale) {
  const list = names[locale];
  return list[Math.floor(Math.random() * list.length)] ?? '';
}

function Choice({
  label,
  selected,
  onPress,
  styles,
  third = false,
  half = false,
  fifth = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: Styles;
  third?: boolean;
  half?: boolean;
  fifth?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        third && styles.choiceThird,
        half && styles.choiceHalf,
        fifth && styles.choiceFifth,
        selected && styles.choiceOn,
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <Text numberOfLines={1} style={[styles.choiceText, selected && styles.choiceTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}

function TimeCard({
  label,
  value,
  note,
  active,
  onPress,
  styles,
}: {
  label: string;
  value: string;
  note: string;
  active: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}, ${note}`}
      onPress={onPress}
      style={[styles.timeCard, active && styles.timeCardOn]}
    >
      <Text style={styles.timeLabel}>{label.toUpperCase()}</Text>
      <View style={styles.timeValueRow}>
        <Text style={[styles.timeValue, active && styles.timeValueOn]}>{value}</Text>
        <Text style={styles.timeNote}>{note}</Text>
      </View>
      <Text style={styles.timeCaret}>▾</Text>
    </Pressable>
  );
}

function Calendar({
  day,
  month,
  locale,
  onDay,
  onMonth,
  copy,
  styles,
}: {
  day: Date;
  month: Date;
  locale: Locale;
  onDay: (value: Date) => void;
  onMonth: (value: Date) => void;
  copy: Copy;
  styles: Styles;
}) {
  const today = startOfDay(new Date());
  const tag = locale === 'el' ? 'el-GR' : 'en-GB';
  const monthTitle = new Intl.DateTimeFormat(tag, { month: 'long', year: 'numeric' }).format(month);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(tag, { weekday: 'narrow' }).format(new Date(2026, 10, 2 + index)),
  );
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: count }, (_, index) => index + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const canGoBack = month > new Date(today.getFullYear(), today.getMonth(), 1);
  return (
    <View style={styles.calendar}>
      <View style={styles.calHead}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.gameWizPrevMonth}
          disabled={!canGoBack}
          onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          style={[styles.calArrow, !canGoBack && { opacity: 0.35 }]}
        >
          <Text style={styles.calArrowText}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.calTitle}>
          {monthTitle}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.gameWizNextMonth}
          onPress={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          style={styles.calArrow}
        >
          <Text style={styles.calArrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.calWeek}>
        {weekdays.map((label, index) => (
          <Text key={index} style={styles.calWeekday}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.calGrid}>
        {cells.map((value, index) => {
          if (!value) return <View key={index} style={styles.calCell} />;
          const date = new Date(month.getFullYear(), month.getMonth(), value);
          const past = date < today;
          const selected = date.getTime() === day.getTime();
          const isToday = date.getTime() === today.getTime();
          return (
            <Pressable
              key={index}
              accessibilityRole="button"
              accessibilityLabel={new Intl.DateTimeFormat(tag, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              }).format(date)}
              accessibilityState={{ disabled: past, selected }}
              disabled={past}
              onPress={() => onDay(date)}
              style={[
                styles.calCell,
                styles.calDay,
                selected && styles.calDayOn,
                isToday && !selected && styles.calToday,
              ]}
            >
              <Text
                style={[styles.calDayText, past && styles.calPast, selected && styles.calDayTextOn]}
              >
                {value}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TimeSheet({
  kind,
  hour,
  minute,
  locale,
  copy,
  styles,
  onClose,
  onHour,
  onMinute,
}: {
  kind: 'hour' | 'minute' | null;
  hour: number;
  minute: number;
  locale: Locale;
  copy: Copy;
  styles: Styles;
  onClose: () => void;
  onHour: (value: number) => void;
  onMinute: (value: number) => void;
}) {
  const [slide] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!kind) return;
    slide.setValue(0);
    const animation = Animated.timing(slide, {
      toValue: 1,
      duration: 260,
      easing: Easing.bezier(0.2, 0.9, 0.3, 1),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [kind, slide]);
  const minuteNotes: Record<number, string> = {
    0: copy.gameWizOnTheHour,
    15: copy.gameWizQuarterPast,
    30: copy.gameWizHalfPast,
    45: copy.gameWizQuarterTo,
  };
  return (
    <Modal
      transparent
      visible={kind !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.sheetRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.gameWizCloseSheet}
          onPress={onClose}
          style={styles.scrim}
        />
        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              transform: [
                { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [360, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.grab} />
          <View style={styles.sheetHead}>
            <Text accessibilityRole="header" style={styles.sheetTitle}>
              {kind === 'hour' ? copy.gameWizHour : copy.gameWizMinutes}
            </Text>
            <Text style={styles.sheetNote}>
              {kind === 'hour'
                ? copy.gameWizHourHint
                : copy.gameWizMinutesHint.replace('{hour}', pad(hour))}
            </Text>
          </View>
          <View accessibilityRole="radiogroup" style={styles.sheetGrid}>
            {kind === 'hour'
              ? hours.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={`${pad(value)} · ${hourLabel(value, locale)}`}
                    accessibilityState={{ checked: hour === value }}
                    aria-checked={hour === value}
                    onPress={() => onHour(value)}
                    style={[
                      styles.sheetOption,
                      styles.sheetFourth,
                      hour === value && styles.sheetOptionOn,
                    ]}
                  >
                    <Text style={[styles.sheetBig, hour === value && styles.sheetBigOn]}>
                      {pad(value)}
                    </Text>
                    <Text style={[styles.sheetSmall, hour === value && styles.sheetSmallOn]}>
                      {hourLabel(value, locale)}
                    </Text>
                  </Pressable>
                ))
              : minutes.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={`:${pad(value)} · ${minuteNotes[value]}`}
                    accessibilityState={{ checked: minute === value }}
                    aria-checked={minute === value}
                    onPress={() => onMinute(value)}
                    style={[
                      styles.sheetOption,
                      styles.sheetHalf,
                      minute === value && styles.sheetOptionOn,
                    ]}
                  >
                    <Text
                      style={[styles.sheetBig, minute === value && styles.sheetBigOn]}
                    >{`:${pad(value)}`}</Text>
                    <Text style={[styles.sheetSmall, minute === value && styles.sheetSmallOn]}>
                      {minuteNotes[value]}
                    </Text>
                  </Pressable>
                ))}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function MatchTicket({
  title,
  size,
  day,
  time,
  duration,
  areaLabel,
  cityLabel,
  need,
  price,
  locale,
  copy,
  styles,
  mini,
}: {
  title: string;
  size: number;
  day: Date;
  time: string;
  duration: number;
  areaLabel: string;
  cityLabel: string;
  need: number;
  price: number;
  locale: Locale;
  copy: Copy;
  styles: Styles;
  mini: boolean;
}) {
  const shine = useLoop(4500, { easing: Easing.inOut(Easing.ease) });
  const tag = locale === 'el' ? 'el-GR' : 'en-GB';
  const weekday = new Intl.DateTimeFormat(tag, { weekday: 'short' }).format(day).toUpperCase();
  const month = new Intl.DateTimeFormat(tag, { month: 'short' }).format(day).toUpperCase();
  const total = size * 2;
  const have = total - need;
  const shownTitle = title.trim() || copy.gameWizNamePlaceholder;
  const label = `${size}v${size} · ${shownTitle} · ${weekday} ${day.getDate()} ${month} ${time} · ${areaLabel}${price ? ` · €${price}` : ` · ${copy.gameWizFree}`}`;
  if (mini) {
    return (
      <View accessible accessibilityLabel={label} style={[styles.ticket, styles.ticketMini]}>
        <TicketBackdrop />
        <Text style={styles.miniFormat}>{`${size}V${size}`}</Text>
        <Text numberOfLines={1} style={styles.miniTitle}>
          {shownTitle.toUpperCase()}
        </Text>
      </View>
    );
  }
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.ticket}>
      <TicketBackdrop />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shine,
          {
            transform: [
              { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-120, 460] }) },
              { skewX: '-18deg' },
            ],
          },
        ]}
      />
      <View style={styles.ticketRow}>
        <View style={styles.ticketMain}>
          <Text style={styles.matchBadge}>{copy.gameWizMatchDay}</Text>
          <View style={styles.formatRow}>
            <Text style={styles.format}>{`${size}v${size}`}</Text>
            <Text
              numberOfLines={1}
              style={[styles.ticketTitle, !title.trim() && { opacity: 0.45 }]}
            >
              {shownTitle}
            </Text>
          </View>
          <Text numberOfLines={1} style={styles.ticketPlace}>
            {`📍 ${areaLabel}${cityLabel ? `, ${cityLabel}` : ''}`}
          </Text>
          <View style={styles.chipRow}>
            <Text
              style={styles.ticketChip}
            >{`⏱ ${copy.gameWizMin.replace('{n}', String(duration))}`}</Text>
            <Text style={[styles.ticketChip, styles.ticketChipHot]}>
              {price ? `€${price}` : copy.gameWizFree}
            </Text>
          </View>
          <View style={styles.needRow}>
            <View style={styles.needDots}>
              {Array.from({ length: total }, (_, index) => (
                <View
                  key={index}
                  style={[styles.needDot, index < have ? styles.needDotIn : styles.needDotOpen]}
                />
              ))}
            </View>
            <Text style={styles.needText}>
              {copy.gameWizTicketNeed} <Text style={styles.needTextHot}>{need}</Text>
            </Text>
          </View>
        </View>
        <View style={styles.perf}>
          <View style={[styles.notch, { top: -9 }]} />
          <View style={[styles.notch, { bottom: -9 }]} />
        </View>
        <View style={styles.stub}>
          <Text style={styles.stubSmall}>{weekday}</Text>
          <Text style={styles.stubDay}>{day.getDate()}</Text>
          <Text style={styles.stubSmall}>{month}</Text>
          <Text style={styles.stubTime}>{time}</Text>
        </View>
      </View>
    </View>
  );
}

function TicketBackdrop() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="ticket-bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#25521f" />
          <Stop offset="0.55" stopColor="#12261a" />
          <Stop offset="1" stopColor="#0b130e" />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#ticket-bg)" />
    </Svg>
  );
}

function makeStyles(colors: ThemeColors) {
  const lime = colors.primaryButton;
  const ink = colors.primaryButtonText;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    celebration: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 20,
      backgroundColor: colors.background,
      justifyContent: 'center',
      paddingHorizontal: 20,
      gap: 18,
    },
    confetti: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' },
    piece: { position: 'absolute', top: 0, width: 9, height: 15, borderRadius: 2 },
    stamp: {
      position: 'absolute',
      right: 8,
      top: -10,
      borderWidth: 3,
      borderColor: '#cfff4a',
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 3,
      backgroundColor: 'rgba(12,18,16,0.85)',
    },
    stampText: { color: '#cfff4a', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
    celebrationCopy: { alignItems: 'stretch', gap: 10, flexShrink: 0 },
    celebrationTitle: {
      color: colors.textPrimary,
      fontSize: 30,
      fontWeight: '900',
      textAlign: 'center',
    },
    celebrationBody: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
    },
    notifiedPill: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(207,255,74,0.4)',
      backgroundColor: 'rgba(207,255,74,0.1)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginVertical: 4,
    },
    notifiedNumber: { color: colors.accentText, fontSize: 30, fontWeight: '900' },
    notifiedLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
    frame: { flex: 1 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 6,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
    headerTitle: { flex: 1, color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
    stepLabel: { color: colors.textSecondary, fontSize: 13 },
    bars: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 4 },
    bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
    barOn: { backgroundColor: lime },
    ticket: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(207,255,74,0.35)',
      overflow: 'hidden',
      backgroundColor: '#0b130e',
    },
    ticketMini: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    miniFormat: { color: '#cfff4a', fontSize: 24, fontWeight: '900' },
    miniTitle: { flex: 1, color: '#ffffff', fontSize: 15, fontWeight: '900', fontStyle: 'italic' },
    shine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: 60,
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    ticketRow: { flexDirection: 'row', alignItems: 'stretch' },
    ticketMain: {
      flex: 1,
      minWidth: 0,
      paddingTop: 14,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 12,
    },
    matchBadge: {
      alignSelf: 'flex-start',
      color: '#cfff4a',
      fontSize: 9.5,
      fontWeight: '900',
      letterSpacing: 1.8,
      borderWidth: 1,
      borderColor: 'rgba(207,255,74,0.5)',
      borderRadius: 7,
      paddingHorizontal: 7,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    formatRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
    format: { color: '#cfff4a', fontSize: 34, lineHeight: 36, fontWeight: '900' },
    ticketTitle: { flex: 1, color: '#ffffff', fontSize: 17, fontWeight: '800' },
    ticketPlace: { marginTop: 8, color: '#d6dccf', fontSize: 12.5 },
    chipRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
    ticketChip: {
      color: '#ffffff',
      backgroundColor: 'rgba(255,255,255,0.12)',
      fontSize: 11,
      fontWeight: '800',
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    ticketChipHot: { backgroundColor: '#cfff4a', color: '#10170f' },
    needRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
    needDots: { flex: 1, flexDirection: 'row', gap: 3 },
    needDot: { flex: 1, height: 6, borderRadius: 3 },
    needDotIn: { backgroundColor: 'rgba(255,255,255,0.18)' },
    needDotOpen: { backgroundColor: '#cfff4a' },
    needText: { color: '#d6dccf', fontSize: 12 },
    needTextHot: { color: '#cfff4a', fontSize: 14, fontWeight: '900' },
    perf: {
      width: 2,
      marginVertical: 10,
      borderLeftWidth: 2,
      borderStyle: 'dashed',
      borderColor: 'rgba(255,255,255,0.2)',
    },
    notch: {
      position: 'absolute',
      left: -9,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.background,
    },
    stub: {
      width: 86,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      backgroundColor: 'rgba(207,255,74,0.08)',
    },
    stubSmall: {
      color: 'rgba(207,255,74,0.85)',
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.6,
    },
    stubDay: { color: '#ffffff', fontSize: 40, lineHeight: 44, fontWeight: '900' },
    stubTime: {
      marginTop: 6,
      color: '#10170f',
      backgroundColor: '#cfff4a',
      fontSize: 15,
      fontWeight: '800',
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    body: { flex: 1, minHeight: 0 },
    bodyContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 8 },
    stepTitle: { color: colors.textPrimary, fontSize: 25, fontWeight: '800' },
    hint: { color: colors.textSecondary, fontSize: 13, marginBottom: 6 },
    block: { gap: 12 },
    field: {
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      paddingHorizontal: 14,
      fontSize: 16,
    },
    fieldNote: { color: colors.textSecondary, fontSize: 12, marginLeft: 4, marginBottom: 6 },
    fieldLabel: { color: colors.textSecondary, fontSize: 13, marginTop: 8 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: {
      flexGrow: 1,
      flexBasis: '28%',
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    choiceThird: { flexBasis: '28%' },
    choiceHalf: { flexBasis: '45%' },
    choiceFifth: { flexBasis: '15%', minHeight: 52 },
    choiceOn: { backgroundColor: lime, borderColor: lime },
    choiceText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
    choiceTextOn: { color: ink },
    softButton: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    softButtonText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
    centerNote: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6 },
    calendar: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 6,
    },
    calHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    calArrow: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calArrowText: { color: colors.textPrimary, fontSize: 20 },
    calTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    calWeek: { flexDirection: 'row' },
    calWeekday: {
      width: `${100 / 7}%`,
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '800',
    },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calCell: { width: `${100 / 7}%`, height: 34, padding: 1 },
    calDay: { alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    calDayOn: { backgroundColor: lime },
    calToday: { borderWidth: 1.5, borderColor: 'rgba(207,255,74,0.4)' },
    calDayText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    calPast: { color: colors.textSecondary, opacity: 0.4 },
    calDayTextOn: { color: ink },
    timeCards: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    timeColon: { color: colors.textSecondary, fontSize: 30, fontWeight: '900' },
    timeCard: {
      flex: 1,
      minHeight: 78,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    timeCardOn: { borderColor: lime, backgroundColor: colors.cardTop },
    timeLabel: {
      color: colors.textSecondary,
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 1.6,
    },
    timeValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
    timeValue: { color: colors.textPrimary, fontSize: 38, lineHeight: 42, fontWeight: '900' },
    timeValueOn: { color: colors.accentText },
    timeNote: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    timeCaret: {
      position: 'absolute',
      right: 12,
      bottom: 8,
      color: colors.textSecondary,
      fontSize: 14,
    },
    needCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 10,
    },
    stepper: {
      width: 60,
      height: 60,
      borderRadius: 16,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperText: { color: colors.textPrimary, fontSize: 28, fontWeight: '700' },
    needCopy: { flex: 1, alignItems: 'center' },
    needNumber: { color: colors.accentText, fontSize: 48, lineHeight: 52, fontWeight: '900' },
    needNote: { color: colors.textSecondary, fontSize: 12 },
    dots: { flexDirection: 'row', gap: 6, marginTop: 10, paddingHorizontal: 4 },
    dotBar: { flex: 1, height: 10, borderRadius: 5 },
    dotIn: { backgroundColor: colors.border },
    dotOpen: { backgroundColor: lime },
    legend: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
    legendText: { color: colors.textSecondary, fontSize: 12 },
    footer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    back: {
      width: 92,
      height: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
    next: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      backgroundColor: lime,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextText: { color: ink, fontSize: 17, fontWeight: '800' },
    sheetRoot: { flex: 1, justifyContent: 'flex-end' },
    scrim: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.65)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderTopWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 30,
    },
    grab: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sheetTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '800' },
    sheetNote: { color: colors.textSecondary, fontSize: 13 },
    sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    sheetOption: {
      height: 74,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetFourth: { flexBasis: '22%', flexGrow: 1 },
    sheetHalf: { flexBasis: '45%', flexGrow: 1 },
    sheetOptionOn: { backgroundColor: lime, borderColor: lime },
    sheetBig: { color: colors.textPrimary, fontSize: 28, fontWeight: '900' },
    sheetBigOn: { color: ink },
    sheetSmall: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
    sheetSmallOn: { color: ink, opacity: 0.7 },
  });
}
