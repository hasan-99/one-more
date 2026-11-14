import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useAuth } from '@/auth/AuthProvider';
import { AuthButton, AuthFeedback } from '@/components/auth/AuthPage';
import { Rise } from '@/components/motion';
import { SegmentedControl } from '@/components/segmented-control';
import { StageBackdrop } from '@/components/stage-backdrop';
import { useToast } from '@/components/toast/ToastProvider';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import {
  AnyPill,
  CalendarIcon,
  CardGradient,
  CardHeader,
  DayButton,
  FootGlyph,
  FootIcon,
  FormatCard,
  Jersey,
  LevelGlyph,
  MiniPitch,
  PinIcon,
  PositionPitch,
  dayKeys,
  footShort,
  isFormat,
  isPosition,
  isSkillLevel,
  isStrongFoot,
  levelLabel,
  makeStyles,
  strongFootLabel,
} from './PlayerProfile';
import {
  availabilityDays,
  formats,
  isAvailabilityValue,
  skillLevels,
  strongFeet,
  validateProfileInput,
  type AvailabilityDay,
  type ProfileInput,
} from './profile-validation';
import { getProfileBundle, saveProfile, type AreaRow, type CityRow } from './profile-service';

/**
 * First-run profile in the same visual language as the player profile: a live shirt
 * on the stage, then cards. Only name and home area are required; the rest is optional
 * and can be changed later from the profile.
 */
export function PlayerOnboarding() {
  const { user } = useAuth();
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Below 600px the tab bar floats over the bottom of the page (as on every screen), and its
  // centre "+" rises above it, so the action bar must leave that room clear.
  const footerBottom = width < 600 ? 98 + Math.max(insets.bottom - 12, 0) : 12;
  const [cities, setCities] = useState<CityRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [form, setForm] = useState<ProfileInput>(() => emptyForm(locale));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const styles = useMemo(() => makeStyles(colors, locale), [colors, locale]);
  const own = useMemo(() => makeOwnStyles(colors, locale), [colors, locale]);
  const areaCityById = useMemo(() => new Map(areas.map((area) => [area.id, area.city_id])), [areas]);
  const visibleAreas = areas.filter((area) => area.city_id === form.cityId);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const bundle = await getProfileBundle(user.id);
      setCities(bundle.cities);
      setAreas(bundle.areas);
      const defaultCity = bundle.cities.find((city) => city.slug === 'nicosia') ?? bundle.cities[0];
      setForm({
        displayName: bundle.profile.display_name ?? '',
        cityId: bundle.profile.city_id ?? defaultCity?.id ?? '',
        // No area is preselected: choosing one is part of the card.
        areaId: bundle.profile.area_id ?? '',
        preferredPosition: isPosition(bundle.profile.preferred_position) ? bundle.profile.preferred_position : null,
        skillLevel: isSkillLevel(bundle.profile.skill_level) ? bundle.profile.skill_level : null,
        strongFoot: isStrongFoot(bundle.profile.strong_foot) ? bundle.profile.strong_foot : 'right',
        shirtNumber: bundle.profile.shirt_number ?? 8,
        preferredFormats: bundle.preferences.preferred_formats.filter(isFormat),
        availabilitySlots: bundle.preferences.availability_slots.filter(isAvailabilityValue),
        maxRadiusKm: bundle.preferences.max_radius_km,
        language: locale,
      });
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [locale, user]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const update = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const ready = form.displayName.trim().length >= 2 && Boolean(form.areaId);

  const submit = async () => {
    const validation = validateProfileInput({ ...form, language: locale }, areaCityById);
    if (validation) {
      showToast(copy[validation], 'error');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user.id, { ...form, language: locale });
      showToast(copy.profileSaveSuccess, 'success');
      router.replace('/profile' as Href);
    } catch {
      showToast(copy.profileSaveError, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadError) {
    return (
      <View style={own.stateRoot}>
        {loading ? (
          <View accessibilityRole="progressbar" accessibilityLabel={copy.profileLoading} style={own.stateCard}>
            <ActivityIndicator color={colors.accentText} />
            <Text style={own.muted}>{copy.profileLoading}</Text>
          </View>
        ) : (
          <View style={own.stateCard}>
            <AuthFeedback>{copy.profileLoadError}</AuthFeedback>
            <AuthButton label={copy.profileRetry} onPress={() => void load()} />
          </View>
        )}
      </View>
    );
  }

  const days = availabilityDays.filter((day) => form.availabilitySlots.includes(day));
  const legacySlots = form.availabilitySlots.filter((slot) => !availabilityDays.some((day) => day === slot));
  const setDays = (next: readonly AvailabilityDay[]) =>
    update('availabilitySlots', [...legacySlots, ...availabilityDays.filter((day) => next.includes(day))]);
  const position = form.preferredPosition ?? 'any';
  const footLabel = strongFootLabel(form.strongFoot, copy);
  const level = form.skillLevel ? levelLabel(form.skillLevel, copy) : copy.profileNoPreference;

  return (
    <View style={own.root}>
      <ScrollView style={own.scroll} contentContainerStyle={own.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={own.hero}>
          <StageBackdrop id="onboarding-stage" colors={colors} height="100%" glowY="62%" glowStop={0.66} glowColor="#21402b" rise={280} variant={1} beamWidth={220} />
          <Rise delay={80} distance={14}>
            <Text accessibilityRole="header" style={own.title}>
              {copy.onboardingTitleLead}
              <Text style={{ color: colors.accentText }}>{copy.onboardingTitleAccent}</Text>
            </Text>
          </Rise>
          <Rise delay={160} distance={14}>
            <Text style={own.subtitle}>{copy.onboardingSubtitle}</Text>
          </Rise>
          <View style={own.jerseyWrap}>
            <Jersey colors={colors} number={form.shirtNumber} name={form.displayName} label={`${copy.profileShirtNumber} ${form.shirtNumber}`} />
          </View>
        </View>

        <Rise delay={200} distance={16} style={styles.card}>
          <CardGradient id="onb-basics" colors={colors} />
          <Text accessibilityRole="header" style={styles.cardTitle}>
            {copy.onboardingBasics}
          </Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{copy.profileDisplayName}</Text>
            <TextInput
              accessibilityLabel={copy.profileDisplayName}
              value={form.displayName}
              onChangeText={(value) => update('displayName', value)}
              maxLength={40}
              autoComplete="off"
              autoCorrect={false}
              placeholder={copy.onboardingNamePlaceholder}
              placeholderTextColor={colors.textMuted}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              style={[own.field, nameFocused && own.fieldFocused]}
            />
            <Text style={styles.muted}>{copy.onboardingNameHint}</Text>
          </View>
          {cities.length > 1 ? (
            <View accessibilityRole="radiogroup" accessibilityLabel={copy.profileCity} style={own.chips}>
              {cities.map((city) => (
                <Chip
                  key={city.id}
                  label={locale === 'en' ? city.name_en : city.name_el}
                  on={form.cityId === city.id}
                  onPress={() => setForm((current) => ({ ...current, cityId: city.id, areaId: '' }))}
                  colors={colors}
                  own={own}
                />
              ))}
            </View>
          ) : null}
          <View style={styles.fieldGroup}>
            <View style={own.labelRow}>
              <PinIcon color={colors.accentText} />
              <Text style={styles.fieldLabel}>{copy.profileArea}</Text>
            </View>
            {visibleAreas.length === 0 ? (
              <Text style={styles.muted}>{copy.profileNoAreas}</Text>
            ) : (
              <View accessibilityRole="radiogroup" accessibilityLabel={copy.profileArea} style={own.chips}>
                {visibleAreas.map((area) => (
                  <Chip
                    key={area.id}
                    label={locale === 'en' ? area.name_en : area.name_el}
                    on={form.areaId === area.id}
                    onPress={() => update('areaId', area.id)}
                    colors={colors}
                    own={own}
                  />
                ))}
              </View>
            )}
          </View>
        </Rise>

        <Rise delay={260} distance={16} style={styles.card}>
          <CardGradient id="onb-where" colors={colors} />
          <CardHeader
            icon={<PinIcon color={colors.accentText} />}
            title={copy.profileWhereYouPlay}
            subtitle={copy.profileWhereYouPlayHint}
            trailing={<Text style={own.optional}>{copy.profileOptional.toUpperCase()}</Text>}
            styles={styles}
          />
          <PositionPitch
            colors={colors}
            copy={copy}
            locale={locale}
            position={position}
            number={form.shirtNumber}
            onSelect={(value) => update('preferredPosition', value)}
          />
        </Rise>

        <Rise delay={320} distance={16} style={styles.card}>
          <CardGradient id="onb-style" colors={colors} />
          <CardHeader
            icon={<FootIcon color={colors.accentText} />}
            title={copy.profilePlayStyle}
            subtitle={copy.profileStyleSummary.replace('{foot}', footLabel).replace('{level}', level)}
            trailing={<Text style={own.optional}>{copy.profileOptional.toUpperCase()}</Text>}
            styles={styles}
          />
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{copy.profileStrongFoot}</Text>
            <SegmentedControl
              tall
              label={copy.profileStrongFoot}
              index={strongFeet.indexOf(form.strongFoot)}
              options={strongFeet.map((foot) => ({
                key: foot,
                label: footShort(foot, copy),
                accessibilityLabel: strongFootLabel(foot, copy),
                icon: (tint) => <FootGlyph foot={foot} color={tint} />,
                onPress: () => update('strongFoot', foot),
              }))}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>{copy.profileLevel}</Text>
            <SegmentedControl
              tall
              label={copy.profileLevel}
              index={form.skillLevel ? skillLevels.indexOf(form.skillLevel) : -1}
              options={skillLevels.map((value, index) => ({
                key: value,
                label: levelLabel(value, copy),
                icon: (tint) => <LevelGlyph bars={index + 1} color={tint} />,
                onPress: () => update('skillLevel', value),
              }))}
            />
          </View>
        </Rise>

        <Rise delay={380} distance={16} style={styles.card}>
          <CardGradient id="onb-days" colors={colors} />
          <CardHeader
            icon={<CalendarIcon color={colors.accentText} />}
            title={copy.profileWhenYouPlay}
            subtitle={
              days.length === availabilityDays.length
                ? copy.profileDaysAll
                : days.length === 0
                  ? copy.profileDaysNone
                  : days.length === 1
                    ? copy.profileDaysOne
                    : copy.profileDaysCount.replace('{count}', String(days.length))
            }
            trailing={
              <AnyPill
                label={copy.profileAnyDay}
                on={days.length === availabilityDays.length}
                onPress={() => setDays(days.length === availabilityDays.length ? [] : availabilityDays)}
                colors={colors}
                styles={styles}
              />
            }
            styles={styles}
          />
          <View style={styles.days}>
            {availabilityDays.map((day, index) => (
              <DayButton
                key={day}
                letter={copy.profileDayLettersMonToSun.split(',')[index] ?? ''}
                label={copy[dayKeys[day]]}
                on={days.includes(day)}
                onPress={() => setDays(days.includes(day) ? days.filter((item) => item !== day) : [...days, day])}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        </Rise>

        <Rise delay={440} distance={16} style={styles.card}>
          <CardGradient id="onb-formats" colors={colors} />
          <CardHeader
            icon={<MiniPitch color={colors.accentText} width={20} height={20} />}
            title={copy.profileFormatsTitle}
            subtitle={
              form.preferredFormats.length === formats.length
                ? copy.profileFormatsAll
                : form.preferredFormats.length === 0
                  ? copy.profileFormatsNone
                  : formats
                      .filter((value) => form.preferredFormats.includes(value))
                      .map((value) => `${value}v${value}`)
                      .join(', ')
            }
            trailing={
              <AnyPill
                label={copy.profileAnyFormat}
                on={form.preferredFormats.length === formats.length}
                onPress={() => update('preferredFormats', form.preferredFormats.length === formats.length ? [] : [...formats])}
                colors={colors}
                styles={styles}
              />
            }
            styles={styles}
          />
          <View style={styles.formats}>
            {formats.map((value) => (
              <FormatCard
                key={value}
                format={value}
                players={copy.profileFormatPlayers.replace('{count}', String(value * 2))}
                on={form.preferredFormats.includes(value)}
                onPress={() =>
                  update(
                    'preferredFormats',
                    form.preferredFormats.includes(value)
                      ? form.preferredFormats.filter((item) => item !== value)
                      : formats.filter((item) => item === value || form.preferredFormats.includes(item)),
                  )
                }
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        </Rise>
      </ScrollView>

      <View style={[own.footer, { paddingBottom: footerBottom }]}>
        {ready ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: saving, disabled: saving }}
            disabled={saving}
            onPress={() => void submit()}
            style={({ pressed }) => [own.cta, { opacity: saving ? 0.7 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
          >
            <Svg width="100%" height="100%" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="onb-cta" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#e9ff8a" />
                  <Stop offset="1" stopColor="#b6f21f" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#onb-cta)" />
            </Svg>
            {saving ? <ActivityIndicator color={colors.primaryButtonText} /> : null}
            <Text style={own.ctaText}>{saving ? copy.profileSaving : copy.onboardingCreate}</Text>
          </Pressable>
        ) : (
          <View accessibilityRole="button" accessibilityState={{ disabled: true }} aria-disabled style={own.ctaOff}>
            <Text style={own.ctaOffText}>{copy.onboardingNeed}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function Chip({
  label,
  on,
  onPress,
  colors,
  own,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  own: ReturnType<typeof makeOwnStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      aria-checked={on}
      onPress={onPress}
      style={({ pressed }) => [
        own.chip,
        on && { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
        { transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      <Text style={[own.chipText, on && { color: colors.primaryButtonText }]}>{label}</Text>
    </Pressable>
  );
}

function emptyForm(language: 'en' | 'el'): ProfileInput {
  return {
    displayName: '',
    cityId: '',
    areaId: '',
    preferredPosition: null,
    skillLevel: null,
    strongFoot: 'right',
    shirtNumber: 8,
    preferredFormats: [5, 7],
    availabilitySlots: [],
    maxRadiusKm: null,
    language,
  };
}

function makeOwnStyles(colors: ReturnType<typeof useAppPreferences>['colors'], locale: 'en' | 'el') {
  const body = bodyFont(locale);
  const semibold = bodyFont(locale, 'semibold');
  const display = displayFont(locale);
  return StyleSheet.create({
    root: { flex: 1, minHeight: 0, backgroundColor: colors.background },
    stateRoot: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
    stateCard: { width: '100%', maxWidth: 480, gap: 18, alignItems: 'center' },
    muted: { color: colors.textSecondary, fontFamily: body, fontSize: 14 },
    scroll: { flex: 1, minHeight: 0 },
    content: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 16, paddingBottom: 24 },
    hero: { overflow: 'hidden', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingTop: 22, paddingBottom: 18 },
    title: { color: colors.textPrimary, fontFamily: display, fontSize: locale === 'el' ? 34 : 40, lineHeight: locale === 'el' ? 38 : 40, fontWeight: '800', textAlign: 'center' },
    subtitle: { color: colors.textSecondary, fontFamily: body, fontSize: 15, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
    jerseyWrap: { marginTop: 4, marginBottom: -8 },
    field: {
      height: 54,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      paddingHorizontal: 14,
      color: colors.textPrimary,
      fontFamily: semibold,
      fontSize: 18,
      fontWeight: '600',
    },
    fieldFocused: { borderColor: colors.accentText, shadowColor: colors.primaryButton, shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      minHeight: 44,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
    },
    chipText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 15, fontWeight: '600' },
    optional: {
      color: colors.textMuted,
      fontFamily: semibold,
      fontSize: 11,
      letterSpacing: 1.6,
      borderWidth: 1,
      borderColor: colors.optionBorder,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    footer: {
      flexShrink: 0,
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.navBorder,
      backgroundColor: colors.navBar,
    },
    cta: {
      height: 54,
      borderRadius: 16,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },
    ctaText: { color: colors.primaryButtonText, fontFamily: 'Barlow_800ExtraBoldItalic', fontSize: 21, fontWeight: '800' },
    ctaOff: {
      height: 54,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },
    ctaOffText: { color: colors.textSecondary, fontFamily: semibold, fontSize: 15, fontWeight: '600' },
  });
}
