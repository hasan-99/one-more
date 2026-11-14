import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Circle,
  ClipPath,
  Defs,
  LinearGradient,
  Path,
  Polygon,
  Rect,
  Stop,
  Svg,
  Text as SvgText,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/components/toast/ToastProvider';
import { loadMatchFilters, type MatchArea, type MatchCity } from '@/features/matches/match-service';
import {
  createTeamWithDesign,
  type TeamCrestColor,
  type TeamCrestPattern,
  type TeamCrestShape,
} from '@/features/teams/team-service';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

const palette = [
  { color: '#cfff4a', label: 'teamWizardLime' },
  { color: '#f2f5ec', label: 'teamWizardWhite' },
  { color: '#ffa94d', label: 'teamWizardOrange' },
  { color: '#5cc8ff', label: 'teamWizardSky' },
  { color: '#ff8fc0', label: 'teamWizardPink' },
  { color: '#b79cff', label: 'teamWizardViolet' },
] as const;
const formats = [5, 7, 8, 11] as const;
type Copy = { [Key in keyof typeof translations.en]: string };
const crestPaths: Record<TeamCrestShape, string> = {
  shield: 'M50 4 L92 18 V54 C92 82 72 98 50 106 C28 98 8 82 8 54 V18 Z',
  round: 'M50 4 A46 46 0 1 1 49.9 4 Z',
  hex: 'M50 5 L92 29 V81 L50 105 L8 81 V29 Z',
};
export default function CreateTeamScreen() {
  const { colors, locale } = useAppPreferences();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const copy = translations[locale];
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [areas, setAreas] = useState<MatchArea[]>([]);
  const [cities, setCities] = useState<MatchCity[]>([]);
  const [areaId, setAreaId] = useState('');
  const [crestShape, setCrestShape] = useState<TeamCrestShape>('shield');
  const [crestColor, setCrestColor] = useState<TeamCrestColor>('#cfff4a');
  const [crestPattern, setCrestPattern] = useState<TeamCrestPattern>('plain');
  const [format, setFormat] = useState<(typeof formats)[number]>(5);
  const [openToPlayers, setOpenToPlayers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const city = useMemo(
    () => cities.find((item) => item.slug === 'nicosia') ?? cities[0] ?? null,
    [cities],
  );
  const visibleAreas = useMemo(
    () => areas.filter((item) => !city || item.city_id === city.id),
    [areas, city],
  );
  const selectedArea = visibleAreas.find((item) => item.id === areaId) ?? null;
  const areaName = selectedArea ? (locale === 'el' ? selectedArea.name_el : selectedArea.name_en) : '';
  const initials = useMemo(() => {
    const words = name.trim().split(/\s+/u).filter(Boolean);
    return words.length > 1
      ? `${Array.from(words[0])[0] ?? ''}${Array.from(words[1])[0] ?? ''}`.toUpperCase()
      : Array.from(words[0] ?? '').slice(0, 2).join('').toUpperCase() || 'FC';
  }, [name]);
  const styles = useMemo(() => makeStyles(colors, width), [colors, width]);

  const loadAreas = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const result = await loadMatchFilters();
      const selectedCity = result.cities.find((item) => item.slug === 'nicosia') ?? result.cities[0];
      const nicosiaAreas = result.areas.filter((item) => item.city_id === selectedCity?.id);
      setCities(result.cities);
      setAreas(result.areas);
      setAreaId((current) => current || nicosiaAreas[0]?.id || '');
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = setTimeout(() => void loadAreas(), 0);
    return () => clearTimeout(task);
  }, [loadAreas]);

  const continueStep = () => {
    if (step === 1) {
      if (name.trim().length < 2) return showToast(copy.teamWizardNameRequired, 'error');
      if (name.trim().length > 24) return showToast(copy.teamWizardNameTooLong, 'error');
      if (!areaId) return showToast(copy.teamWizardAreaRequired, 'error');
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }
    void onCreate();
  };

  const onCreate = async () => {
    if (!city || !selectedArea) {
      showToast(copy.teamWizardMissingData, 'error');
      return;
    }
    setSaving(true);
    try {
      const teamId = await createTeamWithDesign({
        name: name.trim(),
        cityId: city.id,
        areaId: selectedArea.id,
        crestShape,
        crestColor,
        crestPattern,
        format,
        openToPlayers,
      });
      setCreatedTeamId(teamId);
      showToast(copy.teamCreateSuccess, 'success');
    } catch {
      showToast(copy.teamWizardCreateError, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (createdTeamId) {
    return (
      <View style={[styles.root, styles.successRoot]}>
        <TeamCreateAtmosphere colors={colors} />
        <View style={styles.successContent}>
          <FloatingCrest>
            <Crest
            color={crestColor}
            colors={colors}
            initials={initials}
            pattern={crestPattern}
            shape={crestShape}
            size={132}
            />
          </FloatingCrest>
          <Text accessibilityRole="header" style={styles.successTitle}>
            {copy.teamWizardCreatedTitle}
          </Text>
          <Text style={styles.successName}>{name.trim()}</Text>
          <Text style={styles.successBody}>{copy.teamWizardCreatedBody}</Text>
          <View style={styles.successChips}>
            <InfoChip label={areaName} colors={colors} />
            <InfoChip label={`${format}v${format}`} colors={colors} />
            <InfoChip
              label={openToPlayers ? copy.teamWizardOpenTitle : copy.teamWizardInviteOnly}
              colors={colors}
              accent
            />
          </View>
          <PrimaryButton
            label={copy.teamWizardViewTeam}
            onPress={() => router.replace(`/teams/${createdTeamId}` as Href)}
            colors={colors}
            styles={styles}
          />
          <Pressable onPress={() => router.replace('/teams' as Href)} style={styles.textButton}>
            <Text style={styles.textButtonLabel}>{copy.teamWizardDone}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const stepTitle =
    step === 1 ? copy.teamWizardStepOne : step === 2 ? copy.teamWizardStepTwo : copy.teamWizardStepThree;

  return (
    <View style={styles.root} nativeID="team-create-root">
      <TeamCreateAtmosphere colors={colors} />
      <KeyboardAvoidingView
        style={styles.keyboardFrame}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.teamWizardClose}
            onPress={() => router.replace('/teams' as Href)}
            style={styles.closeButton}
          >
            <CloseMark color={colors.textSecondary} />
          </Pressable>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
            {copy.teamCreateTitle}
          </Text>
          <Text style={styles.stepLabel}>{copy.teamWizardStep.replace('{{step}}', String(step))}</Text>
        </View>

        <View accessibilityLabel={copy.teamWizardPreview} style={styles.previewStage}>
          <Animated.View style={[styles.previewHalo, { backgroundColor: crestColor }]} />
          <Animated.View style={styles.previewCrest}>
            <FloatingCrest>
            <Crest
              color={crestColor}
              colors={colors}
              initials={initials}
              pattern={crestPattern}
              shape={crestShape}
              size={86}
            />
            </FloatingCrest>
          </Animated.View>
          <Text numberOfLines={1} style={styles.previewName}>
            {name.trim() || copy.teamWizardNamePlaceholder}
          </Text>
          <Text numberOfLines={1} style={styles.previewDetails}>
            {`${areaName || copy.teamWizardArea} · ${format}v${format}`}
          </Text>
        </View>

        <View accessibilityLabel={copy.teamWizardStep.replace('{{step}}', String(step))} style={styles.progressRow}>
          {[1, 2, 3].map((index) => (
            <View
              key={index}
              style={[styles.progressTrack, index <= step && { backgroundColor: colors.primaryButton }]}
            />
          ))}
        </View>

        <ScrollView
          key={step}
          nativeID="team-create-step"
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepHeadingRow}>
            <Text accessibilityRole="header" style={styles.stepTitle}>
              {stepTitle}
            </Text>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{`0${step}`}</Text>
            </View>
          </View>
          {loadFailed ? (
            <View style={styles.loadMessage}>
              <Text accessibilityRole="alert" style={styles.helperText}>
                {copy.teamWizardLoadError}
              </Text>
              <SecondaryButton
                label={copy.teamWizardRetry}
                onPress={() => void loadAreas()}
                colors={colors}
                styles={styles}
              />
            </View>
          ) : loading ? (
            <View style={styles.loadMessage}>
              <ActivityIndicator color={colors.accentText} />
              <Text style={styles.helperText}>{copy.teamWizardArea}</Text>
            </View>
          ) : step === 1 ? (
            <StepName
              areaId={areaId}
              areas={visibleAreas}
              copy={copy}
              colors={colors}
              locale={locale}
              name={name}
              onChangeName={setName}
              onSelectArea={setAreaId}
              styles={styles}
            />
          ) : step === 2 ? (
            <StepCrest
              color={crestColor}
              colors={colors}
              copy={copy}
              onPattern={setCrestPattern}
              onShape={setCrestShape}
              onColor={setCrestColor}
              pattern={crestPattern}
              shape={crestShape}
              styles={styles}
            />
          ) : (
            <StepPlay
              colors={colors}
              copy={copy}
              format={format}
              onFormat={setFormat}
              onToggle={setOpenToPlayers}
              open={openToPlayers}
              styles={styles}
            />
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {step > 1 ? (
            <SecondaryButton
              label={copy.teamWizardBack}
              onPress={() => setStep((value) => Math.max(1, value - 1))}
              colors={colors}
              styles={styles}
              full={false}
            />
          ) : null}
          <PrimaryButton
            label={
              saving
                ? copy.teamWizardCreateSaving
                : step === 3
                  ? copy.teamWizardCreate
                  : copy.teamWizardNext
            }
            onPress={continueStep}
            colors={colors}
            styles={styles}
            disabled={saving || loading || loadFailed || (step === 1 && (!name.trim() || !areaId))}
            loading={saving}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function StepName({
  areaId,
  areas,
  copy,
  colors,
  locale,
  name,
  onChangeName,
  onSelectArea,
  styles,
}: {
  areaId: string;
  areas: MatchArea[];
  copy: Copy;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  locale: 'en' | 'el';
  name: string;
  onChangeName: (value: string) => void;
  onSelectArea: (value: string) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.helperText}>{copy.teamWizardNameHint}</Text>
      <View style={styles.fieldBlock}>
        <View style={styles.fieldLabelRow}>
          <Text nativeID="team-name-label" style={styles.fieldLabel}>
            {copy.teamWizardName}
          </Text>
          <Text style={styles.characterCount}>{`${name.length}/24`}</Text>
        </View>
        <TextInput
          accessibilityLabel={copy.teamWizardName}
          accessibilityHint={copy.teamWizardNameHint}
          value={name}
          onChangeText={onChangeName}
          maxLength={24}
          placeholder={copy.teamWizardNamePlaceholder}
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          style={styles.field}
        />
      </View>
      <View style={styles.fieldBlock}>
        <View>
          <Text style={styles.fieldLabel}>{copy.teamWizardArea}</Text>
          <Text style={styles.fieldHint}>{copy.teamWizardAreaHint}</Text>
        </View>
        <View style={styles.areaGrid}>
          {areas.map((item) => {
            const selected = item.id === areaId;
            return (
              <ChoiceButton
                key={item.id}
                label={locale === 'el' ? item.name_el : item.name_en}
                selected={selected}
                onPress={() => onSelectArea(item.id)}
                colors={colors}
                styles={styles}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

function StepCrest({
  color,
  colors,
  copy,
  onPattern,
  onShape,
  onColor,
  pattern,
  shape,
  styles,
}: {
  color: TeamCrestColor;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  copy: Copy;
  onPattern: (value: TeamCrestPattern) => void;
  onShape: (value: TeamCrestShape) => void;
  onColor: (value: TeamCrestColor) => void;
  pattern: TeamCrestPattern;
  shape: TeamCrestShape;
  styles: ReturnType<typeof makeStyles>;
}) {
  const shapeOptions: { key: TeamCrestShape; label: string }[] = [
    { key: 'shield', label: copy.teamWizardShield },
    { key: 'round', label: copy.teamWizardRound },
    { key: 'hex', label: copy.teamWizardHex },
  ];
  const patterns: { key: TeamCrestPattern; label: string }[] = [
    { key: 'plain', label: copy.teamWizardPlain },
    { key: 'stripes', label: copy.teamWizardStripes },
    { key: 'half', label: copy.teamWizardHalf },
  ];
  return (
    <View style={styles.stepContent}>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardShape}</Text>
        <View style={styles.shapeGrid}>
          {shapeOptions.map((item) => (
            <Pressable
              key={item.key}
              accessibilityRole="radio"
              accessibilityState={{ selected: shape === item.key }}
              onPress={() => onShape(item.key)}
              style={[styles.shapeOption, shape === item.key && styles.optionSelected]}
            >
              <CrestShapeGlyph color={shape === item.key ? colors.primaryButtonText : colors.textSecondary} shape={item.key} />
              <Text style={[styles.optionLabel, shape === item.key && styles.optionSelectedText]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardColor}</Text>
        <View style={styles.colorRow}>
          {palette.map((item) => {
            const selected = color === item.color;
            const label = copy[item.label];
            return (
              <Pressable
                key={item.color}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => onColor(item.color)}
                style={[
                  styles.swatch,
                  { backgroundColor: item.color },
                  selected && { borderColor: colors.textPrimary, borderWidth: 3 },
                ]}
              >
                {selected ? <Text style={styles.swatchCheck}>✓</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardPattern}</Text>
        <View style={styles.patternGrid}>
          {patterns.map((item) => {
            const selected = pattern === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => onPattern(item.key)}
                style={[styles.patternOption, selected && styles.optionSelected]}
              >
                <PatternSample colors={colors} pattern={item.key} color={color} />
                <Text style={[styles.optionLabel, selected && styles.optionSelectedText]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function StepPlay({
  colors,
  copy,
  format,
  onFormat,
  onToggle,
  open,
  styles,
}: {
  colors: ReturnType<typeof useAppPreferences>['colors'];
  copy: Copy;
  format: (typeof formats)[number];
  onFormat: (value: (typeof formats)[number]) => void;
  onToggle: (value: boolean) => void;
  open: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.stepContent}>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardFormat}</Text>
        <View style={styles.formatGrid}>
          {formats.map((item) => (
            <ChoiceButton
              key={item}
              label={`${item}v${item}`}
              selected={format === item}
              onPress={() => onFormat(item)}
              colors={colors}
              styles={styles}
            />
          ))}
        </View>
      </View>
      <View style={styles.openCard}>
        <View style={styles.openCopy}>
          <Text style={styles.fieldLabel}>{copy.teamWizardOpenTitle}</Text>
          <Text style={styles.fieldHint}>{open ? copy.teamWizardOpenDescription : copy.teamWizardInviteOnly}</Text>
        </View>
        <PlayerAvailabilitySwitch
          open={open}
          onToggle={onToggle}
          label={copy.teamWizardOpenTitle}
          colors={colors}
        />
      </View>
      <View style={styles.captainNote}>
        <CaptainBadge colors={colors} />
        <Text style={styles.captainText}>{copy.teamWizardCaptainNote}</Text>
      </View>
    </View>
  );
}

function ChoiceButton({
  label,
  selected,
  onPress,
  colors,
  styles,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.optionSelected]}
    >
      <Text style={[styles.choiceLabel, { color: selected ? colors.primaryButtonText : colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function PlayerAvailabilitySwitch({
  open,
  onToggle,
  label,
  colors,
}: {
  open: boolean;
  onToggle: (value: boolean) => void;
  label: string;
  colors: ReturnType<typeof useAppPreferences>['colors'];
}) {
  const [position] = useState(() => new Animated.Value(open ? 1 : 0));
  useEffect(() => {
    const animation = Animated.spring(position, {
      toValue: open ? 1 : 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 7,
    });
    animation.start();
    return () => animation.stop();
  }, [open, position]);
  const translateX = position.interpolate({ inputRange: [0, 1], outputRange: [0, 22] });
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: open }}
      onPress={() => onToggle(!open)}
      style={[
        toggleStyles.track,
        {
          backgroundColor: open ? colors.primaryButton : colors.surfaceRaised,
          borderColor: open ? colors.primaryButton : colors.border,
        },
      ]}
    >
      <Animated.View
        style={[
          toggleStyles.knob,
          { backgroundColor: open ? colors.primaryButtonText : colors.textSecondary, transform: [{ translateX }] },
        ]}
      />
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  colors,
  styles,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  styles: ReturnType<typeof makeStyles>;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      nativeID="team-create-cta"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        { backgroundColor: colors.primaryButton, opacity: disabled ? 0.55 : pressed ? 0.86 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={colors.primaryButtonText} /> : null}
      <Text style={[styles.primaryButtonText, { color: colors.primaryButtonText }]}>{label}</Text>
      {!loading ? <ArrowMark color={colors.primaryButtonText} /> : null}
    </Pressable>
  );
}

function SecondaryButton({
  label,
  onPress,
  colors,
  styles,
  full = true,
}: {
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  styles: ReturnType<typeof makeStyles>;
  full?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        !full && styles.secondaryButtonCompact,
        { borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

function InfoChip({
  label,
  colors,
  accent = false,
}: {
  label: string;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  accent?: boolean;
}) {
  return (
    <View style={[chipStyles.chip, { borderColor: colors.border, backgroundColor: accent ? colors.surfaceRaised : colors.surface }]}>
      <Text style={[chipStyles.label, { color: accent ? colors.accentText : colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function Crest({
  color,
  colors,
  initials,
  pattern,
  shape,
  size,
}: {
  color: TeamCrestColor;
  colors: ReturnType<typeof useAppPreferences>['colors'];
  initials: string;
  pattern: TeamCrestPattern;
  shape: TeamCrestShape;
  size: number;
}) {
  const clipId = `team-crest-${size}-${shape}`;
  return (
    <View accessibilityRole="image" accessibilityLabel={`${initials} team crest`} style={{ width: size, height: size * 1.1 }}>
      <Svg width={size} height={size * 1.1} viewBox="0 0 100 110">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={crestPaths[shape]} />
          </ClipPath>
        </Defs>
        <Rect x="0" y="0" width="100" height="110" fill={color} clipPath={`url(#${clipId})`} />
        {pattern === 'stripes'
          ? [0, 20, 40, 60, 80].map((x) => (
              <Rect key={x} x={x} y="0" width="9" height="110" fill="#0c1210" opacity="0.24" clipPath={`url(#${clipId})`} />
            ))
          : pattern === 'half'
            ? <Rect x="50" y="0" width="50" height="110" fill="#0c1210" opacity="0.28" clipPath={`url(#${clipId})`} />
            : null}
        <Rect x="0" y="0" width="100" height="35" fill="#ffffff" opacity="0.12" clipPath={`url(#${clipId})`} />
        <Path d={crestPaths[shape]} fill="none" stroke={colors.pitchLine} strokeWidth={3} />
        <SvgText
          x="50"
          y="67"
          textAnchor="middle"
          fontSize="35"
          fontWeight="800"
          fill={colors.primaryButtonText}
          stroke={color}
          strokeWidth="3"
          fontFamily="BarlowCondensed_700Bold"
        >
          {initials}
        </SvgText>
      </Svg>
    </View>
  );
}

function FloatingCrest({ children }: { children: React.ReactNode }) {
  const [float] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let active = true;
    let animation: Animated.CompositeAnimation | null = null;
    const start = (reduceMotion: boolean) => {
      if (!active || reduceMotion) return;
      animation = Animated.loop(
        Animated.sequence([
          Animated.timing(float, { toValue: 1, duration: 1800, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(float, { toValue: 0, duration: 1800, useNativeDriver: Platform.OS !== 'web' }),
        ]),
      );
      animation.start();
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      start(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } else {
      void AccessibilityInfo.isReduceMotionEnabled().then(start);
    }
    return () => {
      active = false;
      animation?.stop();
    };
  }, [float]);
  const translateY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] });
  return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
}

function CrestShapeGlyph({ color, shape }: { color: string; shape: TeamCrestShape }) {
  return (
    <Svg width={31} height={35} viewBox="0 0 100 110" fill="none">
      {shape === 'round' ? (
        <Circle cx="50" cy="55" r="44" stroke={color} strokeWidth="8" />
      ) : (
        <Path d={crestPaths[shape]} stroke={color} strokeWidth="8" strokeLinejoin="round" />
      )}
    </Svg>
  );
}

function PatternSample({
  colors,
  pattern,
  color,
}: {
  colors: ReturnType<typeof useAppPreferences>['colors'];
  pattern: TeamCrestPattern;
  color: string;
}) {
  return (
    <View style={[sampleStyles.sample, { borderColor: colors.border, backgroundColor: color }]}>
      {pattern === 'stripes' ? <View style={sampleStyles.stripeSample} /> : null}
      {pattern === 'half' ? <View style={sampleStyles.halfSample} /> : null}
    </View>
  );
}

function CaptainBadge({ colors }: { colors: ReturnType<typeof useAppPreferences>['colors'] }) {
  return (
    <View style={[badgeStyles.badge, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M4 19h16M6 16 4 7l5 4 3-7 3 7 5-4-2 9H6Z" stroke={colors.accentText} strokeWidth={1.8} strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function CloseMark({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="m6 6 12 12M18 6 6 18" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

function ArrowMark({ color }: { color: string }) {
  return (
    <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12h14m-6-6 6 6-6 6" stroke={color} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function TeamCreateAtmosphere({
  colors,
}: {
  colors: ReturnType<typeof useAppPreferences>['colors'];
}) {
  const [leftBeam] = useState(() => new Animated.Value(0));
  const [rightBeam] = useState(() => new Animated.Value(0));
  const [particles] = useState(() => Array.from({ length: 4 }, () => new Animated.Value(0)));

  useEffect(() => {
    let active = true;
    let groups: Animated.CompositeAnimation[] = [];
    const start = (reduceMotion: boolean) => {
      if (!active || reduceMotion) return;
      const native = Platform.OS !== 'web';
      const sway = (value: Animated.Value, duration: number) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(value, { toValue: 1, duration, useNativeDriver: native }),
            Animated.timing(value, { toValue: 0, duration, useNativeDriver: native }),
          ]),
        );
      groups = [
        sway(leftBeam, 7000),
        sway(rightBeam, 9000),
        ...particles.map((particle, index) =>
          Animated.loop(
            Animated.sequence([
              Animated.delay(index * 500),
              Animated.timing(particle, { toValue: 1, duration: [7000, 9000, 8000, 10000][index] ?? 8000, useNativeDriver: native }),
              Animated.timing(particle, { toValue: 0, duration: 1, useNativeDriver: native }),
            ]),
          ),
        ),
      ];
      groups.forEach((animation) => animation.start());
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      start(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } else {
      void AccessibilityInfo.isReduceMotionEnabled().then(start);
    }
    return () => {
      active = false;
      groups.forEach((animation) => animation.stop());
    };
  }, [leftBeam, particles, rightBeam]);

  const leftRotation = leftBeam.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '-30deg'] });
  const rightRotation = rightBeam.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '16deg'] });
  return (
    <View pointerEvents="none" style={atmosphereStyles.root}>
      <View style={[atmosphereStyles.baseGlow, { backgroundColor: colors.pitch }]} />
      <Animated.View
        style={[
          atmosphereStyles.beam,
          atmosphereStyles.leftBeam,
          { opacity: themeOpacity(colors, 1, 0.62), transform: [{ rotate: leftRotation }] },
        ]}
      >
        <BeamSvg />
      </Animated.View>
      <Animated.View
        style={[
          atmosphereStyles.beam,
          atmosphereStyles.rightBeam,
          { opacity: themeOpacity(colors, 1, 0.58), transform: [{ rotate: rightRotation }] },
        ]}
      >
        <BeamSvg />
      </Animated.View>
      {particles.map((value, index) => {
        const opacity = value.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0, 0.82, 0] });
        const rise = value.interpolate({ inputRange: [0, 1], outputRange: [12, -320] });
        return (
          <Animated.View
            key={index}
            style={[
              atmosphereStyles.particle,
              {
                left: `${[14, 30, 70, 86][index] ?? 50}%`,
                backgroundColor: index % 2 ? '#f2f5ec' : colors.primaryButton,
                opacity,
                transform: [{ translateY: rise }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function BeamSvg() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 220 400" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="team-create-beam" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#deff96" stopOpacity="0.22" />
          <Stop offset="1" stopColor="#deff96" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polygon points="101,0 119,0 220,400 0,400" fill="url(#team-create-beam)" />
    </Svg>
  );
}

function themeOpacity(colors: ReturnType<typeof useAppPreferences>['colors'], dark: number, light: number) {
  return colors.background === '#F7F9F2' ? light : dark;
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors'], width: number) {
  const compact = width < 370;
  return StyleSheet.create({
    root: { flex: 1, minHeight: 0, width: '100%', maxWidth: 480, alignSelf: 'center', overflow: 'hidden', backgroundColor: colors.background },
    keyboardFrame: { flex: 1, minHeight: 0 },
    header: { zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 8 },
    closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    headerTitle: { flex: 1, minWidth: 0, color: colors.textPrimary, fontFamily: 'BarlowCondensed_700Bold', fontSize: 24, lineHeight: 29, fontWeight: '700' },
    stepLabel: { color: colors.textMuted, fontFamily: 'Inter_600SemiBold', fontSize: 12, fontWeight: '600' },
    previewStage: { zIndex: 1, flex: 0, minHeight: compact ? 186 : 206, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 24 },
    previewHalo: { position: 'absolute', top: 42, width: 100, height: 100, borderRadius: 60, opacity: 0.2 },
    previewCrest: { marginTop: -2, shadowColor: colors.accentText, shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
    previewName: { marginTop: 2, maxWidth: '100%', color: colors.textPrimary, fontFamily: 'BarlowCondensed_700Bold', fontSize: 27, lineHeight: 31, fontWeight: '700' },
    previewDetails: { marginTop: 2, color: colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
    progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 18, paddingTop: 2, paddingBottom: 4 },
    progressTrack: { flex: 1, height: 5, borderRadius: 99, backgroundColor: colors.surfaceRaised },
    formScroll: { flex: 1, minHeight: 0 },
    formContent: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18, gap: 12 },
    stepHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 1 },
    stepTitle: { flex: 1, color: colors.textPrimary, fontFamily: 'BarlowCondensed_700Bold', fontSize: 30, lineHeight: 34, fontWeight: '700' },
    stepBadge: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
    stepBadgeText: { color: colors.accentText, fontFamily: 'Inter_600SemiBold', fontSize: 12, fontWeight: '700' },
    stepContent: { gap: 16 },
    helperText: { color: colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
    fieldBlock: { gap: 8 },
    fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    fieldLabel: { color: colors.textPrimary, fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 19, fontWeight: '600' },
    fieldHint: { marginTop: 2, color: colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
    characterCount: { color: colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: 12 },
    field: { height: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.textPrimary, fontFamily: 'Inter_600SemiBold', fontSize: 17 },
    areaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: { width: '48%', minHeight: 46, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    choiceLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 19, fontWeight: '600' },
    optionSelected: { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
    optionSelectedText: { color: colors.primaryButtonText },
    shapeGrid: { flexDirection: 'row', gap: 8 },
    shapeOption: { flex: 1, minHeight: 78, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 14, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    optionLabel: { color: colors.textSecondary, fontFamily: 'Inter_600SemiBold', fontSize: 12, fontWeight: '600' },
    colorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
    swatch: { width: compact ? 38 : 42, height: compact ? 38 : 42, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
    swatchCheck: { color: '#0c1210', fontSize: 19, fontWeight: '800' },
    patternGrid: { flexDirection: 'row', gap: 8 },
    patternOption: { flex: 1, minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 4, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface },
    formatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    openCard: { minHeight: 78, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    openCopy: { flex: 1, gap: 3 },
    captainNote: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
    captainText: { flex: 1, color: colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
    footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
    primaryButton: { flex: 1, minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16, borderRadius: 16, overflow: 'hidden' },
    primaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, fontWeight: '700' },
    secondaryButton: { minHeight: 48, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1.5, borderRadius: 15, backgroundColor: 'transparent' },
    secondaryButtonCompact: { flex: 0, minWidth: 90 },
    secondaryButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '600' },
    loadMessage: { flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 12 },
    successRoot: { alignItems: 'stretch', justifyContent: 'center' },
    successContent: { zIndex: 1, alignItems: 'center', gap: 16, paddingHorizontal: 28, paddingVertical: 24 },
    successTitle: { color: colors.textPrimary, fontFamily: 'BarlowCondensed_700Bold', fontSize: 38, lineHeight: 44, fontWeight: '800', textAlign: 'center' },
    successName: { marginTop: -14, color: colors.accentText, fontFamily: 'BarlowCondensed_700Bold', fontSize: 26, lineHeight: 32, fontWeight: '700', textAlign: 'center' },
    successBody: { maxWidth: 320, color: colors.textSecondary, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 23, textAlign: 'center' },
    successChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 4 },
    textButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
    textButtonLabel: { color: colors.accentText, fontFamily: 'Inter_600SemiBold', fontSize: 14, textDecorationLine: 'underline' },
  });
}

const sampleStyles = StyleSheet.create({
  sample: { width: 20, height: 20, overflow: 'hidden', borderWidth: 1, borderRadius: 6 },
  stripeSample: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(12,18,16,0.28)' },
  halfSample: { position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%', backgroundColor: 'rgba(12,18,16,0.32)' },
});
const badgeStyles = StyleSheet.create({ badge: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12 } });
const toggleStyles = StyleSheet.create({
  track: { width: 54, height: 32, padding: 3, alignItems: 'flex-start', justifyContent: 'center', borderWidth: 1.5, borderRadius: 999 },
  knob: { width: 24, height: 24, borderRadius: 12 },
});
const chipStyles = StyleSheet.create({
  chip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderRadius: 20 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 12, fontWeight: '600' },
});
const atmosphereStyles = StyleSheet.create({
  root: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  baseGlow: { position: 'absolute', top: '10%', right: '-30%', left: '-30%', height: '56%', borderRadius: 999, opacity: 0.09 },
  beam: { position: 'absolute', top: -20, width: 220, height: '130%', opacity: 0.1 },
  leftBeam: { left: -90 },
  rightBeam: { right: -90 },
  particle: { position: 'absolute', bottom: '8%', width: 4, height: 4, borderRadius: 3 },
});
