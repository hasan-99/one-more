import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthButton, AuthField, AuthFeedback } from '@/components/auth/AuthPage';
import { AppAction, AppCard, AppPage } from '@/components/layout/AppPage';
import { useToast } from '@/components/toast/ToastProvider';
import { signOut } from '@/features/auth/auth-service';
import { authErrorMessageKey } from '@/features/auth/auth-validation';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { useAuth } from '@/auth/AuthProvider';

import {
  availabilitySlots,
  formats,
  positions,
  skillLevels,
  strongFeet,
  validateProfileInput,
  type AvailabilitySlot,
  type Format,
  type Position,
  type ProfileInput,
  type SkillLevel,
  type StrongFoot,
} from './profile-validation';
import { getProfileBundle, saveProfile, type AreaRow, type CityRow } from './profile-service';

type Props = { onboarding: boolean };

export function ProfileEditor({ onboarding }: Props) {
  const { user } = useAuth();
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const { showToast } = useToast();
  const [cities, setCities] = useState<CityRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [form, setForm] = useState<ProfileInput>(() => emptyForm(locale));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const applyBundle = useCallback((bundle: Awaited<ReturnType<typeof getProfileBundle>>) => {
    setCities(bundle.cities);
    setAreas(bundle.areas);
    const defaultCity = bundle.cities.find((city) => city.slug === 'nicosia') ?? bundle.cities[0];
    const selectedCityId = bundle.profile.city_id ?? defaultCity?.id ?? '';
    const cityAreas = bundle.areas.filter((area) => area.city_id === selectedCityId);
    setForm({
      displayName: bundle.profile.display_name ?? '',
      cityId: selectedCityId,
      areaId: bundle.profile.area_id ?? cityAreas[0]?.id ?? '',
      preferredPosition: isPosition(bundle.profile.preferred_position)
        ? bundle.profile.preferred_position
        : null,
      skillLevel: isSkillLevel(bundle.profile.skill_level) ? bundle.profile.skill_level : null,
      strongFoot: isStrongFoot(bundle.profile.strong_foot) ? bundle.profile.strong_foot : 'right',
      shirtNumber: bundle.profile.shirt_number ?? 8,
      preferredFormats: bundle.preferences.preferred_formats.filter(isFormat),
      availabilitySlots: bundle.preferences.availability_slots.filter(isAvailabilitySlot),
      maxRadiusKm: bundle.preferences.max_radius_km,
      language: 'en',
    });
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(false);
    try {
      const bundle = await getProfileBundle(user.id);
      applyBundle(bundle);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [applyBundle, user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getProfileBundle(user.id)
      .then((bundle) => {
        if (!active) return;
        applyBundle(bundle);
        setLoadError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyBundle, user]);

  const areaCityById = useMemo(
    () => new Map(areas.map((area) => [area.id, area.city_id])),
    [areas],
  );
  const visibleAreas = areas.filter((area) => area.city_id === form.cityId);

  const update = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    const validationKey = validateProfileInput({ ...form, language: locale }, areaCityById);
    if (validationKey) {
      showToast(copy[validationKey], 'error');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user.id, { ...form, language: locale });
      showToast(copy.profileSaveSuccess, 'success');
      if (onboarding) router.replace('/profile' as Href);
    } catch {
      showToast(copy.profileSaveError, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) throw error;
      showToast(copy.authSignOutSuccess, 'success');
      router.replace('/' as Href);
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <AppPage title={copy.profileOnboardingTitle} description={copy.profileOnboardingDescription}>
        <View accessibilityRole="progressbar" accessibilityLabel={copy.profileLoading}>
          <Text style={{ color: colors.textSecondary }}>{copy.profileLoading}</Text>
        </View>
      </AppPage>
    );
  }

  if (loadError) {
    return (
      <AppPage title={copy.profileOnboardingTitle} description={copy.profileOnboardingDescription}>
        <AppCard>
          <AuthFeedback>{copy.profileLoadError}</AuthFeedback>
          <AuthButton label={copy.profileRetry} onPress={() => void load()} />
        </AppCard>
      </AppPage>
    );
  }

  return (
    <AppPage
      title={onboarding ? copy.profileOnboardingTitle : copy.appProfileTitle}
      description={copy.profileOnboardingDescription}
    >
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center', gap: 14 }}>
        <AppCard>
          <Text accessibilityRole="header" style={{ color: colors.accentText, fontWeight: '800' }}>
            {copy.profileRequiredStep}
          </Text>
          <AuthField
            label={copy.profileDisplayName}
            value={form.displayName}
            onChangeText={(value) => update('displayName', value)}
            maxLength={42}
            autoComplete="off"
          />
          <ChoiceGroup
            label={copy.profileCity}
            options={cities.map((city) => ({
              id: city.id,
              label: locale === 'en' ? city.name_en : city.name_el,
            }))}
            selected={form.cityId}
            onSelect={(cityId) => {
              const nextAreaId = areas.find((area) => area.city_id === cityId)?.id ?? '';
              setForm((current) => ({ ...current, cityId, areaId: nextAreaId }));
            }}
            emptyLabel={copy.profileNoCities}
          />
          <ChoiceGroup
            label={copy.profileArea}
            options={visibleAreas.map((area) => ({
              id: area.id,
              label: locale === 'en' ? area.name_en : area.name_el,
            }))}
            selected={form.areaId}
            onSelect={(areaId) => update('areaId', areaId)}
            emptyLabel={copy.profileNoAreas}
          />
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>{copy.profileOptional}</Text>
          <Text accessibilityRole="header" style={{ color: colors.accentText, fontWeight: '800' }}>
            {copy.profilePreferencesStep}
          </Text>
          <ChoiceGroup
            label={copy.profilePosition}
            options={[
              { id: 'none', label: copy.profileNoPreference },
              ...positions.map((position) => ({
                id: position,
                label: positionLabel(position, copy),
              })),
            ]}
            selected={form.preferredPosition ?? 'none'}
            onSelect={(value) =>
              update('preferredPosition', value === 'none' ? null : (value as Position))
            }
            emptyLabel={copy.profileNoPreference}
          />
          <ChoiceGroup
            label={copy.profileSkill}
            options={[
              { id: 'none', label: copy.profileNoPreference },
              ...skillLevels.map((level) => ({ id: level, label: skillLabel(level, copy) })),
            ]}
            selected={form.skillLevel ?? 'none'}
            onSelect={(value) =>
              update('skillLevel', value === 'none' ? null : (value as SkillLevel))
            }
            emptyLabel={copy.profileNoPreference}
          />
          <ChoiceGroup
            label={copy.profileFormats}
            multi
            options={formats.map((format) => ({
              id: String(format),
              label: `${format}v${format}`,
            }))}
            selected={form.preferredFormats.map(String)}
            onSelect={(value) => {
              const chosen = Number(value) as Format;
              update(
                'preferredFormats',
                form.preferredFormats.includes(chosen)
                  ? form.preferredFormats.filter((format) => format !== chosen)
                  : [...form.preferredFormats, chosen],
              );
            }}
            emptyLabel={copy.profileNoPreference}
          />
          <ChoiceGroup
            label={copy.profileAvailability}
            multi
            options={availabilitySlots.map((slot) => ({
              id: slot,
              label: availabilityLabel(slot, copy),
            }))}
            selected={form.availabilitySlots}
            onSelect={(value) => {
              const slot = value as AvailabilitySlot;
              update(
                'availabilitySlots',
                form.availabilitySlots.includes(slot)
                  ? form.availabilitySlots.filter((item) => item !== slot)
                  : [...form.availabilitySlots, slot],
              );
            }}
            emptyLabel={copy.profileNoPreference}
          />
          <ChoiceGroup
            label={copy.profileRadius}
            options={[
              { id: 'any', label: copy.profileRadiusAny },
              { id: '10', label: copy.profileRadius10 },
              { id: '20', label: copy.profileRadius20 },
              { id: '50', label: copy.profileRadius50 },
            ]}
            selected={form.maxRadiusKm === null ? 'any' : String(form.maxRadiusKm)}
            onSelect={(value) => update('maxRadiusKm', value === 'any' ? null : Number(value))}
            emptyLabel={copy.profileRadiusAny}
          />
          <AuthButton
            label={saving ? copy.profileSaving : copy.profileSave}
            disabled={saving}
            onPress={() => void submit()}
          />
        </AppCard>
        {!onboarding ? (
          <>
            <AppAction labelKey="appSettingsAction" href="/settings" />
            <AppAction labelKey="appNotificationsTitle" href="/notifications" secondary />
            <AuthButton
              label={signingOut ? copy.authSessionLoading : copy.authSignOut}
              disabled={signingOut}
              onPress={() => void handleSignOut()}
            />
          </>
        ) : null}
      </View>
    </AppPage>
  );
}

function ChoiceGroup({
  label,
  options,
  selected,
  onSelect,
  emptyLabel,
  multi = false,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string | string[];
  onSelect: (id: string) => void;
  emptyLabel: string;
  multi?: boolean;
}) {
  const { colors } = useAppPreferences();
  if (options.length === 0) {
    return (
      <View style={styles.group}>
        <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={{ color: colors.textMuted }}>{emptyLabel}</Text>
      </View>
    );
  }
  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => {
          const active = Array.isArray(selected)
            ? selected.includes(option.id)
            : selected === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole={multi ? 'checkbox' : 'radio'}
              accessibilityLabel={option.label}
              accessibilityState={multi ? { checked: active } : { selected: active }}
              onPress={() => onSelect(option.id)}
              style={({ pressed }) => [
                styles.choice,
                {
                  backgroundColor: active ? colors.primaryButton : colors.background,
                  borderColor: active ? colors.primaryButton : colors.border,
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? colors.primaryButtonText : colors.textPrimary,
                  fontWeight: '600',
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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

function isPosition(value: string | null): value is Position {
  return positions.some((position) => position === value);
}

function isSkillLevel(value: string | null): value is SkillLevel {
  return skillLevels.some((level) => level === value);
}

function isStrongFoot(value: string | null | undefined): value is StrongFoot {
  return strongFeet.some((foot) => foot === value);
}

function isFormat(value: number): value is Format {
  return formats.some((format) => format === value);
}

function isAvailabilitySlot(value: string): value is AvailabilitySlot {
  return availabilitySlots.some((slot) => slot === value);
}

type ProfileCopy = {
  [
    Key in
      | 'profileGoalkeeper'
      | 'profileDefender'
      | 'profileMidfielder'
      | 'profileForward'
      | 'profileAnyPosition'
      | 'profileBeginner'
      | 'profileIntermediate'
      | 'profileAdvanced'
      | 'profileWeekdayMorning'
      | 'profileWeekdayAfternoon'
      | 'profileWeekdayEvening'
      | 'profileWeekendMorning'
      | 'profileWeekendAfternoon'
      | 'profileWeekendEvening'
  ]: string;
};

function positionLabel(value: Position, copy: ProfileCopy) {
  switch (value) {
    case 'goalkeeper':
      return copy.profileGoalkeeper;
    case 'defender':
      return copy.profileDefender;
    case 'midfielder':
      return copy.profileMidfielder;
    case 'forward':
      return copy.profileForward;
    case 'any':
      return copy.profileAnyPosition;
  }
}

function skillLabel(value: SkillLevel, copy: ProfileCopy) {
  switch (value) {
    case 'beginner':
      return copy.profileBeginner;
    case 'intermediate':
      return copy.profileIntermediate;
    case 'advanced':
      return copy.profileAdvanced;
  }
}

function availabilityLabel(value: AvailabilitySlot, copy: ProfileCopy) {
  switch (value) {
    case 'weekday_morning':
      return copy.profileWeekdayMorning;
    case 'weekday_afternoon':
      return copy.profileWeekdayAfternoon;
    case 'weekday_evening':
      return copy.profileWeekdayEvening;
    case 'weekend_morning':
      return copy.profileWeekendMorning;
    case 'weekend_afternoon':
      return copy.profileWeekendAfternoon;
    case 'weekend_evening':
      return copy.profileWeekendEvening;
  }
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  groupLabel: { fontSize: 13, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderRadius: 999,
  },
});
