import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type DimensionValue,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { useAuth } from '@/auth/AuthProvider';
import { AuthButton, AuthFeedback } from '@/components/auth/AuthPage';
import { BrandMark } from '@/components/brand-mark';
import { Rise, useEntrance, useLoop } from '@/components/motion';
import { StageBackdrop } from '@/components/stage-backdrop';
import { useToast } from '@/components/toast/ToastProvider';
import { signOut } from '@/features/auth/auth-service';
import { authErrorMessageKey } from '@/features/auth/auth-validation';
import {
  H,
  PlayerCardArt,
  W,
  usePlayerCardActions,
  type PlayerCardData,
} from '@/features/profile/PlayerCardShareModal';
import { listMyTeams, type MyTeam } from '@/features/teams/team-service';
import { CaptainBadge, Crest as TeamCrestArt, crestInitials } from '@/features/teams/TeamCrest';
import { translations, type Locale, type TranslationKey } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import type { ThemeColors } from '@/theme/tokens';
import { bodyFont, displayFont } from '@/theme/typography';

import {
  availabilityDays,
  formats,
  isAvailabilityValue,
  positions,
  skillLevels,
  strongFeet,
  type AvailabilityDay,
  type Format,
  type Position,
  type ProfileInput,
  type SkillLevel,
  type StrongFoot,
} from './profile-validation';
import {
  getProfileBundle,
  saveNotificationPreferences,
  type AreaRow,
  type CityRow,
} from './profile-service';
import { withTimeout } from '@/lib/with-timeout';
import { SkeletonList } from '@/components/loading/Skeleton';

export type Copy = { [Key in TranslationKey]: string };

/** Pitch zones top to bottom: band top, band height and marker centre (in % of pitch height). */
const zones: {
  position: Exclude<Position, 'any'>;
  short: string;
  top: number;
  height: number;
  centre: number;
}[] = [
  { position: 'forward', short: 'ST', top: 4, height: 26, centre: 17 },
  { position: 'midfielder', short: 'MF', top: 30, height: 24, centre: 42 },
  { position: 'defender', short: 'DF', top: 54, height: 24, centre: 66 },
  { position: 'goalkeeper', short: 'GK', top: 78, height: 18, centre: 87 },
];
export const dayKeys: Record<AvailabilityDay, TranslationKey> = {
  mon: 'profileDayMon',
  tue: 'profileDayTue',
  wed: 'profileDayWed',
  thu: 'profileDayThu',
  fri: 'profileDayFri',
  sat: 'profileDaySat',
  sun: 'profileDaySun',
};

export function PlayerProfile() {
  const { user } = useAuth();
  const { colors, locale, setLocale, theme, setThemePreference } = useAppPreferences();
  const copy = translations[locale];
  const { showToast } = useToast();
  const [form, setForm] = useState<ProfileInput>(() => emptyForm(locale));
  const [cities, setCities] = useState<CityRow[]>([]);
  const [areas, setAreas] = useState<AreaRow[]>([]);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [reminders, setReminders] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const styles = useMemo(() => makeStyles(colors, locale), [colors, locale]);
  const cityName = cities.find((city) => city.id === form.cityId);
  const areaName = areas.find((area) => area.id === form.areaId);
  const place = [areaName, cityName]
    .map((row) => (row ? (locale === 'en' ? row.name_en : row.name_el) : ''))
    .filter(Boolean)
    .join(', ');
  const position = form.preferredPosition ?? 'any';
  const level = form.skillLevel ? levelLabel(form.skillLevel, copy) : copy.profileNoPreference;

  const load = useCallback(
    async (retry = false) => {
      if (!user) return;
      if (retry) {
        setLoading(true);
        setLoadError(false);
      }
      try {
        const [bundle, myTeams] = await withTimeout(
          Promise.all([getProfileBundle(user.id), listMyTeams()]),
          15_000,
        );
        setCities(bundle.cities);
        setAreas(bundle.areas);
        setTeams(myTeams);
        const defaultCity =
          bundle.cities.find((city) => city.slug === 'nicosia') ?? bundle.cities[0];
        const cityId = bundle.profile.city_id ?? defaultCity?.id ?? '';
        const cityAreas = bundle.areas.filter((area) => area.city_id === cityId);
        setForm({
          displayName: bundle.profile.display_name ?? '',
          cityId,
          areaId: bundle.profile.area_id ?? cityAreas[0]?.id ?? '',
          preferredPosition: isPosition(bundle.profile.preferred_position)
            ? bundle.profile.preferred_position
            : null,
          skillLevel: isSkillLevel(bundle.profile.skill_level) ? bundle.profile.skill_level : null,
          strongFoot: isStrongFoot(bundle.profile.strong_foot)
            ? bundle.profile.strong_foot
            : 'right',
          shirtNumber: bundle.profile.shirt_number ?? 8,
          preferredFormats: bundle.preferences.preferred_formats.filter(isFormat),
          availabilitySlots: bundle.preferences.availability_slots.filter(isAvailabilityValue),
          maxRadiusKm: bundle.preferences.max_radius_km,
          language: locale,
        });
        setReminders(bundle.notificationPreferences.transactional_email_enabled);
      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    },
    [locale, user],
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);

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
      <View style={styles.stateRoot}>
        {loading ? (
          <View style={styles.skeletonWrap}>
            <SkeletonList kind="profile" label={copy.profileLoading} />
          </View>
        ) : (
          <View style={styles.stateCard}>
            <AuthFeedback>{copy.profileLoadError}</AuthFeedback>
            <AuthButton label={copy.profileRetry} onPress={() => void load(true)} />
          </View>
        )}
      </View>
    );
  }

  const days = availabilityDays.filter((day) => form.availabilitySlots.includes(day));
  const footLabel = strongFootLabel(form.strongFoot, copy);
  const positionName = positionLabel(position, copy);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <PlayerHero
          colors={colors}
          copy={copy}
          locale={locale}
          card={{
            name: form.displayName,
            location: place,
            number: form.shirtNumber,
            position,
            positionLabel: positionName,
            strongFoot: form.strongFoot,
            strongFootLabel: footLabel,
            skillLevel: form.skillLevel,
            levelLabel: level,
            formats: form.preferredFormats,
            days: availabilityDays.map((day) => days.includes(day)),
            dayLetters: copy.profileDayLettersMonToSun.split(','),
          }}
          onEdit={() => router.push('/profile-edit' as Href)}
        />

        <Rise delay={560} distance={16} style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {copy.profileTeams}
          </Text>
          {teams.length ? (
            <View style={styles.listCard}>
              {teams.map((team, index) => (
                <Pressable
                  key={team.teamId}
                  accessibilityRole="link"
                  accessibilityLabel={team.name}
                  onPress={() => router.push(`/teams/${team.teamId}` as Href)}
                  style={({ pressed }) => [
                    styles.row,
                    index < teams.length - 1 && styles.rowDivider,
                    pressed && { backgroundColor: colors.cardTop },
                  ]}
                >
                  {team.crest ? (
                    <TeamCrestArt {...team.crest} initials={crestInitials(team.name)} size={44} />
                  ) : (
                    <ShieldOutline color={colors.accentText} dashed={false} />
                  )}
                  <View style={styles.rowCopy}>
                    <Text numberOfLines={1} style={styles.rowTitle}>
                      {team.name}
                    </Text>
                    <Text style={styles.muted}>
                      {`${locale === 'en' ? team.cityNameEn : team.cityNameEl} · ${
                        team.memberCount === 1
                          ? copy.teamPlayerOne
                          : copy.teamPlayersCount.replace('{count}', String(team.memberCount))
                      }`}
                    </Text>
                  </View>
                  {team.role === 'captain' ? <CaptainBadge label={copy.teamCaptain} /> : null}
                  <Chevron color={colors.textSecondary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={styles.emptyTeam}>
              <ShieldOutline color={colors.accentText} dashed />
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{copy.profileNoTeam}</Text>
                <Text style={styles.muted}>{copy.profileNoTeamDescription}</Text>
              </View>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.push('/teams/create' as Href)}
                style={({ pressed }) => [
                  styles.smallLime,
                  { transform: [{ scale: pressed ? 0.94 : 1 }] },
                ]}
              >
                <Text style={styles.smallLimeText}>{copy.profileCreateTeam}</Text>
              </Pressable>
            </View>
          )}
        </Rise>

        <Rise delay={620} distance={16} style={styles.section}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            {copy.profileAccount}
          </Text>
          <View style={styles.listCard}>
            <View style={[styles.row, styles.rowDivider]}>
              <MenuIcon name="clock" colors={colors} styles={styles} />
              <View style={styles.rowCopy}>
                <Text nativeID="profile-reminders" style={styles.rowTitle}>
                  {copy.profileGameRemindersShort}
                </Text>
                <Text style={styles.rowHint}>{copy.profileRemindersHint}</Text>
              </View>
              <ToggleSwitch
                value={reminders}
                label={copy.profileGameReminders}
                onPress={() => void toggleReminders()}
                colors={colors}
              />
            </View>
            <AccountRow
              icon="globe"
              label={copy.profileLanguage}
              hint={copy.profileLanguageHint}
              value={locale === 'en' ? copy.languageEnglish : copy.languageGreek}
              onPress={() => setLocale(locale === 'en' ? 'el' : 'en')}
              colors={colors}
              styles={styles}
            />
            <AccountRow
              icon="moon"
              label={copy.themeLabel}
              hint={copy.profileAppearanceHint}
              value={theme === 'dark' ? copy.themeDark : copy.themeLight}
              onPress={() => setThemePreference(theme === 'dark' ? 'light' : 'dark')}
              colors={colors}
              styles={styles}
            />
            <AccountRow
              icon="sliders"
              label={copy.appSettingsTitle}
              hint={copy.profileSettingsHint}
              onPress={() => router.push('/settings' as Href)}
              colors={colors}
              styles={styles}
            />
            <AccountRow
              icon="bell"
              label={copy.appNotificationsTitle}
              hint={copy.profileNotificationsHint}
              onPress={() => router.push('/notifications' as Href)}
              colors={colors}
              styles={styles}
              last
            />
          </View>

          <View style={styles.listCard}>
            <View style={styles.policiesHead}>
              <Text accessibilityRole="header" style={styles.policiesTitle}>
                {copy.profilePoliciesTitle}
              </Text>
              <Text style={styles.rowHint}>{copy.profilePoliciesSubtitle}</Text>
            </View>
            <AccountRow
              icon="shield"
              label={copy.legalPrivacyLink}
              hint={copy.profilePrivacyHint}
              onPress={() => router.push('/privacy' as Href)}
              colors={colors}
              styles={styles}
              first
            />
            <AccountRow
              icon="doc"
              label={copy.legalTermsLink}
              hint={copy.profileTermsHint}
              onPress={() => router.push('/terms' as Href)}
              colors={colors}
              styles={styles}
            />
            <AccountRow
              icon="help"
              label={copy.legalSupportLink}
              hint={copy.profileSupportHint}
              onPress={() => router.push('/support' as Href)}
              colors={colors}
              styles={styles}
              last
            />
          </View>

          <AccountRow
            icon="userx"
            label={copy.profileDeleteAccount}
            hint={copy.profileDeleteAccountHint}
            onPress={() => router.push('/account-deletion' as Href)}
            colors={colors}
            styles={styles}
            danger
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => void handleSignOut()}
            disabled={signingOut}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && { backgroundColor: colors.error },
            ]}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
              <Path
                d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"
                stroke={colors.errorText}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
            <Text style={styles.signOutText}>
              {signingOut ? copy.authSessionLoading : copy.authSignOut}
            </Text>
          </Pressable>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </Rise>
      </ScrollView>
    </View>
  );
}

function PlayerHero({
  colors,
  copy,
  locale,
  card,
  onEdit,
}: {
  colors: ThemeColors;
  copy: Copy;
  locale: Locale;
  card: PlayerCardData;
  onEdit: () => void;
}) {
  const styles = makeStyles(colors, locale);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { cardRef, busyAction, handleAction } = usePlayerCardActions(copy);
  const cardWidth = Math.min(width - 32, 420);
  const cardName = card.name.trim() || (locale === 'en' ? 'ONE MORE Player' : 'Παίκτης ONE MORE');
  return (
    <View
      accessibilityLabel={cardName}
      style={[styles.hero, { paddingTop: Math.max(insets.top, 12) + 10 }]}
    >
      <StageBackdrop
        id="profile-stage"
        colors={colors}
        height="100%"
        glowY="40%"
        glowStop={0.66}
        glowColor="#21402b"
        rise={320}
        variant={1}
        beamWidth={230}
      />
      <View style={[styles.heroHeader, { paddingHorizontal: 4 }]}>
        <BrandMark prominent />
        <View style={styles.heroSpacer} />
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editButton,
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
            <Path
              d="M4 20h4L19 9l-4-4L4 16z"
              stroke={colors.accentText}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.editText}>{copy.profileEdit}</Text>
        </Pressable>
      </View>

      <Rise
        delay={200}
        distance={16}
        style={{ width: cardWidth, aspectRatio: W / H, marginTop: 8 }}
      >
        <View nativeID="player-card-art" style={StyleSheet.absoluteFill}>
          <Svg
            ref={cardRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${W} ${H}`}
            accessibilityRole="image"
            accessibilityLabel={`${copy.profileShareCardTitle}: ${cardName}`}
          >
            <PlayerCardArt {...card} name={cardName} copy={copy} />
          </Svg>
        </View>
      </Rise>
      <Rise delay={320} distance={16} style={styles.shareWrap}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void handleAction('share')}
          disabled={busyAction !== null}
          style={({ pressed }) => [
            styles.shareButton,
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"
              stroke={colors.primaryButtonText}
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={styles.shareText}>{copy.profileShareCard}</Text>
        </Pressable>
      </Rise>
    </View>
  );
}

export function RoundButton({
  label,
  disabled,
  onPress,
  colors,
  styles,
  path,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  colors: ThemeColors;
  styles: Styles;
  path: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundButton,
        { opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d={path} stroke={colors.textPrimary} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

/** Shirt that drops in, sways (jr-sway) and pops its number on change (jr-numa). */
export function Jersey({
  colors,
  number,
  name,
  label,
}: {
  colors: ThemeColors;
  number: number;
  name: string;
  label: string;
}) {
  const drop = useEntrance(1000, 150, Easing.bezier(0.2, 1.2, 0.3, 1));
  const sway = useLoop(4200, { alternate: true });
  const pop = useEntrance(450, 0, Easing.bezier(0.2, 1.5, 0.3, 1), number);
  const surname = (name.trim().split(/\s+/u).pop() ?? '').toUpperCase().slice(0, 10);
  return (
    <Animated.View
      style={{
        width: 190,
        height: 190,
        alignItems: 'center',
        opacity: drop,
        transform: [
          { translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [-70, 0] }) },
          { scale: drop.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
          { rotate: drop.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '0deg'] }) },
        ],
      }}
    >
      <Animated.View
        style={{
          transform: [
            { translateY: -90 },
            {
              rotate: sway.interpolate({ inputRange: [0, 1], outputRange: ['-3.5deg', '3.5deg'] }),
            },
            { translateY: 90 },
          ],
        }}
      >
        <Svg
          width={190}
          height={180}
          viewBox="0 0 200 190"
          accessibilityRole="image"
          accessibilityLabel={label}
        >
          <Path
            d="M70 14 C82 26 118 26 130 14 L170 30 L194 70 L166 86 L154 66 L154 176 C154 181 150 184 146 184 L54 184 C50 184 46 181 46 176 L46 66 L34 86 L6 70 L30 30 Z"
            fill={colors.primaryButton}
            stroke="#0c1210"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          <Path
            d="M100 24 L154 66 L154 176 C154 181 150 184 146 184 L100 184 Z"
            fill="#0c1210"
            opacity={0.07}
          />
          <Path d="M70 14 C82 32 118 32 130 14 L123 11 C113 24 87 24 77 11 Z" fill="#0c1210" />
          <Polygon points="6,70 34,86 38,79 10,63" fill="#0c1210" />
          <Polygon points="194,70 166,86 162,79 190,63" fill="#0c1210" />
          <Path d="M46 172 L154 172" stroke="#0c1210" strokeWidth={2.5} opacity={0.5} />
          {surname ? (
            <SvgText
              x="100"
              y="72"
              textAnchor="middle"
              fontSize="17"
              fontWeight="600"
              letterSpacing="3"
              fill="#0c1210"
              fontFamily="Barlow_600SemiBold"
            >
              {surname}
            </SvgText>
          ) : null}
        </Svg>
        <Animated.Text
          style={[
            jerseyStyles.number,
            {
              transform: [
                { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
              ],
            },
          ]}
        >
          {number}
        </Animated.Text>
      </Animated.View>
      <JerseyFloor />
    </Animated.View>
  );
}

function JerseyFloor() {
  const sway = useLoop(4200, { alternate: true });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        jerseyStyles.floor,
        {
          transform: [
            { translateX: sway.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] }) },
            { scaleX: sway.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="jersey-floor" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#000000" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="20" fill="url(#jersey-floor)" />
      </Svg>
    </Animated.View>
  );
}

/** Tappable pitch: zone bands plus the shirt-number marker gliding to the chosen zone. */
export function PositionPitch({
  colors,
  copy,
  locale,
  position,
  number,
  onSelect,
}: {
  colors: ThemeColors;
  copy: Copy;
  locale: Locale;
  position: Position;
  number: number;
  onSelect: (value: Position) => void;
}) {
  const [height, setHeight] = useState(0);
  const zone = zones.find((item) => item.position === position);
  const centre = zone?.centre ?? 50;
  const [marker] = useState(() => new Animated.Value(centre));
  const [trail] = useState(() => new Animated.Value(centre));
  const ring = useLoop(1800, { easing: Easing.out(Easing.ease) });
  useEffect(() => {
    const motion = Animated.parallel([
      Animated.timing(marker, {
        toValue: centre,
        duration: 700,
        easing: Easing.bezier(0.3, 1.35, 0.4, 1),
        useNativeDriver: true,
      }),
      Animated.timing(trail, {
        toValue: centre,
        duration: 700,
        delay: 60,
        easing: Easing.bezier(0.3, 1.35, 0.4, 1),
        useNativeDriver: true,
      }),
    ]);
    motion.start();
    return () => motion.stop();
  }, [centre, marker, trail]);
  const toY = (value: Animated.Value) => Animated.multiply(value, height / 100);
  const font = bodyFont(locale, 'semibold');
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={copy.profilePosition}
      onLayout={(event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height)}
      style={pitchStyles.pitch}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 200 180"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        {Array.from({ length: 12 }, (_, index) => (
          <Rect
            key={index}
            x="0"
            y={index * 16.2}
            width="200"
            height="16.2"
            fill={index % 2 ? '#27432f' : '#2c4a35'}
          />
        ))}
      </Svg>
      {height > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[pitchStyles.heat, { transform: [{ translateY: toY(marker) }] }]}
        >
          <Svg width={220} height={150} viewBox="0 0 220 150">
            <Defs>
              <RadialGradient id="pitch-heat" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={colors.primaryButton} stopOpacity="0.38" />
                <Stop offset="1" stopColor={colors.primaryButton} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect width="220" height="150" fill="url(#pitch-heat)" />
          </Svg>
        </Animated.View>
      ) : null}
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 200 180"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        <G fill="none" stroke="#9cc4a6" strokeWidth={1.3} opacity={0.55}>
          <Rect x="6" y="6" width="188" height="168" rx="3" />
          <Line x1="6" y1="90" x2="194" y2="90" />
          <Circle cx="100" cy="90" r="18" />
          <Rect x="50" y="6" width="100" height="30" />
          <Rect x="78" y="6" width="44" height="12" />
          <Path d="M84 36 A18 18 0 0 0 116 36" />
          <Rect x="50" y="144" width="100" height="30" />
          <Rect x="78" y="162" width="44" height="12" />
          <Path d="M84 144 A18 18 0 0 1 116 144" />
          <Path d="M6 11 A5 5 0 0 0 11 6 M189 6 A5 5 0 0 0 194 11 M194 169 A5 5 0 0 0 189 174 M11 174 A5 5 0 0 0 6 169" />
        </G>
        <G fill="#9cc4a6" opacity={0.55}>
          <Circle cx="100" cy="90" r="1.6" />
          <Circle cx="100" cy="27" r="1.6" />
          <Circle cx="100" cy="153" r="1.6" />
        </G>
        <Rect
          x="86"
          y="1.5"
          width="28"
          height="4.5"
          rx="1"
          fill="none"
          stroke="#f2f5ec"
          strokeWidth={1.2}
          opacity={0.7}
        />
        <Rect
          x="86"
          y="174"
          width="28"
          height="4.5"
          rx="1"
          fill="none"
          stroke="#f2f5ec"
          strokeWidth={1.2}
          opacity={0.7}
        />
        <G fill="#f2f5ec" opacity={0.28}>
          {[
            [60, 30],
            [140, 30],
            [52, 78],
            [148, 78],
            [40, 122],
            [80, 128],
            [120, 128],
            [160, 122],
          ].map(([cx, cy]) => (
            <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.5" />
          ))}
        </G>
      </Svg>
      {zones.map((item) => {
        const selected = item.position === position;
        return (
          <Pressable
            key={item.position}
            accessibilityRole="radio"
            accessibilityLabel={positionLabel(item.position, copy)}
            accessibilityState={{ checked: selected }}
            aria-checked={selected}
            onPress={() => onSelect(item.position)}
            style={({ pressed }) => [
              pitchStyles.band,
              {
                top: `${item.top}%` as DimensionValue,
                height: `${item.height}%` as DimensionValue,
              },
              pressed && !selected && pitchStyles.bandHover,
              selected && pitchStyles.bandOn,
            ]}
          >
            {selected ? (
              <Svg
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                style={StyleSheet.absoluteFill}
              >
                <Defs>
                  <LinearGradient id="pitch-band-on" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor={colors.primaryButton} stopOpacity="0.24" />
                    <Stop offset="0.7" stopColor={colors.primaryButton} stopOpacity="0.03" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#pitch-band-on)" />
              </Svg>
            ) : null}
            <View
              style={[
                pitchStyles.tag,
                selected && {
                  backgroundColor: colors.primaryButton,
                  borderColor: colors.primaryButton,
                },
              ]}
            >
              <Text
                style={[
                  pitchStyles.tagText,
                  { fontFamily: font, color: selected ? '#0c1210' : '#e6eedd' },
                ]}
              >
                {item.short}
              </Text>
            </View>
            <Text
              style={[
                pitchStyles.bandText,
                { fontFamily: font, color: selected ? colors.primaryButton : '#e6eedd' },
              ]}
            >
              {positionLabel(item.position, copy)}
            </Text>
          </Pressable>
        );
      })}
      {height > 0 ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[pitchStyles.trail, { transform: [{ translateY: toY(trail) }] }]}
          />
          <Animated.View
            pointerEvents="none"
            style={[pitchStyles.markerWrap, { transform: [{ translateY: toY(marker) }] }]}
          >
            <Animated.View
              style={[
                pitchStyles.markerPulse,
                {
                  backgroundColor: colors.primaryButton,
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                  transform: [
                    { scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.72] }) },
                  ],
                },
              ]}
            />
            <View style={[pitchStyles.marker, { backgroundColor: colors.primaryButton }]}>
              <Text style={pitchStyles.markerText}>{number}</Text>
            </View>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

export function DayButton({
  letter,
  label,
  on,
  onPress,
  colors,
  styles,
}: {
  letter: string;
  label: string;
  on: boolean;
  onPress: () => void;
  colors: ThemeColors;
  styles: Styles;
}) {
  const scale = useSpring(on ? 1.06 : 1);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      aria-checked={on}
      onPress={onPress}
      style={styles.dayCell}
    >
      <Animated.View
        style={[
          styles.day,
          on && { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.dayText, on && { color: colors.primaryButtonText }]}>{letter}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function FormatCard({
  format,
  players,
  on,
  onPress,
  colors,
  styles,
}: {
  format: Format;
  players: string;
  on: boolean;
  onPress: () => void;
  colors: ThemeColors;
  styles: Styles;
}) {
  const tick = useSpring(on ? 1 : 0);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={`${format}v${format}, ${players}`}
      accessibilityState={{ checked: on }}
      aria-checked={on}
      onPress={onPress}
      style={({ pressed }) => [
        styles.formatCard,
        on && { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
        { transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      <MiniPitch color={on ? colors.primaryButtonText : colors.pitchLine} width={30} height={22} />
      <View>
        <Text
          style={[styles.formatValue, on && { color: colors.primaryButtonText }]}
        >{`${format}v${format}`}</Text>
        <Text style={[styles.formatPlayers, on && { color: '#2c3a16' }]}>{players}</Text>
      </View>
      <Animated.View
        style={[
          styles.tick,
          {
            opacity: tick,
            transform: [{ scale: tick.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          },
        ]}
      >
        <CheckGlyph color={colors.primaryButton} />
      </Animated.View>
    </Pressable>
  );
}

export function AnyPill({
  label,
  on,
  onPress,
  colors,
  styles,
}: {
  label: string;
  on: boolean;
  onPress: () => void;
  colors: ThemeColors;
  styles: Styles;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      onPress={onPress}
      style={({ pressed }) => [
        styles.anyPill,
        on && { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
        { transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      <View
        style={[
          styles.anyCheck,
          on && {
            backgroundColor: colors.primaryButtonText,
            borderColor: colors.primaryButtonText,
          },
        ]}
      >
        {on ? <CheckGlyph color={colors.primaryButton} /> : null}
      </View>
      <Text style={[styles.anyText, on && { color: colors.primaryButtonText }]}>{label}</Text>
    </Pressable>
  );
}

const MENU_ICONS = {
  clock: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  moon: 'M20 14A8 8 0 0110 4a8 8 0 1010 10z',
  sliders: 'M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M8 15v4',
  bell: 'M6 16v-5a6 6 0 1112 0v5l1.5 2h-15L6 16zM10 20a2 2 0 004 0',
  shield: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z',
  doc: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
  help: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9.5 9.5a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5M12 17h.01',
  userx: 'M10 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM3 20a7 7 0 0114 0M16 9l5 5M21 9l-5 5',
} as const;
type MenuIconName = keyof typeof MENU_ICONS;

function MenuIcon({
  name,
  colors,
  styles,
  danger,
}: {
  name: MenuIconName;
  colors: ThemeColors;
  styles: Styles;
  danger?: boolean;
}) {
  return (
    <View style={styles.menuIcon} importantForAccessibility="no-hide-descendants">
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path
          d={MENU_ICONS[name]}
          stroke={danger ? colors.errorText : colors.accentText}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function AccountRow({
  icon,
  label,
  hint,
  value,
  onPress,
  colors,
  styles,
  last,
  first,
  danger,
}: {
  icon: MenuIconName;
  label: string;
  hint?: string;
  value?: string;
  onPress: () => void;
  colors: ThemeColors;
  styles: Styles;
  last?: boolean;
  first?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}: ${value}` : label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        danger ? styles.dangerCard : !last && styles.rowDivider,
        first && styles.rowFirst,
        pressed && { backgroundColor: danger ? colors.error : colors.cardTop },
      ]}
    >
      <MenuIcon name={icon} colors={colors} styles={styles} danger={danger} />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, danger && { color: colors.errorText }]}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Chevron color={danger ? colors.errorText : colors.textSecondary} />
    </Pressable>
  );
}

function ToggleSwitch({
  value,
  label,
  onPress,
  colors,
}: {
  value: boolean;
  label: string;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const knob = useSpring(value ? 22 : 0);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={onPress}
      style={[
        switchStyles.track,
        {
          backgroundColor: value ? colors.primaryButton : colors.option,
          borderColor: value ? colors.primaryButton : colors.borderStrong,
        },
      ]}
    >
      <Animated.View
        style={[
          switchStyles.knob,
          {
            backgroundColor: value ? colors.primaryButtonText : colors.textSecondary,
            transform: [{ translateX: knob }],
          },
        ]}
      />
    </Pressable>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  trailing,
  styles,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  styles: Styles;
}) {
  return (
    <View style={styles.cardHeader}>
      <View style={styles.cardIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text accessibilityRole="header" style={styles.cardTitle}>
          {title}
        </Text>
        <Text style={styles.muted}>{subtitle}</Text>
      </View>
      {trailing}
    </View>
  );
}

export function CardGradient({ id, colors }: { id: string; colors: ThemeColors }) {
  return (
    <Svg
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.cardTop} />
          <Stop offset="1" stopColor={colors.cardBottom} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

function useSpring(target: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(target));
  useEffect(() => {
    const animation = Animated.spring(value, {
      toValue: target,
      speed: 18,
      bounciness: 10,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [target, value]);
  return value;
}

const footPath =
  'M9.5 22c-2.6 0-3.7-2.4-3.4-5.3.3-2.9 1.3-4.9 1.3-7.7C7.4 6.7 8.7 5.2 10.7 5.2s3.3 1.5 3.1 4.2c-.2 2.8-1.4 4.3-1.4 7.2 0 2.9-.9 5.4-2.9 5.4z';

function FootShape({ color }: { color: string }) {
  return (
    <>
      <Path d={footPath} fill={color} />
      <Circle cx="9.2" cy="2.9" r="1.3" fill={color} />
      <Circle cx="12" cy="2.6" r="1.1" fill={color} />
      <Circle cx="14.3" cy="3.4" r="1" fill={color} />
    </>
  );
}

export function FootIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <FootShape color={color} />
    </Svg>
  );
}

export function FootGlyph({ foot, color }: { foot: StrongFoot; color: string }) {
  if (foot === 'both') {
    return (
      <Svg width={28} height={22} viewBox="0 0 30 24">
        <G transform="translate(17 1) scale(-0.85 0.85)">
          <FootShape color={color} />
        </G>
        <G transform="translate(12 1) scale(0.85)">
          <FootShape color={color} />
        </G>
      </Svg>
    );
  }
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <G transform={foot === 'left' ? 'translate(24 0) scale(-1 1)' : undefined}>
        <FootShape color={color} />
      </G>
    </Svg>
  );
}

export function LevelGlyph({ bars, color }: { bars: number; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Rect x="4" y="14" width="4" height="7" rx="1.5" fill={color} />
      <Rect
        x="10.5"
        y="9"
        width="4"
        height="12"
        rx="1.5"
        fill={color}
        opacity={bars >= 2 ? 1 : 0.3}
      />
      <Rect
        x="17"
        y="4"
        width="4"
        height="17"
        rx="1.5"
        fill={color}
        opacity={bars >= 3 ? 1 : 0.3}
      />
    </Svg>
  );
}

export function PinIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21z"
        stroke={color}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="9.5" r="2.5" stroke={color} strokeWidth={2.2} />
    </Svg>
  );
}

export function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="5" width="17" height="15.5" rx="3" stroke={color} strokeWidth={2.2} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function MiniPitch({
  color,
  width,
  height,
}: {
  color: string;
  width: number;
  height: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 30 22" fill="none">
      <Rect x="1" y="1" width="28" height="20" rx="3" stroke={color} strokeWidth={1.6} />
      <Path d="M15 1v20" stroke={color} strokeWidth={1.6} />
      <Circle cx="15" cy="11" r="3.5" stroke={color} strokeWidth={1.6} />
    </Svg>
  );
}

function CheckGlyph({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke={color}
        strokeWidth={3.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function Chevron({ color }: { color: string }) {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 6l6 6-6 6"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ShieldOutline({ color, dashed }: { color: string; dashed: boolean }) {
  return (
    <Svg width={40} height={44} viewBox="0 0 100 110">
      <Path
        d="M50 4 L92 18 V54 C92 82 72 98 50 106 C28 98 8 82 8 54 V18 Z"
        fill="rgba(207,255,74,0.1)"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={dashed ? [10, 8] : undefined}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function emptyForm(language: Locale): ProfileInput {
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
export function isPosition(value: string | null): value is Position {
  return positions.some((item) => item === value);
}
export function isSkillLevel(value: string | null): value is SkillLevel {
  return skillLevels.some((item) => item === value);
}
export function isStrongFoot(value: string | null | undefined): value is StrongFoot {
  return strongFeet.some((item) => item === value);
}
export function isFormat(value: number): value is Format {
  return formats.some((item) => item === value);
}
export function positionLabel(value: Position, copy: Copy) {
  switch (value) {
    case 'goalkeeper':
      return copy.profileGoalkeeper;
    case 'defender':
      return copy.profileDefender;
    case 'midfielder':
      return copy.profileMidfielder;
    case 'forward':
      return copy.profileStriker;
    case 'any':
      return copy.profileAnyPosition;
  }
}
export function levelLabel(value: SkillLevel, copy: Copy) {
  switch (value) {
    case 'beginner':
      return copy.profileLevelCasual;
    case 'intermediate':
      return copy.profileLevelRegular;
    case 'advanced':
      return copy.profileLevelCompetitive;
  }
}
export function strongFootLabel(value: StrongFoot, copy: Copy) {
  switch (value) {
    case 'left':
      return copy.profileLeftFoot;
    case 'right':
      return copy.profileRightFoot;
    case 'both':
      return copy.profileBothFeet;
  }
}
export function footShort(value: StrongFoot, copy: Copy) {
  switch (value) {
    case 'left':
      return copy.profileFootLeft;
    case 'right':
      return copy.profileFootRight;
    case 'both':
      return copy.profileFootBoth;
  }
}

export type Styles = ReturnType<typeof makeStyles>;

export function makeStyles(colors: ThemeColors, locale: Locale) {
  const body = bodyFont(locale);
  const medium = bodyFont(locale, 'medium');
  const semibold = bodyFont(locale, 'semibold');
  const display = displayFont(locale);
  const dark = colors.background === '#0C1210';
  return StyleSheet.create({
    root: { flex: 1, minHeight: 0, backgroundColor: colors.background },
    stateRoot: {
      flex: 1,
      minHeight: 0,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
    stateCard: { width: '100%', maxWidth: 480, gap: 18 },
    skeletonWrap: { width: '100%', maxWidth: 480 },
    scroll: { flex: 1 },
    content: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 22, paddingBottom: 28 },
    hero: {
      overflow: 'hidden',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 20,
    },
    heroHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroSpacer: { flex: 1 },
    shareWrap: { width: '100%', alignItems: 'center', marginTop: 10 },
    shareButton: {
      width: '100%',
      maxWidth: 340,
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 16,
      backgroundColor: colors.primaryButton,
    },
    shareText: {
      color: colors.primaryButtonText,
      fontFamily: semibold,
      fontSize: 16,
      fontWeight: '600',
    },
    heroTitle: {
      flex: 1,
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 24,
      lineHeight: 26,
      fontWeight: '800',
    },
    editButton: {
      height: 44,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: dark ? 'rgba(12,18,16,0.5)' : colors.surface,
    },
    editText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 15, fontWeight: '600' },
    iconGhost: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: dark ? 'rgba(12,18,16,0.5)' : colors.surface,
    },
    jerseyRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      marginTop: 6,
    },
    roundButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      backgroundColor: dark ? 'rgba(12,18,16,0.55)' : colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playerName: {
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 42,
      lineHeight: 44,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 6,
    },
    playerLine: {
      color: colors.textSecondary,
      fontFamily: body,
      fontSize: 16,
      textAlign: 'center',
    },
    heroChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
      marginTop: 4,
    },
    heroChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    heroChipText: {
      color: colors.textPrimary,
      fontFamily: semibold,
      fontSize: 14,
      fontWeight: '600',
    },
    card: {
      marginHorizontal: 18,
      padding: 14,
      gap: 14,
      borderRadius: 22,
      borderWidth: 1.5,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: 'rgba(207,255,74,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 24,
      lineHeight: 25,
      fontWeight: '800',
    },
    cardTrailing: {
      color: colors.accentText,
      fontFamily: display,
      fontSize: 22,
      lineHeight: 23,
      fontWeight: '800',
    },
    muted: { color: colors.textSecondary, fontFamily: body, fontSize: 14, lineHeight: 19 },
    fieldGroup: { gap: 8 },
    fieldLabel: {
      color: colors.textSecondary,
      fontFamily: semibold,
      fontSize: 14,
      fontWeight: '600',
    },
    days: { flexDirection: 'row', gap: 6 },
    dayCell: { flex: 1, minWidth: 0 },
    day: {
      width: '100%',
      aspectRatio: 1,
      minHeight: 40,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 15, fontWeight: '600' },
    anyPill: {
      height: 44,
      paddingLeft: 8,
      paddingRight: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
    },
    anyCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: '#6f8a76',
      alignItems: 'center',
      justifyContent: 'center',
    },
    anyText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 14, fontWeight: '600' },
    formats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    formatCard: {
      flexGrow: 1,
      flexBasis: '45%',
      minHeight: 78,
      paddingVertical: 10,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
    },
    formatValue: {
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 26,
      lineHeight: 27,
      fontWeight: '800',
    },
    formatPlayers: { color: colors.textSecondary, fontFamily: body, fontSize: 13 },
    tick: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#0c1210',
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: { marginHorizontal: 18, gap: 10 },
    sectionTitle: {
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 26,
      lineHeight: 27,
      fontWeight: '800',
    },
    emptyTeam: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 18,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.optionBorder,
    },
    rowCopy: { flex: 1, minWidth: 0, gap: 2 },
    rowTitle: { color: colors.textPrimary, fontFamily: medium, fontSize: 16, fontWeight: '500' },
    rowValue: { color: colors.textSecondary, fontFamily: body, fontSize: 15 },
    smallLime: {
      height: 44,
      paddingHorizontal: 14,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryButton,
    },
    smallLimeText: {
      color: colors.primaryButtonText,
      fontFamily: semibold,
      fontSize: 15,
      fontWeight: '600',
    },
    listCard: {
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.well,
      overflow: 'hidden',
    },
    row: {
      minHeight: 64,
      paddingHorizontal: 14,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.navBorder },
    email: { color: colors.textMuted, fontFamily: body, fontSize: 13 },
    rowHint: { color: colors.textSecondary, fontFamily: body, fontSize: 13, lineHeight: 18 },
    rowFirst: { borderTopWidth: 1, borderTopColor: colors.navBorder },
    menuIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardTop,
    },
    policiesHead: { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10, gap: 2 },
    policiesTitle: {
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 22,
      lineHeight: 24,
      fontWeight: '800',
    },
    dangerCard: {
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.errorText,
      backgroundColor: colors.error,
    },
    signOutButton: {
      minHeight: 56,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: colors.errorText,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    signOutText: {
      color: colors.errorText,
      fontFamily: semibold,
      fontSize: 17,
      fontWeight: '600',
    },
    modalRoot: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
    scrim: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: 'rgba(5,8,6,0.7)',
    },
    sheet: {
      width: '100%',
      maxWidth: 480,
      maxHeight: '88%',
      paddingTop: 10,
      paddingHorizontal: 18,
      paddingBottom: 20,
      gap: 16,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderTopWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: dark ? '#131D17' : colors.surface,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.borderStrong,
    },
    sheetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    sheetTitle: {
      flexShrink: 1,
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 28,
      lineHeight: 30,
      fontWeight: '800',
    },
    sheetClose: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetBody: { gap: 16 },
    sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sheetOption: {
      flexGrow: 1,
      flexBasis: '45%',
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetOptionText: {
      color: colors.textPrimary,
      fontFamily: semibold,
      fontSize: 15,
      fontWeight: '600',
    },
    sheetSave: {
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryButton,
    },
    sheetSaveText: {
      color: colors.primaryButtonText,
      fontFamily: semibold,
      fontSize: 17,
      fontWeight: '600',
    },
  });
}

const jerseyStyles = StyleSheet.create({
  number: {
    position: 'absolute',
    top: 78,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#0c1210',
    fontFamily: 'BarlowCondensed_800ExtraBold',
    fontSize: 80,
    lineHeight: 84,
    fontWeight: '800',
  },
  floor: { position: 'absolute', left: 30, right: 30, bottom: -8, height: 18 },
});
const pitchStyles = StyleSheet.create({
  pitch: { width: '100%', aspectRatio: 10 / 9, borderRadius: 18, overflow: 'hidden' },
  heat: { position: 'absolute', top: -75, left: '50%', marginLeft: -110, width: 220, height: 150 },
  band: {
    position: 'absolute',
    left: '3%',
    right: '3%',
    paddingHorizontal: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  bandHover: { backgroundColor: 'rgba(242,245,236,0.06)', borderColor: 'rgba(242,245,236,0.18)' },
  bandOn: { borderColor: 'rgba(207,255,74,0.55)' },
  tag: {
    minWidth: 34,
    height: 26,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(242,245,236,0.25)',
    backgroundColor: 'rgba(12,18,16,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: { fontSize: 13, fontWeight: '600' },
  bandText: {
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  trail: {
    position: 'absolute',
    top: -29,
    left: '50%',
    marginLeft: -29,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(207,255,74,0.45)',
  },
  markerWrap: {
    position: 'absolute',
    top: -25,
    left: '50%',
    marginLeft: -25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25 },
  marker: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    borderColor: '#0c1210',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  markerText: {
    color: '#0c1210',
    fontFamily: 'BarlowCondensed_800ExtraBold',
    fontSize: 25,
    lineHeight: 27,
    fontWeight: '800',
  },
});
const switchStyles = StyleSheet.create({
  track: {
    width: 54,
    height: 32,
    paddingHorizontal: 3,
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
  },
  knob: { width: 24, height: 24, borderRadius: 12 },
});
