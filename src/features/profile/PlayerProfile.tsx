import { Link, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { BrandMark } from '@/components/brand-mark';
import { AuthButton, AuthField, AuthFeedback } from '@/components/auth/AuthPage';
import { useToast } from '@/components/toast/ToastProvider';
import { PlayerCardShareModal } from '@/features/profile/PlayerCardShareModal';
import { signOut } from '@/features/auth/auth-service';
import { authErrorMessageKey } from '@/features/auth/auth-validation';
import { listMyTeams, type MyTeam } from '@/features/teams/team-service';
import { translations } from '@/i18n';
import type { TranslationKey } from '@/i18n';
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
  type StrongFoot,
  type SkillLevel,
} from './profile-validation';
import {
  getProfileBundle,
  saveNotificationPreferences,
  saveProfile,
  type AreaRow,
  type CityRow,
} from './profile-service';

type Copy = { [Key in TranslationKey]: string };

export function PlayerProfile() {
  const { user } = useAuth();
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const { showToast } = useToast();
  const [form, setForm] = useState<ProfileInput>(() => emptyForm(locale));
  const [cities, setCities] = useState<CityRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [reminders, setReminders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [shareCardVisible, setShareCardVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const cityName = cities.find((city) => city.id === form.cityId);
  const areaName = areas.find((area) => area.id === form.areaId);
  const visibleAreas = areas.filter((area) => area.city_id === form.cityId);
  const areaCityById = useMemo(() => new Map(areas.map((area) => [area.id, area.city_id])), [areas]);

  const load = useCallback(async (retry = false) => {
    if (!user) return;
    if (retry) {
      setLoading(true);
      setLoadError(false);
    }
    try {
      const [bundle, myTeams] = await Promise.all([getProfileBundle(user.id), listMyTeams()]);
      setCities(bundle.cities);
      setAreas(bundle.areas);
      setTeams(myTeams);
      const defaultCity = bundle.cities.find((city) => city.slug === 'nicosia') ?? bundle.cities[0];
      const cityId = bundle.profile.city_id ?? defaultCity?.id ?? '';
      const cityAreas = bundle.areas.filter((area) => area.city_id === cityId);
      const name = bundle.profile.display_name ?? '';
      setForm({
        displayName: name,
        cityId,
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
        language: locale,
      });
      setReminders(bundle.notificationPreferences.transactional_email_enabled);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [locale, user]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

  const update = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
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
      setEditing(false);
    } catch {
      showToast(copy.profileSaveError, 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleReminders = async () => {
    if (!user) return;
    const next = !reminders;
    setReminders(next);
    try {
      await saveNotificationPreferences(user.id, { transactional_email_enabled: next });
      showToast(copy.profileNotificationSaveSuccess, 'success');
    } catch {
      setReminders(!next);
      showToast(copy.profileNotificationSaveError, 'error');
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const { error } = await signOut();
      if (error) throw error;
      showToast(copy.authSignOutSuccess, 'success');
    } catch (error) {
      showToast(copy[authErrorMessageKey(error)], 'error');
    } finally {
      setSigningOut(false);
    }
  };

  if (loading || loadError) {
    return (
      <View style={[styles.stateRoot, { backgroundColor: colors.background }]}>
        {loading ? (
          <Text accessibilityRole="progressbar" style={{ color: colors.textSecondary }}>
            {copy.profileLoading}
          </Text>
        ) : (
          <View style={styles.stateCard}>
            <AuthFeedback>{copy.profileLoadError}</AuthFeedback>
          <AuthButton label={copy.profileRetry} onPress={() => void load(true)} />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ProfileStage
          colors={colors}
          copy={copy}
          form={form}
          position={form.preferredPosition ?? 'any'}
          name={form.displayName}
          location={[areaName?.[locale === 'en' ? 'name_en' : 'name_el'], cityName?.[locale === 'en' ? 'name_en' : 'name_el']]
            .filter(Boolean)
            .join(', ')}
          level={form.skillLevel ? skillLabel(form.skillLevel, copy) : copy.profileNoPreference}
          editing={editing}
          saving={saving}
          onNumberChange={(step) => update('shirtNumber', Math.max(1, Math.min(99, form.shirtNumber + step)))}
          onEdit={() => {
            if (editing) void save();
            else {
              setEditing(true);
            }
          }}
          onShare={() => setShareCardVisible(true)}
        />

        <PlayerCardShareModal
          visible={shareCardVisible}
          onClose={() => setShareCardVisible(false)}
          name={form.displayName}
          location={[areaName?.[locale === 'en' ? 'name_en' : 'name_el'], cityName?.[locale === 'en' ? 'name_en' : 'name_el']].filter(Boolean).join(', ')}
          number={form.shirtNumber}
          position={positionLabel(form.preferredPosition ?? 'any', copy)}
          strongFoot={strongFootLabel(form.strongFoot, copy)}
          level={form.skillLevel ? skillLabel(form.skillLevel, copy) : copy.profileNoPreference}
          formats={form.preferredFormats.map((format) => `${format}v${format}`)}
          availability={form.availabilitySlots.map((slot) => availabilityCardLabel(slot, locale))}
          copy={copy}
        />

        <ProfilePanel title={copy.profilePlayerDetails} colors={colors}>
          <AuthField
            label={copy.profileDisplayName}
            value={form.displayName}
            onChangeText={(value) => update('displayName', value)}
            maxLength={40}
            autoComplete="off"
            editable={editing}
          />
          <FieldRow label={copy.profileCity} colors={colors}>
            <ChipGroup
              colors={colors}
              options={cities.map((city) => ({
                id: city.id,
                label: locale === 'en' ? city.name_en : city.name_el,
              }))}
              selected={form.cityId}
              disabled={!editing}
              onSelect={(cityId) => {
                const areaId = areas.find((area) => area.city_id === cityId)?.id ?? '';
                setForm((current) => ({ ...current, cityId, areaId }));
              }}
            />
          </FieldRow>
          <FieldRow label={copy.profileArea} colors={colors}>
            <ChipGroup
              colors={colors}
              options={visibleAreas.map((area) => ({
                id: area.id,
                label: locale === 'en' ? area.name_en : area.name_el,
              }))}
              selected={form.areaId}
              disabled={!editing}
              onSelect={(areaId) => update('areaId', areaId)}
            />
          </FieldRow>
        </ProfilePanel>

        <ProfilePanel title={copy.profileWhereYouPlay} subtitle={copy.profileWhereYouPlayHint} colors={colors}>
          <PositionPitch
            colors={colors}
            position={form.preferredPosition ?? 'any'}
            disabled={!editing}
            onSelect={(value) => update('preferredPosition', value)}
            copy={copy}
          />
        </ProfilePanel>

        <ProfilePanel title={copy.profilePlayStyle} colors={colors}>
          <ChoiceRow
            label={copy.profileStrongFoot}
            colors={colors}
            options={strongFeet.map((value) => ({ id: value, label: strongFootLabel(value, copy) }))}
            selected={form.strongFoot}
            disabled={!editing}
            onSelect={(value) => update('strongFoot', value as StrongFoot)}
          />
          <ChoiceRow
            label={copy.profileSkill}
            colors={colors}
            options={[
              { id: 'beginner', label: copy.profileBeginner },
              { id: 'intermediate', label: copy.profileIntermediate },
              { id: 'advanced', label: copy.profileAdvanced },
            ]}
            selected={form.skillLevel ?? ''}
            disabled={!editing}
            onSelect={(value) => update('skillLevel', value as SkillLevel)}
          />
        </ProfilePanel>

        <ProfilePanel title={copy.profileAvailability} subtitle={copy.profileAvailabilityIntro} colors={colors}>
          <ChoiceGrid
            colors={colors}
            options={availabilitySlots.map((slot) => ({ id: slot, label: availabilityLabel(slot, copy) }))}
            selected={form.availabilitySlots}
            disabled={!editing}
            onSelect={(value) => {
              const slot = value as AvailabilitySlot;
              update(
                'availabilitySlots',
                form.availabilitySlots.includes(slot)
                  ? form.availabilitySlots.filter((item) => item !== slot)
                  : [...form.availabilitySlots, slot],
              );
            }}
          />
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{copy.profileRadius}</Text>
          <ChoiceRow
            label={copy.profileRadius}
            colors={colors}
            options={[
              { id: 'any', label: copy.profileRadiusAny },
              { id: '10', label: copy.profileRadius10 },
              { id: '20', label: copy.profileRadius20 },
              { id: '50', label: copy.profileRadius50 },
            ]}
            selected={form.maxRadiusKm === null ? 'any' : String(form.maxRadiusKm)}
            disabled={!editing}
            onSelect={(value) => update('maxRadiusKm', value === 'any' ? null : Number(value))}
          />
        </ProfilePanel>

        <ProfilePanel title={copy.profileFormats} subtitle={copy.profileFormatsIntro} colors={colors}>
          <ChoiceGrid
            colors={colors}
            options={formats.map((value) => ({ id: String(value), label: `${value}v${value}` }))}
            selected={form.preferredFormats.map(String)}
            disabled={!editing}
            onSelect={(value) => {
              const chosen = Number(value) as Format;
              update(
                'preferredFormats',
                form.preferredFormats.includes(chosen)
                  ? form.preferredFormats.filter((item) => item !== chosen)
                  : [...form.preferredFormats, chosen],
              );
            }}
          />
        </ProfilePanel>

        <ProfilePanel title={copy.profileTeams} colors={colors}>
          {teams.length ? (
            teams.map((team) => (
              <Link key={team.teamId} href={`/teams/${team.teamId}` as Href} asChild>
                <Pressable style={[styles.teamRow, { borderColor: colors.border }]}>
                  <Crest colors={colors} initials={team.name.slice(0, 2).toUpperCase()} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.teamName, { color: colors.textPrimary }]}>{team.name}</Text>
                    <Text style={{ color: colors.textSecondary }}>
                      {team.memberCount} · {locale === 'en' ? team.cityNameEn : team.cityNameEl}
                    </Text>
                  </View>
                  <Text style={{ color: colors.accentText }}>›</Text>
                </Pressable>
              </Link>
            ))
          ) : (
            <View style={[styles.emptyTeam, { borderColor: colors.border }]}>
              <Crest colors={colors} initials="+" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.teamName, { color: colors.textPrimary }]}>{copy.profileNoTeam}</Text>
                <Text style={{ color: colors.textSecondary }}>{copy.profileNoTeamDescription}</Text>
              </View>
              <Link href={'/teams/create' as Href} style={{ color: colors.primaryButtonText, backgroundColor: colors.primaryButton, padding: 10, borderRadius: 12 }}>
                {copy.profileCreateTeam}
              </Link>
            </View>
          )}
        </ProfilePanel>

        <ProfilePanel title={copy.profileAccount} colors={colors}>
          <View style={[styles.accountRow, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.teamName, { color: colors.textPrimary }]}>{copy.profileGameReminders}</Text>
              <Text style={{ color: colors.textSecondary }}>{copy.profileGameRemindersDescription}</Text>
            </View>
            <SwitchToggle colors={colors} value={reminders} onPress={() => void toggleReminders()} disabled={false} label={copy.profileGameReminders} />
          </View>
          <Text style={{ color: colors.textSecondary, paddingVertical: 10 }}>{user?.email ?? ''}</Text>
          <Link href={'/settings' as Href} style={[styles.linkRow, { borderColor: colors.border, color: colors.textPrimary }]}>
            {copy.appSettingsTitle}<Text style={{ color: colors.accentText }}> ›</Text>
          </Link>
          <Link href={'/notifications' as Href} style={[styles.linkRow, { borderColor: colors.border, color: colors.textPrimary }]}>
            {copy.appNotificationsTitle}<Text style={{ color: colors.accentText }}> ›</Text>
          </Link>
          <Pressable accessibilityRole="button" onPress={() => void handleSignOut()} disabled={signingOut} style={styles.signOut}>
            <Text style={{ color: colors.errorText, fontWeight: '700' }}>{signingOut ? copy.authSessionLoading : copy.authSignOut}</Text>
          </Pressable>
        </ProfilePanel>
      </ScrollView>
    </View>
  );
}

function ProfileStage({
  colors,
  copy,
  form,
  position,
  name,
  location,
  level,
  editing,
  saving,
  onEdit,
  onNumberChange,
  onShare,
}: {
  colors: ReturnType<typeof useAppPreferences>['colors'];
  copy: Copy;
  form: ProfileInput;
  position: Position;
  name: string;
  location: string;
  level: string;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onNumberChange: (step: number) => void;
  onShare: () => void;
}) {
  return (
    <View style={[styles.stage, { backgroundColor: colors.background === '#F7F9F2' ? colors.background : '#0c1210' }]}>
      <AnimatedBackdrop colors={colors} />
      <View style={styles.stageHeader}>
        <BrandMark prominent />
        <Text accessibilityRole="header" style={[styles.stageTitle, { color: colors.textPrimary }]}>{copy.appProfileTitle}</Text>
        <Pressable accessibilityRole="button" onPress={onEdit} disabled={saving} style={[styles.editButton, { borderColor: colors.border, backgroundColor: colors.surfaceRaised }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            {saving ? copy.profileSaving : editing ? copy.profileSaveShort : copy.profileEdit}
          </Text>
        </Pressable>
      </View>
      <View style={styles.jerseyRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.profileShirtNumberDown} accessibilityState={{ disabled: !editing || form.shirtNumber <= 1 }} disabled={!editing || form.shirtNumber <= 1} onPress={() => onNumberChange(-1)} style={[styles.numberButton, { borderColor: colors.border, opacity: editing ? 1 : 0.45 }]}><Text style={{ color: colors.textPrimary, fontSize: 23 }}>−</Text></Pressable>
        <AnimatedJersey colors={colors} number={form.shirtNumber} />
        <Pressable accessibilityRole="button" accessibilityLabel={copy.profileShirtNumberUp} accessibilityState={{ disabled: !editing || form.shirtNumber >= 99 }} disabled={!editing || form.shirtNumber >= 99} onPress={() => onNumberChange(1)} style={[styles.numberButton, { borderColor: colors.border, opacity: editing ? 1 : 0.45 }]}><Text style={{ color: colors.textPrimary, fontSize: 23 }}>+</Text></Pressable>
      </View>
      <Text style={[styles.playerName, { color: colors.textPrimary }]} numberOfLines={2}>{name}</Text>
      <Text style={[styles.playerMeta, { color: colors.textSecondary }]}>{positionLabel(position, copy)}{location ? ` · ${location}` : ''}</Text>
      <View style={styles.badges}>
        {form.skillLevel ? <Badge colors={colors} label={level} accent /> : null}
        <Badge colors={colors} label={strongFootLabel(form.strongFoot, copy)} />
      </View>
      <Pressable accessibilityRole="button" onPress={onShare} style={[styles.sharePlayerCard, { backgroundColor: colors.primaryButton }]}>
        <Text style={[styles.sharePlayerCardText, { color: colors.primaryButtonText }]}>{copy.profileShareCard}</Text>
        <Text style={[styles.sharePlayerCardGlyph, { color: colors.primaryButtonText }]}>↥</Text>
      </Pressable>
    </View>
  );
}

function AnimatedBackdrop({ colors }: { colors: ReturnType<typeof useAppPreferences>['colors'] }) {
  const [beams] = useState(() => [new Animated.Value(0), new Animated.Value(0)]);
  const [dots] = useState(() => Array.from({ length: 6 }, () => new Animated.Value(0)));
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    }).catch(() => setReduceMotion(true));
    return () => { active = false; subscription.remove(); };
  }, []);
  useEffect(() => {
    if (reduceMotion) return;
    const animations: Animated.CompositeAnimation[] = [];
    beams.forEach((value, index) => {
      animations.push(Animated.loop(Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: index ? 9200 : 7600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: index ? 9200 : 7600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])));
    });
    dots.forEach((value, index) => {
      animations.push(Animated.loop(Animated.sequence([
        Animated.delay(index * 420),
        Animated.timing(value, { toValue: 1, duration: 7200 + index * 260, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])));
    });
    animations.forEach((animation) => animation.start());
    return () => animations.forEach((animation) => animation.stop());
  }, [beams, dots, reduceMotion]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="profile-stage-glow" cx="50%" cy="62%" rx="72%" ry="70%">
            <Stop offset="0" stopColor={colors.background === '#F7F9F2' ? colors.pitch : '#21402b'} stopOpacity={colors.background === '#F7F9F2' ? 0.14 : 0.78} />
            <Stop offset="1" stopColor={colors.background === '#F7F9F2' ? colors.background : '#0c1210'} stopOpacity="1" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#profile-stage-glow)" />
      </Svg>
      {beams.map((value, index) => (
        <Animated.View key={index} style={[styles.beam, index ? { right: -100 } : { left: -105 }, { opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.52, 0.9] }), transform: [{ rotate: value.interpolate({ inputRange: [0, 1], outputRange: [index ? '15deg' : '-18deg', index ? '28deg' : '-31deg'] }) }] }]}>
          <Svg width="235" height="420" viewBox="0 0 235 420">
            <Defs>
              <LinearGradient id={`profile-beam-${index}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.background === '#F7F9F2' ? colors.primaryButton : '#deff96'} stopOpacity={index ? 0.2 : 0.24} />
                <Stop offset="1" stopColor="#deff96" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Path d="M101 0h18l116 420H0z" fill={`url(#profile-beam-${index})`} />
          </Svg>
        </Animated.View>
      ))}
      {dots.map((value, index) => (
        <Animated.View key={index} style={[styles.floatDot, { left: `${12 + index * 15}%`, backgroundColor: index % 2 ? '#f2f5ec' : colors.primaryButton, opacity: value.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.8, 0] }), transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [12, -320] }) }] }]} />
      ))}
    </View>
  );
}

function AnimatedJersey({ colors, number }: { colors: ReturnType<typeof useAppPreferences>['colors']; number: number }) {
  const { locale } = useAppPreferences();
  const [drop] = useState(() => new Animated.Value(0));
  const [sway] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const entrance = Animated.spring(drop, { toValue: 1, speed: 1.7, bounciness: 8, useNativeDriver: true });
    const swing = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(sway, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    entrance.start();
    swing.start();
    return () => { entrance.stop(); swing.stop(); };
  }, [drop, sway]);
  const tint = colors.primaryButton;
  return (
    <Animated.View style={{ width: 190, height: 180, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) }, { rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-3.5deg', '3.5deg'] }) }, { scale: drop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
      <Svg width="190" height="180" viewBox="0 0 200 190" accessibilityLabel={`${translations[locale].profileShirtNumber} ${number}`}>
        <Path d="M70 14C82 26 118 26 130 14l40 16 24 40-28 16-12-20v110c0 5-4 8-8 8H54c-4 0-8-3-8-8V66L34 86 6 70l24-40z" fill={tint} stroke="#0c1210" strokeWidth="3" strokeLinejoin="round" />
        <Path d="M100 24l54 42v110c0 5-4 8-8 8h-46z" fill="#0c1210" opacity=".07" />
        <Path d="M70 14c12 18 48 18 60 0l-8-3c-10 13-34 13-44 0z" fill="#0c1210" />
        <SvgText x="100" y="73" textAnchor="middle" fontSize="15" fontWeight="700" letterSpacing="2" fill="#0c1210">DEMO</SvgText>
        <SvgText x="100" y="151" textAnchor="middle" fontSize={number > 9 ? 64 : 78} fontWeight="800" fill="#0c1210">{number}</SvgText>
      </Svg>
      <View style={styles.jerseyShadow} />
    </Animated.View>
  );
}

function PositionPitch({ colors, position, disabled, onSelect, copy }: { colors: ReturnType<typeof useAppPreferences>['colors']; position: Position; disabled: boolean; onSelect: (position: Position) => void; copy: Copy }) {
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1050, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  const points: Record<Position, { top: number; left: number; label: string; short: string }> = {
    goalkeeper: { top: 87, left: 50, label: copy.profileGoalkeeper, short: 'GK' },
    defender: { top: 67, left: 26, label: copy.profileDefender, short: 'DF' },
    midfielder: { top: 52, left: 50, label: copy.profileMidfielder, short: 'MF' },
    forward: { top: 33, left: 74, label: copy.profileForward, short: 'FW' },
    any: { top: 50, left: 50, label: copy.profileAnyPosition, short: 'ANY' },
  };
  return (
    <View style={[styles.pitch, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 300 240" preserveAspectRatio="none">
        <Rect x="8" y="8" width="284" height="224" rx="6" stroke={colors.pitchLine} strokeWidth="2" fill="none" opacity=".65" />
        <Line x1="8" y1="120" x2="292" y2="120" stroke={colors.pitchLine} strokeWidth="2" opacity=".55" />
        <Circle cx="150" cy="120" r="29" stroke={colors.pitchLine} strokeWidth="2" fill="none" opacity=".55" />
        <Rect x="91" y="8" width="118" height="40" stroke={colors.pitchLine} strokeWidth="2" fill="none" opacity=".5" />
        <Rect x="115" y="8" width="70" height="17" stroke={colors.pitchLine} strokeWidth="2" fill="none" opacity=".5" />
        <Rect x="91" y="192" width="118" height="40" stroke={colors.pitchLine} strokeWidth="2" fill="none" opacity=".5" />
        <Rect x="115" y="215" width="70" height="17" stroke={colors.pitchLine} strokeWidth="2" fill="none" opacity=".5" />
        <Line x1="0" y1="0" x2="300" y2="0" stroke={colors.primaryButton} strokeWidth="22" opacity=".04" />
        <Line x1="0" y1="120" x2="300" y2="120" stroke={colors.primaryButton} strokeWidth="20" opacity=".045" />
        <Line x1="0" y1="240" x2="300" y2="240" stroke={colors.primaryButton} strokeWidth="22" opacity=".04" />
      </Svg>
      {(positions).map((value) => {
        const point = points[value];
        const selected = position === value;
        return (
          <Pressable key={value} accessibilityRole="radio" accessibilityLabel={point.label} accessibilityState={{ selected }} disabled={disabled} onPress={() => onSelect(value)} style={[styles.pitchZone, { top: `${point.top}%`, left: `${point.left}%` }]}>
            {selected ? <Animated.View style={[styles.positionHalo, { borderColor: colors.primaryButton, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.62, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.3] }) }] }]} /> : null}
            <View style={[styles.positionDot, { backgroundColor: selected ? colors.primaryButton : colors.surface, borderColor: colors.border }]}>
              <Text style={{ color: selected ? colors.primaryButtonText : colors.textPrimary, fontWeight: '800', fontSize: point.short.length > 2 ? 10 : 12 }}>{point.short}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function ProfilePanel({ title, subtitle, colors, children }: { title: string; subtitle?: string; colors: ReturnType<typeof useAppPreferences>['colors']; children: React.ReactNode }) {
  return (
    <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.panelHeading}>
        <Text accessibilityRole="header" style={[styles.panelTitle, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={{ color: colors.textSecondary }}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ChipGroup({ colors, options, selected, disabled, onSelect }: { colors: ReturnType<typeof useAppPreferences>['colors']; options: { id: string; label: string }[]; selected: string; disabled: boolean; onSelect: (value: string) => void }) {
  return <View style={styles.chips}>{options.map((option) => <Chip key={option.id} colors={colors} label={option.label} selected={option.id === selected} disabled={disabled} onPress={() => onSelect(option.id)} />)}</View>;
}

function ChoiceRow({ label, colors, options, selected, disabled, onSelect }: { label: string; colors: ReturnType<typeof useAppPreferences>['colors']; options: { id: string; label: string }[]; selected: string; disabled: boolean; onSelect: (value: string) => void }) {
  return <View style={styles.group}><Text style={[styles.fieldTitle, { color: colors.textSecondary }]}>{label}</Text><View style={styles.chips}>{options.map((option) => <Chip key={option.id} colors={colors} label={option.label} selected={option.id === selected} disabled={disabled} onPress={() => onSelect(option.id)} />)}</View></View>;
}

function ChoiceGrid({ colors, options, selected, disabled, onSelect }: { colors: ReturnType<typeof useAppPreferences>['colors']; options: { id: string; label: string }[]; selected: string[]; disabled: boolean; onSelect: (value: string) => void }) {
  return <View style={styles.choiceGrid}>{options.map((option) => <Chip key={option.id} colors={colors} label={option.label} selected={selected.includes(option.id)} disabled={disabled} onPress={() => onSelect(option.id)} wide />)}</View>;
}

function Chip({ colors, label, selected, disabled, onPress, wide = false }: { colors: ReturnType<typeof useAppPreferences>['colors']; label: string; selected: boolean; disabled: boolean; onPress: () => void; wide?: boolean }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress} style={[styles.chip, wide && styles.wideChip, { backgroundColor: selected ? colors.primaryButton : colors.surfaceRaised, borderColor: selected ? colors.primaryButton : colors.border, opacity: disabled ? 0.74 : 1 }]}><Text style={{ color: selected ? colors.primaryButtonText : colors.textPrimary, fontWeight: '700', textAlign: 'center' }}>{label}</Text></Pressable>;
}

function FieldRow({ label, colors, children }: { label: string; colors: ReturnType<typeof useAppPreferences>['colors']; children: React.ReactNode }) {
  return <View style={styles.fieldRow}><Text style={[styles.fieldTitle, { color: colors.textSecondary }]}>{label}</Text>{children}</View>;
}

function Badge({ colors, label, accent = false }: { colors: ReturnType<typeof useAppPreferences>['colors']; label: string; accent?: boolean }) {
  return <View style={[styles.badge, { backgroundColor: accent ? colors.primaryButton : colors.surfaceRaised }]}><Text style={{ color: accent ? colors.primaryButtonText : colors.textPrimary, fontWeight: '700' }}>{label}</Text></View>;
}

function Crest({ colors, initials }: { colors: ReturnType<typeof useAppPreferences>['colors']; initials: string }) {
  return <View style={[styles.crest, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}><Text style={{ color: colors.accentText, fontFamily: 'BarlowCondensed_700Bold', fontSize: 22 }}>{initials}</Text></View>;
}

function SwitchToggle({ colors, value, onPress, disabled, label }: { colors: ReturnType<typeof useAppPreferences>['colors']; value: boolean; onPress: () => void; disabled: boolean; label: string }) {
  return <Pressable accessibilityRole="switch" accessibilityState={{ checked: value, disabled }} aria-checked={value} accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.switch, { borderColor: value ? colors.primaryButton : colors.border, backgroundColor: value ? colors.primaryButton : colors.surfaceRaised }]}><View style={[styles.switchThumb, { backgroundColor: value ? colors.primaryButtonText : colors.textMuted, transform: [{ translateX: value ? 21 : 0 }] }]} /></Pressable>;
}

function emptyForm(language: 'en' | 'el'): ProfileInput {
  return { displayName: '', cityId: '', areaId: '', preferredPosition: null, skillLevel: null, strongFoot: 'right', shirtNumber: 8, preferredFormats: [5, 7], availabilitySlots: [], maxRadiusKm: null, language };
}
function isPosition(value: string | null): value is Position { return positions.some((item) => item === value); }
function isSkillLevel(value: string | null): value is SkillLevel { return skillLevels.some((item) => item === value); }
function isStrongFoot(value: string | null | undefined): value is StrongFoot { return strongFeet.some((item) => item === value); }
function isFormat(value: number): value is Format { return formats.some((item) => item === value); }
function isAvailabilitySlot(value: string): value is AvailabilitySlot { return availabilitySlots.some((item) => item === value); }
function positionLabel(value: Position, copy: Copy) {
  switch (value) { case 'goalkeeper': return copy.profileGoalkeeper; case 'defender': return copy.profileDefender; case 'midfielder': return copy.profileMidfielder; case 'forward': return copy.profileForward; case 'any': return copy.profileAnyPosition; }
}
function skillLabel(value: SkillLevel, copy: Copy) {
  switch (value) { case 'beginner': return copy.profileBeginner; case 'intermediate': return copy.profileIntermediate; case 'advanced': return copy.profileAdvanced; }
}
function strongFootLabel(value: StrongFoot, copy: Copy) {
  switch (value) { case 'left': return copy.profileLeftFoot; case 'right': return copy.profileRightFoot; case 'both': return copy.profileBothFeet; }
}
function availabilityLabel(value: AvailabilitySlot, copy: Copy) {
  switch (value) { case 'weekday_morning': return copy.profileWeekdayMorning; case 'weekday_afternoon': return copy.profileWeekdayAfternoon; case 'weekday_evening': return copy.profileWeekdayEvening; case 'weekend_morning': return copy.profileWeekendMorning; case 'weekend_afternoon': return copy.profileWeekendAfternoon; case 'weekend_evening': return copy.profileWeekendEvening; }
}
function availabilityCardLabel(value: AvailabilitySlot, locale: 'en' | 'el') {
  const labels = locale === 'en'
    ? { weekday_morning: 'Weekday AM', weekday_afternoon: 'Weekday PM', weekday_evening: 'Weekday eve', weekend_morning: 'Weekend AM', weekend_afternoon: 'Weekend PM', weekend_evening: 'Weekend eve' }
    : { weekday_morning: 'Καθημ. πρωί', weekday_afternoon: 'Καθημ. απόγ.', weekday_evening: 'Καθημ. βράδυ', weekend_morning: 'ΣΚ πρωί', weekend_afternoon: 'ΣΚ απόγ.', weekend_evening: 'ΣΚ βράδυ' };
  return labels[value];
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  stateRoot: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  stateCard: { width: '100%', maxWidth: 480, gap: 18 },
  scroll: { flex: 1 },
  content: { width: '100%', maxWidth: 480, alignSelf: 'center', paddingBottom: 30, gap: 16 },
  stage: { minHeight: 0, overflow: 'hidden', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20 },
  beam: { position: 'absolute', top: -18, width: 235, height: 420 },
  floatDot: { position: 'absolute', bottom: 0, width: 4, height: 4, borderRadius: 4 },
  stageHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 2 },
  stageTitle: { flex: 1, fontFamily: 'BarlowCondensed_700Bold', fontSize: 26 },
  editButton: { height: 42, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12 },
  jerseyRow: { height: 190, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 6 },
  jerseyShadow: { position: 'absolute', bottom: -5, width: 100, height: 12, borderRadius: 50, backgroundColor: '#000', opacity: 0.5 },
  playerName: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 38, lineHeight: 44, textAlign: 'center', marginTop: 2 },
  playerMeta: { fontSize: 15, textAlign: 'center', marginTop: 1 },
  badges: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  sharePlayerCard: { minHeight: 50, maxWidth: 340, width: '100%', borderRadius: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 16 },
  sharePlayerCardText: { fontSize: 16, fontWeight: '800' },
  sharePlayerCardGlyph: { fontSize: 24, fontWeight: '800' },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  panel: { marginHorizontal: 16, padding: 16, gap: 16, borderWidth: 1, borderRadius: 22 },
  panelHeading: { gap: 4 },
  panelTitle: { fontFamily: 'BarlowCondensed_700Bold', fontSize: 25, lineHeight: 30 },
  group: { gap: 9 },
  fieldRow: { gap: 8 },
  fieldTitle: { fontSize: 14, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  wideChip: { width: '48%', flexGrow: 1 },
  numberButton: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  numberValue: { width: 36, fontFamily: 'BarlowCondensed_700Bold', fontSize: 28, textAlign: 'center' },
  pitch: { width: '100%', aspectRatio: 1.04, borderRadius: 18, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  pitchZone: { position: 'absolute', width: 50, height: 50, marginLeft: -25, marginTop: -25, alignItems: 'center', justifyContent: 'center' },
  positionDot: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  positionHalo: { position: 'absolute', width: 54, height: 54, borderRadius: 27, borderWidth: 2, opacity: 0.62 },
  teamRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderWidth: 1, borderRadius: 16 },
  emptyTeam: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1, borderStyle: 'dashed', borderRadius: 16 },
  teamName: { fontWeight: '700', fontSize: 16 },
  crest: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  accountRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  switch: { width: 54, height: 32, borderRadius: 16, borderWidth: 1, justifyContent: 'center', paddingHorizontal: 3 },
  switchThumb: { width: 24, height: 24, borderRadius: 12 },
  linkRow: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', fontWeight: '600' },
  signOut: { minHeight: 46, justifyContent: 'center', alignItems: 'flex-start' },
});
