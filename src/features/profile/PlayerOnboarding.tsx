import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
  type ScrollViewInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';

import { useAuth } from '@/auth/AuthProvider';
import { AuthButton, AuthFeedback } from '@/components/auth/AuthPage';
import { useReducedMotion } from '@/components/motion';
import { useToast } from '@/components/toast/ToastProvider';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import { PlayerCardArt, cardThemes } from './PlayerCardShareModal';
import {
  FootGlyph,
  footShort,
  isFormat,
  isPosition,
  isSkillLevel,
  isStrongFoot,
  levelLabel,
  positionLabel,
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
  type Format,
  type Position,
  type ProfileInput,
} from './profile-validation';
import { getProfileBundle, saveProfile, type AreaRow, type CityRow } from './profile-service';

const ink = '#0c1210';
const stepCount = 4;
/** How much of the card artwork (1024 wide) each step shows: it grows as the card fills in. */
const cardCrop = [880, 880, 1030, 1220, 1469] as const;
const pickable: { position: Exclude<Position, 'any'>; code: string }[] = [
  { position: 'forward', code: 'ST' },
  { position: 'midfielder', code: 'MF' },
  { position: 'defender', code: 'DF' },
  { position: 'goalkeeper', code: 'GK' },
];
const quickNumbers = [7, 8, 9, 10, 11];

/**
 * First-run profile as a step-by-step flow: one question per screen with the player card
 * filling in live above it. Only name, city and area are required; the other steps can be
 * skipped and changed later from the profile.
 */
export function PlayerOnboarding() {
  const { user } = useAuth();
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [cities, setCities] = useState<CityRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [form, setForm] = useState<ProfileInput>(() => emptyForm(locale));
  const [step, setStep] = useState(0);
  const [footPicked, setFootPicked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const controlsScrollRef = useRef<ScrollViewInstance>(null);
  const accent = form.skillLevel ? cardThemes[form.skillLevel].accent : colors.primaryButton;
  const own = useMemo(() => makeStyles(colors, locale, accent), [colors, locale, accent]);
  const areaCityById = useMemo(
    () => new Map(areas.map((area) => [area.id, area.city_id])),
    [areas],
  );
  const visibleAreas = areas.filter((area) => area.city_id === form.cityId);
  const city = cities.find((item) => item.id === form.cityId);
  const area = areas.find((item) => item.id === form.areaId);
  const done = step > stepCount - 1;

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const bundle = await getProfileBundle(user.id);
      setCities(bundle.cities);
      setAreas(bundle.areas);
      setForm({
        displayName: bundle.profile.display_name ?? '',
        // City and area are chosen on the first step, so neither is preselected.
        cityId: bundle.profile.city_id ?? '',
        areaId: bundle.profile.area_id ?? '',
        preferredPosition: isPosition(bundle.profile.preferred_position)
          ? bundle.profile.preferred_position
          : null,
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

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      requestAnimationFrame(() => controlsScrollRef.current?.scrollTo({ y: 0, animated: true }));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      requestAnimationFrame(() => controlsScrollRef.current?.scrollTo({ y: 0, animated: false }));
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const update = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  const days = availabilityDays.filter((day) => form.availabilitySlots.includes(day));
  const legacySlots = form.availabilitySlots.filter(
    (slot) => !availabilityDays.some((day) => day === slot),
  );
  const setDays = (next: readonly AvailabilityDay[]) =>
    update('availabilitySlots', [
      ...legacySlots,
      ...availabilityDays.filter((day) => next.includes(day)),
    ]);
  const setNumber = (value: number) => update('shirtNumber', Math.max(1, Math.min(99, value)));

  // The card pops a little whenever a visual choice changes.
  const [pulse] = useState(() => new Animated.Value(1));
  const pulseKey = `${form.shirtNumber}|${form.preferredPosition}|${form.skillLevel}`;
  const lastPulse = useRef(pulseKey);
  useEffect(() => {
    if (lastPulse.current === pulseKey) return;
    lastPulse.current = pulseKey;
    if (reducedMotion) return;
    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 1.045,
        duration: 140,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(pulse, { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [pulse, pulseKey, reducedMotion]);

  const stepOneReady =
    form.displayName.trim().length >= 2 && Boolean(form.cityId) && Boolean(form.areaId);
  const canContinue =
    step === 0 ? stepOneReady : step === 1 ? Boolean(form.preferredPosition) : true;

  const finish = async (nextForm: ProfileInput) => {
    const validation = validateProfileInput({ ...nextForm, language: locale }, areaCityById);
    if (validation) {
      showToast(copy[validation], 'error');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user.id, { ...nextForm, language: locale });
      setStep(stepCount);
    } catch {
      showToast(copy.profileSaveError, 'error');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!canContinue || saving) return;
    if (step === stepCount - 1) void finish(form);
    else setStep(step + 1);
  };
  const skip = () => {
    if (saving) return;
    if (step === 1) {
      update('preferredPosition', null);
      setStep(2);
    } else if (step === 2) {
      update('skillLevel', null);
      setFootPicked(false);
      update('strongFoot', 'right');
      setStep(3);
    } else if (step === 3) {
      const cleared = { ...form, availabilitySlots: legacySlots, preferredFormats: [] };
      setForm(cleared);
      void finish(cleared);
    }
  };

  if (loading || loadError) {
    return (
      <View style={own.stateRoot}>
        {loading ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={copy.profileLoading}
            style={own.stateCard}
          >
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

  const cityName = city ? (locale === 'en' ? city.name_en : city.name_el) : '';
  const areaName = area ? (locale === 'en' ? area.name_en : area.name_el) : '';
  const crop = cardCrop[Math.min(step, cardCrop.length - 1)];
  const cardName = form.displayName.trim() || copy.wizName;
  const showPill = step >= 1 && Boolean(form.preferredPosition) && form.preferredPosition !== 'any';
  const position = form.preferredPosition ?? 'any';
  const letters = copy.profileDayLettersMonToSun.split(',');
  const horizontalPad = width < 400 ? 16 : 20;

  const card = (
    <FitCard crop={crop} pulse={pulse} label={`${copy.profileShareCardTitle}: ${cardName}`}>
      <PlayerCardArt
        name={cardName}
        location={areaName && cityName ? `${areaName}, ${cityName}` : ''}
        number={form.shirtNumber}
        position={position}
        positionLabel={positionLabel(position, copy)}
        strongFoot={form.strongFoot}
        strongFootLabel={footPicked ? strongFootLabel(form.strongFoot, copy) : '—'}
        skillLevel={form.skillLevel}
        levelLabel={form.skillLevel ? levelLabel(form.skillLevel, copy) : '—'}
        formats={[...form.preferredFormats]}
        days={availabilityDays.map((day) => days.includes(day))}
        dayLetters={letters}
        copy={copy}
        hidePill={!showPill}
      />
    </FitCard>
  );

  if (done) {
    return (
      <View
        style={[
          own.root,
          own.clip,
          {
            paddingTop: Math.max(insets.top, 12) + 4,
            paddingBottom: Math.max(insets.bottom, 12) + 8,
            paddingHorizontal: horizontalPad,
          },
        ]}
      >
        {reducedMotion ? null : (
          <Confetti colors={[accent, colors.primaryButton, '#ffffff', '#8fd8ff']} />
        )}
        <View style={own.column}>
          <Header
            own={own}
            step={stepCount}
            label={copy.wizProgress
              .replace('{step}', String(stepCount))
              .replace('{total}', String(stepCount))}
            onBack={null}
            backLabel={copy.wizBack}
          />
          <View style={own.titleBlock}>
            <Text style={own.kicker}>{copy.wizDoneKicker}</Text>
            <AccentTitle text={copy.wizDoneTitle} own={own} accent={accent} header />
          </View>
          <DoneCard>{card}</DoneCard>
          <View style={own.doneActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/teams/create' as Href)}
              style={({ pressed }) => [own.cta, own.ctaBlock, pressed && own.pressed]}
            >
              <Text style={own.ctaText}>{copy.wizCreateTeam}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.replace('/profile' as Href)}
              style={({ pressed }) => [own.ghost, pressed && own.pressed]}
            >
              <Text style={own.ghostText}>{copy.wizSeeProfile}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const optional = step > 0;
  const ctaLabel =
    step === 0 && !stepOneReady
      ? copy.wizNeedStep1
      : step === 1 && !form.preferredPosition
        ? copy.wizPickPosition
        : step === stepCount - 1
          ? saving
            ? copy.wizSaving
            : copy.wizCreate
          : copy.wizContinue;
  const disabled = !canContinue;

  return (
    <KeyboardAvoidingView
      style={[
        own.root,
        {
          paddingTop: Math.max(insets.top, 12) + 4,
          paddingBottom: Math.max(insets.bottom, 12) + 8,
          paddingHorizontal: horizontalPad,
        },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={own.dismissSurface}>
      <View style={own.column}>
        <Header
          own={own}
          step={step + 1}
          label={copy.wizProgress
            .replace('{step}', String(step + 1))
            .replace('{total}', String(stepCount))}
          onBack={step > 0 ? () => setStep(step - 1) : null}
          backLabel={copy.wizBack}
        />
        <View style={[own.preview, keyboardVisible && own.previewCompact]}>{card}</View>

        <ScrollView
          ref={controlsScrollRef}
          style={own.controlsScroll}
          contentContainerStyle={own.controls}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {step === 0 ? (
            <>
              <View style={own.group}>
                <Text style={own.label}>{copy.wizName.toUpperCase()}</Text>
                <TextInput
                  accessibilityLabel={copy.wizName}
                  value={form.displayName}
                  onChangeText={(value) => update('displayName', value)}
                  maxLength={24}
                  autoComplete="off"
                  autoCorrect={false}
                  placeholder={copy.wizNamePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  style={[own.field, nameFocused && own.fieldFocused]}
                />
              </View>
              <View style={own.group}>
                <Text style={own.label}>{copy.wizNumber.toUpperCase()}</Text>
                <View style={own.numberRow}>
                  <View style={own.stepper}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={copy.wizNumberDown}
                      onPress={() => setNumber(form.shirtNumber - 1)}
                      style={own.stepperButton}
                    >
                      <Text style={own.stepperSign}>−</Text>
                    </Pressable>
                    <Text
                      accessibilityLabel={`${copy.wizNumber} ${form.shirtNumber}`}
                      style={own.stepperValue}
                    >
                      {form.shirtNumber}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={copy.wizNumberUp}
                      onPress={() => setNumber(form.shirtNumber + 1)}
                      style={own.stepperButton}
                    >
                      <Text style={own.stepperSign}>+</Text>
                    </Pressable>
                  </View>
                  <View style={own.quick}>
                    {quickNumbers.map((value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityLabel={`${copy.wizNumber} ${value}`}
                        accessibilityState={{ selected: form.shirtNumber === value }}
                        onPress={() => setNumber(value)}
                        style={[own.quickButton, form.shirtNumber === value && own.on]}
                      >
                        <Text style={[own.quickText, form.shirtNumber === value && own.onText]}>
                          {value}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <View style={own.group}>
                <Text style={own.label}>{copy.wizCity.toUpperCase()}</Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={copy.wizCity}
                  style={own.cityRow}
                >
                  {cities.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: form.cityId === item.id }}
                      aria-checked={form.cityId === item.id}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          cityId: item.id,
                          areaId: current.cityId === item.id ? current.areaId : '',
                        }))
                      }
                      style={[own.cityChip, form.cityId === item.id && own.on]}
                    >
                      <Text
                        style={[own.chipText, form.cityId === item.id && own.onText]}
                        numberOfLines={1}
                      >
                        {locale === 'en' ? item.name_en : item.name_el}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              {form.cityId ? (
                <View style={own.group}>
                  <Text style={own.label}>
                    {copy.wizAreaIn.replace('{city}', cityName).toUpperCase()}
                  </Text>
                  {visibleAreas.length === 0 ? (
                    <Text style={own.muted}>{copy.profileNoAreas}</Text>
                  ) : (
                    <View
                      accessibilityRole="radiogroup"
                      accessibilityLabel={copy.profileArea}
                      style={own.areaRow}
                    >
                      {visibleAreas.map((item) => (
                        <Pressable
                          key={item.id}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: form.areaId === item.id }}
                          aria-checked={form.areaId === item.id}
                          onPress={() => update('areaId', item.id)}
                          style={[own.areaChip, form.areaId === item.id && own.on]}
                        >
                          <Text style={[own.areaText, form.areaId === item.id && own.onText]}>
                            {locale === 'en' ? item.name_en : item.name_el}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
            </>
          ) : null}

          {step === 1 ? (
            <>
              <View style={own.titleBlock}>
                <Text style={own.kicker}>{copy.wizPosKicker}</Text>
                <AccentTitle text={copy.wizPosTitle} own={own} accent={accent} header />
              </View>
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={copy.profilePosition}
                style={own.list}
              >
                {pickable.map(({ position: value, code }) => {
                  const on = form.preferredPosition === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      aria-checked={on}
                      onPress={() => update('preferredPosition', value)}
                      style={[own.row, on && own.rowOn]}
                    >
                      <View style={[own.code, on && own.on]}>
                        <Text style={[own.codeText, on && own.onText]}>{code}</Text>
                      </View>
                      <View style={own.rowText}>
                        <Text style={own.rowTitle}>{positionLabel(value, copy)}</Text>
                        <Text style={own.rowHint}>{copy[positionHints[value]]}</Text>
                      </View>
                      <View style={[own.radio, on && own.radioOn]} />
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <View style={own.titleBlock}>
                <Text style={own.kicker}>{copy.wizStyleKicker}</Text>
                <AccentTitle text={copy.wizStyleTitle} own={own} accent={accent} header />
              </View>
              <View style={own.group}>
                <Text style={own.label}>{copy.profileStrongFoot.toUpperCase()}</Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={copy.profileStrongFoot}
                  style={own.tiles}
                >
                  {strongFeet.map((foot) => {
                    const on = footPicked && form.strongFoot === foot;
                    return (
                      <Pressable
                        key={foot}
                        accessibilityRole="radio"
                        accessibilityLabel={strongFootLabel(foot, copy)}
                        accessibilityState={{ checked: on }}
                        aria-checked={on}
                        onPress={() => {
                          setFootPicked(true);
                          update('strongFoot', foot);
                        }}
                        style={[own.tile, own.tileRow, on && own.on]}
                      >
                        <FootGlyph foot={foot} color={on ? ink : colors.textPrimary} />
                        <Text style={[own.tileText, on && own.onText]}>
                          {footShort(foot, copy)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View style={own.group}>
                <Text style={own.label}>{copy.wizLevelLabel.toUpperCase()}</Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={copy.profileLevel}
                  style={own.tiles}
                >
                  {skillLevels.map((value) => {
                    const on = form.skillLevel === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="radio"
                        accessibilityLabel={levelLabel(value, copy)}
                        accessibilityState={{ checked: on }}
                        aria-checked={on}
                        onPress={() => update('skillLevel', value)}
                        style={[own.tile, on && own.on]}
                      >
                        <Text
                          style={[own.tileText, on && own.onText]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {levelLabel(value, copy)}
                        </Text>
                        <Text
                          style={[own.tileHint, on && own.onText]}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {copy[levelHints[value]]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <View style={own.titleBlock}>
                <Text style={own.kicker}>{copy.wizAvailKicker}</Text>
                <AccentTitle text={copy.wizAvailTitle} own={own} accent={accent} header />
              </View>
              <View style={own.group}>
                <Text style={own.label}>{copy.wizDays.toUpperCase()}</Text>
                <View style={own.dayRow}>
                  {availabilityDays.map((day, index) => {
                    const on = days.includes(day);
                    return (
                      <Pressable
                        key={day}
                        accessibilityRole="checkbox"
                        accessibilityLabel={copy[dayKeysByDay[day]]}
                        accessibilityState={{ checked: on }}
                        aria-checked={on}
                        onPress={() =>
                          setDays(on ? days.filter((item) => item !== day) : [...days, day])
                        }
                        style={[own.day, on && own.on]}
                      >
                        <Text style={[own.dayText, on && own.onText]}>{letters[index] ?? ''}</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={copy.profileAnyDay}
                    accessibilityState={{ checked: days.length === availabilityDays.length }}
                    aria-checked={days.length === availabilityDays.length}
                    onPress={() =>
                      setDays(days.length === availabilityDays.length ? [] : availabilityDays)
                    }
                    style={[own.allPill, days.length === availabilityDays.length && own.on]}
                  >
                    <Text
                      style={[own.allText, days.length === availabilityDays.length && own.onText]}
                    >
                      {copy.wizAll}
                    </Text>
                  </Pressable>
                </View>
              </View>
              <View style={own.group}>
                <Text style={own.label}>{copy.wizFormats.toUpperCase()}</Text>
                <View style={own.formatRow}>
                  {formats.map((size) => {
                    const on = form.preferredFormats.includes(size);
                    return (
                      <Pressable
                        key={size}
                        accessibilityRole="checkbox"
                        accessibilityLabel={`${size}v${size}`}
                        accessibilityState={{ checked: on }}
                        aria-checked={on}
                        onPress={() =>
                          update(
                            'preferredFormats',
                            on
                              ? form.preferredFormats.filter((item) => item !== size)
                              : sortFormats([...form.preferredFormats, size]),
                          )
                        }
                        style={[own.format, on && own.on]}
                      >
                        <Text style={[own.formatText, on && own.onText]}>{`${size}v${size}`}</Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel={copy.profileFormatsAll}
                    accessibilityState={{
                      checked: form.preferredFormats.length === formats.length,
                    }}
                    aria-checked={form.preferredFormats.length === formats.length}
                    onPress={() =>
                      update(
                        'preferredFormats',
                        form.preferredFormats.length === formats.length ? [] : [...formats],
                      )
                    }
                    style={[
                      own.format,
                      own.anyFormat,
                      form.preferredFormats.length === formats.length && own.on,
                    ]}
                  >
                    <Text
                      style={[
                        own.allText,
                        form.preferredFormats.length === formats.length && own.onText,
                      ]}
                    >
                      {copy.wizAny}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={own.footer}>
          {optional ? (
            <Pressable
              accessibilityRole="button"
              onPress={skip}
              disabled={saving}
              style={({ pressed }) => [own.skip, pressed && own.pressed]}
            >
              <Text style={own.skipText}>{copy.wizSkip}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            onPress={next}
            disabled={disabled || saving}
            style={({ pressed }) => [
              own.cta,
              disabled && own.ctaOff,
              pressed && !disabled && own.pressed,
            ]}
          >
            {saving ? (
              <ActivityIndicator color={ink} />
            ) : (
              <Text style={[own.ctaText, disabled && own.ctaTextOff]}>
                {disabled ? ctaLabel : `${ctaLabel}${step < stepCount - 1 ? ' →' : ''}`}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
      </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const positionHints = {
  forward: 'wizPosForwardHint',
  midfielder: 'wizPosMidfielderHint',
  defender: 'wizPosDefenderHint',
  goalkeeper: 'wizPosGoalkeeperHint',
} as const;
const levelHints = {
  beginner: 'wizLevelCasualHint',
  intermediate: 'wizLevelRegularHint',
  advanced: 'wizLevelCompetitiveHint',
} as const;
const dayKeysByDay = {
  mon: 'profileDayMon',
  tue: 'profileDayTue',
  wed: 'profileDayWed',
  thu: 'profileDayThu',
  fri: 'profileDayFri',
  sat: 'profileDaySat',
  sun: 'profileDaySun',
} as const;

function sortFormats(values: Format[]) {
  return formats.filter((size) => values.includes(size));
}

function emptyForm(locale: 'en' | 'el'): ProfileInput {
  return {
    displayName: '',
    cityId: '',
    areaId: '',
    preferredPosition: null,
    skillLevel: null,
    strongFoot: 'right',
    shirtNumber: 8,
    preferredFormats: [],
    availabilitySlots: [],
    maxRadiusKm: 15,
    language: locale,
  };
}

type OwnStyles = ReturnType<typeof makeStyles>;

function Header({
  own,
  step,
  label,
  onBack,
  backLabel,
}: {
  own: OwnStyles;
  step: number;
  label: string;
  onBack: (() => void) | null;
  backLabel: string;
}) {
  return (
    <View style={own.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          onPress={onBack}
          style={own.back}
        >
          <Text style={own.backText}>←</Text>
        </Pressable>
      ) : (
        <View style={[own.back, own.backOff]} />
      )}
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max: stepCount, now: Math.min(step, stepCount) }}
        style={own.bars}
      >
        {Array.from({ length: stepCount }, (_, index) => (
          <View key={index} style={[own.bar, index < step && own.barOn]} />
        ))}
      </View>
      <Text style={own.counter}>{`${Math.min(step, stepCount)}/${stepCount}`}</Text>
    </View>
  );
}

/** A title whose `|marked|` part is drawn in the accent colour. */
function AccentTitle({
  text,
  own,
  accent,
  header = false,
}: {
  text: string;
  own: OwnStyles;
  accent: string;
  header?: boolean;
}) {
  const parts = text.split('|');
  return (
    <Text accessibilityRole={header ? 'header' : undefined} style={own.title}>
      {parts.map((part, index) => (
        <Text key={index} style={index % 2 === 1 ? { color: accent } : undefined}>
          {part}
        </Text>
      ))}
    </Text>
  );
}

/**
 * Draws the first `crop` rows of the card artwork at the largest size that fits the space it
 * is given. The box is measured so the SVG is exactly the card's size and clips what the
 * current step has not reached yet.
 */
function FitCard({
  crop,
  pulse,
  label,
  children,
}: {
  crop: number;
  pulse: Animated.Value;
  label: string;
  children: ReactNode;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const cardWidth = Math.max(Math.min(box.width, (box.height * 1024) / crop), 0);
  const cardHeight = (cardWidth * crop) / 1024;
  return (
    <View
      style={fitStyles.box}
      onLayout={(event) =>
        setBox({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })
      }
    >
      {cardWidth > 0 ? (
        <Animated.View
          style={{ width: cardWidth, height: cardHeight, transform: [{ scale: pulse }] }}
        >
          <Svg
            width={cardWidth}
            height={cardHeight}
            viewBox={`0 0 1024 ${crop}`}
            style={fitStyles.svg}
            accessibilityRole="image"
            accessibilityLabel={label}
          >
            {children}
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const fitStyles = StyleSheet.create({
  box: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  svg: { overflow: 'hidden' },
});

/** The finished card lands from below and then floats gently. */
function DoneCard({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [land] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  const [float] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reducedMotion) {
      land.setValue(1);
      return;
    }
    Animated.timing(land, {
      toValue: 1,
      duration: 800,
      easing: Easing.bezier(0.2, 1.2, 0.4, 1),
      useNativeDriver: true,
    }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, land, reducedMotion]);
  return (
    <Animated.View
      style={[
        doneStyles.card,
        {
          opacity: land,
          transform: [
            {
              translateY: Animated.add(
                land.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }),
                float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }),
              ),
            },
            { scale: land.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            { rotate: land.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '0deg'] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const doneStyles = StyleSheet.create({
  card: { flex: 1, minHeight: 0 },
});

const confettiPieces = Array.from({ length: 40 }, (_, index) => ({
  left: (index * 37) % 97,
  delay: (index % 8) * 110,
  duration: 2400 + ((index * 53) % 1600),
  size: 7 + (index % 3) * 2,
  spin: 360 + (index % 4) * 180,
}));

function Confetti({ colors }: { colors: string[] }) {
  const [progress] = useState(() => confettiPieces.map(() => new Animated.Value(0)));
  const { height } = useWindowDimensions();
  useEffect(() => {
    const animations = progress.map((value, index) =>
      Animated.timing(value, {
        toValue: 1,
        duration: confettiPieces[index].duration,
        delay: confettiPieces[index].delay,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(animations).start();
  }, [progress]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {confettiPieces.map((piece, index) => (
        <Animated.View
          key={index}
          style={{
            position: 'absolute',
            top: -16,
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * 1.5,
            borderRadius: 2,
            backgroundColor: colors[index % colors.length],
            opacity: progress[index].interpolate({
              inputRange: [0, 0.08, 0.85, 1],
              outputRange: [0, 1, 1, 0],
            }),
            transform: [
              {
                translateY: progress[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, height + 40],
                }),
              },
              {
                rotate: progress[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', `${piece.spin}deg`],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  );
}

function makeStyles(
  colors: ReturnType<typeof useAppPreferences>['colors'],
  locale: 'en' | 'el',
  accent: string,
) {
  const body = bodyFont(locale);
  const semibold = bodyFont(locale, 'semibold');
  const display = displayFont(locale);
  // Barlow Condensed has no Greek glyphs, so Greek headings and buttons use Inter instead.
  const heading = locale === 'el' ? semibold : display;
  return StyleSheet.create({
    root: { flex: 1, minHeight: 0, backgroundColor: colors.background },
    clip: { overflow: 'hidden' },
    column: { flex: 1, minHeight: 0, width: '100%', maxWidth: 480, alignSelf: 'center', gap: 10 },
    stateRoot: {
      flex: 1,
      minHeight: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
    stateCard: { width: '100%', maxWidth: 480, gap: 18, alignItems: 'center' },
    muted: { color: colors.textSecondary, fontFamily: body, fontSize: 14 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    back: {
      width: 40,
      height: 40,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backOff: { opacity: 0 },
    backText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 20 },
    bars: { flex: 1, flexDirection: 'row', gap: 6 },
    bar: { flex: 1, height: 5, borderRadius: 9, backgroundColor: colors.border },
    barOn: { backgroundColor: accent },
    counter: {
      color: colors.textSecondary,
      fontFamily: semibold,
      fontSize: 14,
      minWidth: 28,
      textAlign: 'right',
    },
    preview: { flex: 1, minHeight: 120 },
    previewCompact: { flex: 0, height: 72, minHeight: 72 },
    dismissSurface: { flex: 1, minHeight: 0, width: '100%', alignItems: 'center' },
    controlsScroll: { flex: 1, minHeight: 0 },
    controls: { gap: 10, paddingBottom: 8 },
    titleBlock: { gap: 2 },
    kicker: {
      color: accent,
      fontFamily: semibold,
      fontSize: 11,
      letterSpacing: 3,
      fontWeight: '600',
    },
    title: {
      color: colors.textPrimary,
      fontFamily: heading,
      fontSize: locale === 'el' ? 26 : 31,
      lineHeight: 32,
      fontWeight: '800',
    },
    group: { gap: 6 },
    label: {
      color: colors.textSecondary,
      fontFamily: semibold,
      fontSize: 11,
      letterSpacing: 2,
      fontWeight: '600',
    },
    field: {
      height: 50,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      paddingHorizontal: 16,
      color: colors.textPrimary,
      fontFamily: semibold,
      fontSize: 20,
      fontWeight: '600',
    },
    fieldFocused: {
      borderColor: accent,
      shadowColor: accent,
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 0 },
    },
    numberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    stepper: {
      width: 172,
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
    },
    stepperButton: { width: 48, height: '100%', alignItems: 'center', justifyContent: 'center' },
    stepperSign: { color: accent, fontFamily: semibold, fontSize: 25 },
    stepperValue: {
      flex: 1,
      textAlign: 'center',
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 30,
      fontWeight: '800',
    },
    quick: { flex: 1, flexDirection: 'row', gap: 6 },
    quickButton: {
      flex: 1,
      height: 36,
      minWidth: 0,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickText: { color: colors.textSecondary, fontFamily: semibold, fontSize: 13 },
    cityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    cityChip: {
      width: '31%',
      flexGrow: 0,
      height: 38,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 2,
    },
    chipText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 12.5 },
    areaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    areaChip: {
      height: 34,
      paddingHorizontal: 11,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      alignItems: 'center',
      justifyContent: 'center',
    },
    areaText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 12.5 },
    on: { backgroundColor: accent, borderColor: accent },
    onText: { color: ink },
    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      paddingVertical: 11,
      paddingHorizontal: 14,
    },
    rowOn: { borderColor: accent },
    code: {
      minWidth: 48,
      height: 36,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: colors.well,
      alignItems: 'center',
      justifyContent: 'center',
    },
    codeText: { color: accent, fontFamily: semibold, fontSize: 17, fontStyle: 'italic' },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { color: colors.textPrimary, fontFamily: semibold, fontSize: 16 },
    rowHint: { color: colors.textSecondary, fontFamily: body, fontSize: 12 },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.borderStrong,
    },
    radioOn: { backgroundColor: accent, borderColor: accent },
    tiles: { flexDirection: 'row', gap: 8 },
    tile: {
      minHeight: 62,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      paddingHorizontal: 6,
    },
    tileRow: { flexDirection: 'row', gap: 8 },
    tileText: {
      color: colors.textPrimary,
      fontFamily: semibold,
      fontSize: locale === 'el' ? 12 : 15,
    },
    tileHint: {
      color: colors.textSecondary,
      fontFamily: body,
      fontSize: locale === 'el' ? 11 : 12,
    },
    dayRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    day: {
      flex: 1,
      aspectRatio: 1,
      minWidth: 0,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 16 },
    allPill: {
      flex: 1.5,
      height: 42,
      minWidth: 0,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      alignItems: 'center',
      justifyContent: 'center',
    },
    allText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 14 },
    formatRow: { flexDirection: 'row', gap: 6 },
    format: {
      flex: 1,
      height: 54,
      minWidth: 0,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      alignItems: 'center',
      justifyContent: 'center',
    },
    anyFormat: { flex: 1.1 },
    formatText: {
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 17,
      fontWeight: '800',
      fontStyle: 'italic',
    },
    footer: { flexDirection: 'row', gap: 10 },
    skip: {
      height: 54,
      paddingHorizontal: 22,
      borderRadius: 17,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    skipText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 16 },
    cta: {
      flex: 1,
      height: 54,
      borderRadius: 17,
      backgroundColor: accent,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: accent,
      shadowOpacity: 0.4,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    },
    ctaBlock: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto', alignSelf: 'stretch' },
    ctaOff: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
      shadowOpacity: 0,
    },
    ctaText: {
      color: ink,
      fontFamily: heading,
      fontSize: locale === 'el' ? 17 : 22,
      fontWeight: '800',
      fontStyle: locale === 'el' ? 'normal' : 'italic',
    },
    ctaTextOff: {
      color: colors.textSecondary,
      fontFamily: semibold,
      fontSize: 15,
      fontWeight: '600',
      fontStyle: 'normal',
    },
    pressed: { transform: [{ scale: 0.97 }] },
    doneActions: { gap: 8 },
    ghost: {
      height: 48,
      borderRadius: 15,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 16 },
  });
}
