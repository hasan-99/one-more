import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Mask,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Svg,
  Text as SvgText,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Rise, useEntrance, useLoop } from '@/components/motion';
import { SegmentedControl } from '@/components/segmented-control';
import { StageBackdrop } from '@/components/stage-backdrop';
import { useToast } from '@/components/toast/ToastProvider';
import { loadMatchFilters, type MatchArea, type MatchCity } from '@/features/matches/match-service';
import {
  createTeamWithDesign,
  type TeamCrestColor,
  type TeamCrestEmblem,
  type TeamCrestPattern,
  type TeamCrestShape,
} from '@/features/teams/team-service';
import { translations, type Locale } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import type { ThemeColors } from '@/theme/tokens';
import { bodyFont, displayFont } from '@/theme/typography';

const palette = [
  { color: '#cfff4a', label: 'teamWizardLime' },
  { color: '#f2f5ec', label: 'teamWizardWhite' },
  { color: '#ffa94d', label: 'teamWizardOrange' },
  { color: '#5cc8ff', label: 'teamWizardSky' },
  { color: '#ff8fc0', label: 'teamWizardPink' },
  { color: '#b79cff', label: 'teamWizardViolet' },
] as const;
const formats = [5, 7, 8, 11] as const;
type Format = (typeof formats)[number];
type Copy = { [Key in keyof typeof translations.en]: string };
const crestPaths: Record<TeamCrestShape, string> = {
  shield: 'M50 4 L92 18 V54 C92 82 72 98 50 106 C28 98 8 82 8 54 V18 Z',
  round: 'M50 9 A46 46 0 1 1 49.9 9 Z',
  hex: 'M50 5 L92 29 V81 L50 105 L8 81 V29 Z',
};
const ink = '#0c1210';
type CrestLook = {
  shape: TeamCrestShape;
  color: TeamCrestColor;
  pattern: TeamCrestPattern;
  emblem: TeamCrestEmblem;
};
/** Simple solid icons on a 24-unit grid, drawn instead of the initials. */
const emblemPaths: Record<Exclude<TeamCrestEmblem, 'initials'>, string> = {
  ball: 'M12 2.5a9.5 9.5 0 1 0 .01 0ZM12 7.2l4 2.9-1.5 4.7h-5L8 10.1ZM12 2.5v4.7M20.6 9.3 16 10.1M17.4 19.2l-2.9-4.4M6.6 19.2l2.9-4.4M3.4 9.3l4.6.8',
  bolt: 'M13.5 2 4.5 13.5h6L9.5 22l10-12.5h-6.3Z',
  star: 'M12 2l3.1 6.6 7 .9-5.2 4.9 1.4 7L12 17.9 5.7 21.4l1.4-7L1.9 9.5l7-.9Z',
  crown: 'M2.5 8l4.8 4.2L12 4.5l4.7 7.7L21.5 8l-2 12h-15Z',
};
const emblems: TeamCrestEmblem[] = ['initials', 'ball', 'bolt', 'star', 'crown'];
const looks: { key: string; label: keyof typeof translations.en; design: CrestLook }[] = [
  {
    key: 'classic',
    label: 'teamWizardLookClassic',
    design: { shape: 'shield', color: '#cfff4a', pattern: 'plain', emblem: 'initials' },
  },
  {
    key: 'thunder',
    label: 'teamWizardLookThunder',
    design: { shape: 'hex', color: '#5cc8ff', pattern: 'half', emblem: 'bolt' },
  },
  {
    key: 'royal',
    label: 'teamWizardLookRoyal',
    design: { shape: 'shield', color: '#b79cff', pattern: 'stripes', emblem: 'crown' },
  },
  {
    key: 'fire',
    label: 'teamWizardLookFire',
    design: { shape: 'round', color: '#ffa94d', pattern: 'half', emblem: 'ball' },
  },
  {
    key: 'ice',
    label: 'teamWizardLookIce',
    design: { shape: 'hex', color: '#f2f5ec', pattern: 'stripes', emblem: 'star' },
  },
  {
    key: 'striker',
    label: 'teamWizardLookStriker',
    design: { shape: 'round', color: '#ff8fc0', pattern: 'plain', emblem: 'ball' },
  },
];
const pickRandom = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)] as T;
/** Header height the preview stage extends underneath (reference: margin-top -68px). */
const headerOverlap = 68;
const stageHeight = 232;

export default function CreateTeamScreen() {
  const { colors, locale } = useAppPreferences();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const copy = translations[locale];
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [areas, setAreas] = useState<MatchArea[]>([]);
  const [cities, setCities] = useState<MatchCity[]>([]);
  const [areaId, setAreaId] = useState('');
  const [crestShape, setCrestShape] = useState<TeamCrestShape>('shield');
  const [crestColor, setCrestColor] = useState<TeamCrestColor>('#cfff4a');
  const [crestPattern, setCrestPattern] = useState<TeamCrestPattern>('plain');
  const [crestEmblem, setCrestEmblem] = useState<TeamCrestEmblem>('initials');
  const [history, setHistory] = useState<CrestLook[]>([]);
  const [format, setFormat] = useState<Format>(5);
  const [openToPlayers, setOpenToPlayers] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdTeamId, setCreatedTeamId] = useState<string | null>(null);
  const [flips, setFlips] = useState(0);
  const city = useMemo(
    () => cities.find((item) => item.slug === 'nicosia') ?? cities[0] ?? null,
    [cities],
  );
  const visibleAreas = useMemo(
    () => areas.filter((item) => !city || item.city_id === city.id),
    [areas, city],
  );
  const selectedArea = visibleAreas.find((item) => item.id === areaId) ?? null;
  const areaName = selectedArea
    ? locale === 'el'
      ? selectedArea.name_el
      : selectedArea.name_en
    : '';
  const trimmedName = name.trim();
  const initials = useMemo(() => {
    const words = trimmedName.split(/\s+/u).filter(Boolean);
    return words.length > 1
      ? `${Array.from(words[0])[0] ?? ''}${Array.from(words[1])[0] ?? ''}`.toUpperCase()
      : Array.from(words[0] ?? '')
          .slice(0, 2)
          .join('')
          .toUpperCase() || 'FC';
  }, [trimmedName]);
  const styles = useMemo(() => makeStyles(colors, locale), [colors, locale]);
  const canNext = step > 1 || (trimmedName.length >= 2 && Boolean(areaId));
  const crest = {
    color: crestColor,
    pattern: crestPattern,
    shape: crestShape,
    emblem: crestEmblem,
    initials,
  };

  const loadAreas = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const result = await loadMatchFilters();
      setCities(result.cities);
      setAreas(result.areas);
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

  const look: CrestLook = {
    shape: crestShape,
    color: crestColor,
    pattern: crestPattern,
    emblem: crestEmblem,
  };
  const showLook = (next: CrestLook) => {
    setCrestShape(next.shape);
    setCrestColor(next.color);
    setCrestPattern(next.pattern);
    setCrestEmblem(next.emblem);
    setFlips((count) => count + 1);
  };
  /** Applies a design change, keeping the previous design so it can be undone. */
  const changeLook = (patch: Partial<CrestLook>) => {
    setHistory((past) => [...past.slice(-19), look]);
    showLook({ ...look, ...patch });
  };
  const surprise = () =>
    changeLook({
      shape: pickRandom(['shield', 'round', 'hex'] as const),
      color: pickRandom(palette).color,
      pattern: pickRandom(['plain', 'stripes', 'half'] as const),
      emblem: pickRandom(emblems),
    });
  const undo = () => {
    const previous = history[history.length - 1];
    if (!previous) return;
    setHistory(history.slice(0, -1));
    showLook(previous);
  };

  const onCreate = async () => {
    if (!city || !selectedArea) {
      showToast(copy.teamWizardMissingData, 'error');
      return;
    }
    setSaving(true);
    try {
      const teamId = await createTeamWithDesign({
        name: trimmedName,
        cityId: city.id,
        areaId: selectedArea.id,
        crestShape,
        crestColor,
        crestPattern,
        crestEmblem,
        format,
        openToPlayers,
      });
      setCreatedTeamId(teamId);
    } catch {
      showToast(copy.teamWizardCreateError, 'error');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (!canNext) return;
    if (step === 1 && trimmedName.length > 24) {
      showToast(copy.teamWizardNameTooLong, 'error');
      return;
    }
    if (step < 3) setStep(step + 1);
    else void onCreate();
  };

  const stepTitle =
    step === 1
      ? copy.teamWizardStepOne
      : step === 2
        ? copy.teamWizardStepTwo
        : copy.teamWizardStepThree;
  const stepLabel = copy.teamWizardStep.replace('{{step}}', String(step));

  return (
    <View style={styles.root} nativeID="team-create-root">
      <StageBackdrop
        id="team-stage"
        colors={colors}
        height={headerOverlap + stageHeight + insets.top}
      />
      <KeyboardAvoidingView
        style={styles.keyboardFrame}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.teamWizardClose}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/teams' as Href))}
            style={({ pressed }) => [
              styles.closeButton,
              { transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
          >
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path
                d="M6 6l12 12M18 6L6 18"
                stroke={colors.textPrimary}
                strokeWidth={2.4}
                strokeLinecap="round"
              />
            </Svg>
          </Pressable>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
            {copy.teamCreateTitle}
          </Text>
          <Text style={styles.stepLabel}>{stepLabel}</Text>
        </View>

        <View accessibilityLabel={copy.teamWizardPreview} style={styles.stage}>
          <View style={styles.crestBox}>
            <CrestHalo color={crestColor} />
            <FloatingCrest flips={flips}>
              <Crest {...crest} size={100} label={`${copy.teamWizardCrestLabel}: ${initials}`} />
            </FloatingCrest>
            <FloorShadow />
          </View>
          <View style={styles.crestTools}>
            <ToolButton
              label={copy.teamWizardSurprise}
              onPress={surprise}
              primary
              colors={colors}
              styles={styles}
              glyph="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4ZM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01"
            />
            <ToolButton
              label={copy.teamWizardUndo}
              onPress={undo}
              disabled={history.length === 0}
              colors={colors}
              styles={styles}
              glyph="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"
            />
          </View>
          <Text numberOfLines={2} style={styles.previewName}>
            {trimmedName || copy.teamWizardPreviewName}
          </Text>
          <Text numberOfLines={1} style={styles.previewLine}>
            {`${areaName || copy.teamWizardChooseArea}, ${format}v${format}`}
          </Text>
        </View>

        <View accessibilityElementsHidden style={styles.bars}>
          {[1, 2, 3].map((index) => (
            <ProgressBar key={index} on={index <= step} colors={colors} />
          ))}
        </View>

        <ScrollView
          nativeID="team-create-step"
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <StepSlide key={step}>
            <Text accessibilityRole="header" style={styles.stepTitle}>
              {stepTitle}
            </Text>
            {loadFailed ? (
              <View style={styles.loadMessage}>
                <Text accessibilityRole="alert" style={styles.helperText}>
                  {copy.teamWizardLoadError}
                </Text>
                <GhostButton
                  label={copy.teamWizardRetry}
                  onPress={() => void loadAreas()}
                  styles={styles}
                />
              </View>
            ) : loading ? (
              <View accessibilityRole="progressbar" style={styles.loadMessage}>
                <ActivityIndicator color={colors.accentText} />
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
                emblem={crestEmblem}
                look={look}
                onEmblem={(value) => changeLook({ emblem: value })}
                onLook={(next) => changeLook(next)}
                onPattern={(value) => changeLook({ pattern: value })}
                onShape={(value) => changeLook({ shape: value })}
                onColor={(value) => changeLook({ color: value })}
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
          </StepSlide>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {step > 1 ? (
            <GhostButton
              label={copy.teamWizardBack}
              onPress={() => setStep((value) => Math.max(1, value - 1))}
              styles={styles}
            />
          ) : null}
          {canNext ? (
            <NextButton
              label={
                saving
                  ? copy.teamWizardCreateSaving
                  : step === 3
                    ? copy.teamWizardCreate
                    : copy.teamWizardNext
              }
              onPress={next}
              disabled={saving || loading || loadFailed}
              busy={saving}
              colors={colors}
              styles={styles}
            />
          ) : (
            <View
              accessibilityRole="button"
              accessibilityState={{ disabled: true }}
              aria-disabled
              style={styles.disabledNext}
            >
              <Text style={styles.disabledNextText}>{copy.teamWizardNeedNameArea}</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {createdTeamId ? (
        <SuccessOverlay
          crest={crest}
          name={trimmedName}
          chips={[
            { label: areaName },
            { label: `${format}v${format}` },
            {
              label: openToPlayers ? copy.teamWizardOpenTitle : copy.teamWizardInviteOnly,
              accent: true,
            },
          ]}
          copy={copy}
          colors={colors}
          styles={styles}
          onDone={() => router.replace(`/teams/${createdTeamId}` as Href)}
        />
      ) : null}
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
  colors: ThemeColors;
  locale: Locale;
  name: string;
  onChangeName: (value: string) => void;
  onSelectArea: (value: string) => void;
  styles: Styles;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <>
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
          autoComplete="off"
          autoCorrect={false}
          returnKeyType="done"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.field, focused && styles.fieldFocused]}
        />
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardArea}</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={copy.teamWizardArea}
          style={styles.grid}
        >
          {areas.map((item) => (
            <OptionButton
              key={item.id}
              label={locale === 'el' ? item.name_el : item.name_en}
              selected={item.id === areaId}
              onPress={() => onSelectArea(item.id)}
              colors={colors}
              styles={styles}
              basis="half"
            />
          ))}
        </View>
      </View>
    </>
  );
}

function StepCrest({
  color,
  colors,
  copy,
  emblem,
  look,
  onEmblem,
  onLook,
  onPattern,
  onShape,
  onColor,
  pattern,
  shape,
  styles,
}: {
  color: TeamCrestColor;
  colors: ThemeColors;
  copy: Copy;
  emblem: TeamCrestEmblem;
  look: CrestLook;
  onEmblem: (value: TeamCrestEmblem) => void;
  onLook: (value: CrestLook) => void;
  onPattern: (value: TeamCrestPattern) => void;
  onShape: (value: TeamCrestShape) => void;
  onColor: (value: TeamCrestColor) => void;
  pattern: TeamCrestPattern;
  shape: TeamCrestShape;
  styles: Styles;
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
  const emblemLabels: Record<TeamCrestEmblem, string> = {
    initials: copy.teamWizardEmblemInitials,
    ball: copy.teamWizardEmblemBall,
    bolt: copy.teamWizardEmblemBolt,
    star: copy.teamWizardEmblemStar,
    crown: copy.teamWizardEmblemCrown,
  };
  return (
    <>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardLooks}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.looksRow}
          keyboardShouldPersistTaps="handled"
        >
          {looks.map((item) => {
            const on =
              item.design.shape === look.shape &&
              item.design.color === look.color &&
              item.design.pattern === look.pattern &&
              item.design.emblem === look.emblem;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={copy[item.label]}
                accessibilityState={{ selected: on }}
                onPress={() => onLook(item.design)}
                style={[styles.lookCard, on && styles.lookCardOn]}
              >
                <Crest {...item.design} initials="FC" size={42} />
                <Text style={styles.lookText}>{copy[item.label]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardShape}</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={copy.teamWizardShape}
          style={styles.grid}
        >
          {shapeOptions.map((item) => (
            <OptionButton
              key={item.key}
              label={item.label}
              selected={shape === item.key}
              onPress={() => onShape(item.key)}
              colors={colors}
              styles={styles}
              basis="third"
              tall
              icon={(tint) => <CrestShapeGlyph color={tint} shape={item.key} />}
            />
          ))}
        </View>
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardColor}</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={copy.teamWizardColor}
          style={styles.swatchRow}
        >
          {palette.map((item) => (
            <Swatch
              key={item.color}
              color={item.color}
              label={copy[item.label]}
              selected={color === item.color}
              onPress={() => onColor(item.color)}
              colors={colors}
            />
          ))}
        </View>
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardPattern}</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={copy.teamWizardPattern}
          style={styles.grid}
        >
          {patterns.map((item) => (
            <OptionButton
              key={item.key}
              label={item.label}
              selected={pattern === item.key}
              onPress={() => onPattern(item.key)}
              colors={colors}
              styles={styles}
              basis="third"
              row
              icon={() => <PatternSample pattern={item.key} />}
            />
          ))}
        </View>
      </View>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardEmblem}</Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={copy.teamWizardEmblem}
          style={styles.emblemRow}
        >
          {emblems.map((item) => {
            const on = emblem === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityLabel={emblemLabels[item]}
                accessibilityState={{ checked: on }}
                aria-checked={on}
                onPress={() => onEmblem(item)}
                style={[styles.emblemButton, on && styles.emblemButtonOn]}
              >
                {item === 'initials' ? (
                  <Text style={[styles.emblemText, on && styles.emblemTextOn]}>Aa</Text>
                ) : (
                  <Svg width={22} height={22} viewBox="0 0 24 24">
                    <Path
                      d={emblemPaths[item]}
                      fill={on ? colors.primaryButtonText : colors.textPrimary}
                    />
                  </Svg>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </>
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
  colors: ThemeColors;
  copy: Copy;
  format: Format;
  onFormat: (value: Format) => void;
  onToggle: (value: boolean) => void;
  open: boolean;
  styles: Styles;
}) {
  return (
    <>
      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>{copy.teamWizardFormat}</Text>
        <SegmentedControl
          label={copy.teamWizardFormat}
          index={formats.indexOf(format)}
          options={formats.map((item) => ({
            key: String(item),
            label: `${item}v${item}`,
            onPress: () => onFormat(item),
          }))}
        />
      </View>
      <View style={styles.openCard}>
        <View style={styles.openCopy}>
          <Text nativeID="team-open-label" style={styles.openTitle}>
            {copy.teamWizardOpenTitle}
          </Text>
          <Text style={styles.helperText}>{copy.teamWizardOpenDescription}</Text>
        </View>
        <ToggleSwitch
          value={open}
          onToggle={onToggle}
          label={copy.teamWizardOpenTitle}
          colors={colors}
        />
      </View>
      <Text style={styles.helperText}>{copy.teamWizardCaptainNote}</Text>
    </>
  );
}

function OptionButton({
  label,
  selected,
  onPress,
  colors,
  styles,
  basis,
  tall = false,
  row = false,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
  styles: Styles;
  basis: 'half' | 'third';
  tall?: boolean;
  row?: boolean;
  icon?: (color: string) => ReactNode;
}) {
  const tint = selected ? colors.primaryButtonText : colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        basis === 'half' ? styles.half : styles.third,
        tall && styles.optionTall,
        row && styles.optionRow,
        selected && styles.optionSelected,
        { transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}
    >
      {icon ? icon(tint) : null}
      <Text numberOfLines={1} style={[styles.optionText, { color: tint }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ToolButton({
  label,
  onPress,
  glyph,
  primary = false,
  disabled = false,
  colors,
  styles,
}: {
  label: string;
  onPress: () => void;
  glyph: string;
  primary?: boolean;
  disabled?: boolean;
  colors: ThemeColors;
  styles: Styles;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolButton,
        primary && styles.toolButtonPrimary,
        disabled && { opacity: 0.4 },
        { transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
        <Path
          d={glyph}
          stroke={primary ? colors.primaryButtonText : colors.textPrimary}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Pressable>
  );
}

function Swatch({
  color,
  label,
  selected,
  onPress,
  colors,
}: {
  color: string;
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  const [scale] = useState(() => new Animated.Value(selected ? 1.1 : 1));
  useEffect(() => {
    const animation = Animated.spring(scale, {
      toValue: selected ? 1.1 : 1,
      speed: 24,
      bounciness: 12,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [scale, selected]);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={swatchStyles.hit}
    >
      <Animated.View
        style={[
          swatchStyles.ring,
          { borderColor: selected ? colors.textPrimary : 'transparent', transform: [{ scale }] },
        ]}
      >
        <View style={[swatchStyles.swatch, { backgroundColor: color }]} />
      </Animated.View>
    </Pressable>
  );
}

function ToggleSwitch({
  value,
  onToggle,
  label,
  colors,
}: {
  value: boolean;
  onToggle: (value: boolean) => void;
  label: string;
  colors: ThemeColors;
}) {
  const [position] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    const animation = Animated.spring(position, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: 9,
    });
    animation.start();
    return () => animation.stop();
  }, [value, position]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      aria-checked={value}
      onPress={() => onToggle(!value)}
      style={[
        toggleStyles.track,
        {
          backgroundColor: value ? colors.primaryButton : colors.option,
          borderColor: value ? colors.primaryButton : colors.borderStrong,
        },
      ]}
    >
      <Animated.View
        style={[
          toggleStyles.knob,
          {
            backgroundColor: value ? colors.primaryButtonText : colors.textSecondary,
            transform: [
              { translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) },
            ],
          },
        ]}
      />
    </Pressable>
  );
}

/** Lime "Next" button with the sweeping shine and nudging arrow from the reference. */
function NextButton({
  label,
  onPress,
  disabled,
  busy,
  colors,
  styles,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  busy: boolean;
  colors: ThemeColors;
  styles: Styles;
}) {
  const [width, setWidth] = useState(0);
  const shine = useLoop(3600, { delay: 1000, easing: Easing.linear });
  const nudge = useLoop(700, { alternate: true });
  return (
    <Pressable
      accessibilityRole="button"
      nativeID="team-create-cta"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      style={({ pressed }) => [
        styles.nextButton,
        { opacity: disabled && !busy ? 0.55 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
      ]}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              transform: [
                {
                  translateX: shine.interpolate({
                    inputRange: [0, 0.35, 1],
                    outputRange: [-1.3 * width, 1.3 * width, 1.3 * width],
                  }),
                },
              ],
            },
          ]}
        >
          <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 10">
            <Defs>
              <LinearGradient id="team-next-shine" x1="0" y1="0" x2="1" y2="0.2">
                <Stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
                <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.6" />
                <Stop offset="0.65" stopColor="#ffffff" stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect width="100" height="10" fill="url(#team-next-shine)" />
          </Svg>
        </Animated.View>
      ) : null}
      {busy ? <ActivityIndicator color={colors.primaryButtonText} /> : null}
      <Text style={styles.nextText}>{label}</Text>
      {!busy ? (
        <Animated.View
          style={{
            transform: [
              { translateX: nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) },
            ],
          }}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M5 12h14M13 6l6 6-6 6"
              stroke={colors.primaryButtonText}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Animated.View>
      ) : null}
    </Pressable>
  );
}

function GhostButton({
  label,
  onPress,
  styles,
}: {
  label: string;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.ghostButton, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}
    >
      <Text style={styles.ghostText}>{label}</Text>
    </Pressable>
  );
}

function ProgressBar({ on, colors }: { on: boolean; colors: ThemeColors }) {
  return (
    <View
      style={[
        barStyles.bar,
        on
          ? {
              backgroundColor: colors.primaryButton,
              shadowColor: colors.primaryButton,
              shadowOpacity: 0.55,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }
          : { backgroundColor: colors.background === '#0C1210' ? '#22332A' : colors.surfaceRaised },
      ]}
    />
  );
}

function StepSlide({ children }: { children: ReactNode }) {
  const progress = useEntrance(500, 0, Easing.bezier(0.2, 0.9, 0.2, 1));
  return (
    <Animated.View
      style={{
        gap: 16,
        opacity: progress,
        transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

type CrestDesign = {
  color: TeamCrestColor;
  pattern: TeamCrestPattern;
  shape: TeamCrestShape;
  emblem?: TeamCrestEmblem;
  initials: string;
};

function Crest({
  color,
  pattern,
  shape,
  emblem = 'initials',
  initials,
  size,
  label,
}: CrestDesign & { size: number; label?: string }) {
  const clipId = `team-crest-${size}-${shape}`;
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      style={{ width: size, height: size * 1.1 }}
    >
      <Svg width={size} height={size * 1.1} viewBox="0 0 100 110">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={crestPaths[shape]} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>
          <Rect x="0" y="0" width="100" height="110" fill={color} />
          {pattern === 'stripes'
            ? [10, 28, 46, 64, 82].map((x) => (
                <Rect key={x} x={x} y="0" width="9" height="110" fill={ink} opacity={0.24} />
              ))
            : null}
          {pattern === 'half' ? (
            <Rect x="50" y="0" width="50" height="110" fill={ink} opacity={0.28} />
          ) : null}
          <Rect width="100" height="40" fill="#ffffff" opacity={0.16} />
        </G>
        <Path d={crestPaths[shape]} fill="none" stroke={ink} strokeWidth={3} />
        {emblem === 'initials' ? (
          <>
            <SvgText
              x="50"
              y="68"
              textAnchor="middle"
              fontSize="36"
              fontWeight="800"
              fontFamily="BarlowCondensed_800ExtraBold"
              stroke={color}
              strokeWidth={5}
              strokeLinejoin="round"
              fill={color}
            >
              {initials}
            </SvgText>
            <SvgText
              x="50"
              y="68"
              textAnchor="middle"
              fontSize="36"
              fontWeight="800"
              fontFamily="BarlowCondensed_800ExtraBold"
              fill={ink}
            >
              {initials}
            </SvgText>
          </>
        ) : (
          <G transform="translate(28 33) scale(1.85)">
            <Path
              d={emblemPaths[emblem]}
              fill={ink}
              stroke={color}
              strokeWidth={0.9}
              strokeLinejoin="round"
            />
          </G>
        )}
      </Svg>
    </View>
  );
}

/** Floats the crest (st-float) and replays a 3D flip whenever its design changes. */
function FloatingCrest({ flips, children }: { flips: number; children: ReactNode }) {
  const float = useLoop(1800, { alternate: true });
  const flip = useEntrance(700, 0, Easing.bezier(0.3, 0.9, 0.3, 1), flips);
  const played = flips === 0;
  return (
    <Animated.View
      style={{
        transform: [
          { translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) },
          { perspective: 500 },
          {
            rotateY: played
              ? '0deg'
              : flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
          },
          {
            scale: played
              ? 1
              : flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function CrestHalo({ color }: { color: string }) {
  const pulse = useLoop(1800, { alternate: true });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        haloStyles.halo,
        {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.7] }),
          transform: [
            { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) },
          ],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id="team-crest-halo" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={color} stopOpacity="0.95" />
            <Stop offset="0.55" stopColor={color} stopOpacity="0.45" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill="url(#team-crest-halo)" />
      </Svg>
    </Animated.View>
  );
}

function FloorShadow() {
  const pulse = useLoop(1800, { alternate: true });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        haloStyles.floor,
        {
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.3] }),
          transform: [{ scaleX: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }],
        },
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 20" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="team-floor" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#000000" stopOpacity="1" />
            <Stop offset="0.6" stopColor="#000000" stopOpacity="0.7" />
            <Stop offset="1" stopColor="#000000" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="20" fill="url(#team-floor)" />
      </Svg>
    </Animated.View>
  );
}

const confetti: [string, number, number, number][] = [
  ['#cfff4a', -120, -120, 240],
  ['#f2f5ec', -60, -165, -180],
  ['#cfff4a', 20, -175, 300],
  ['#f2f5ec', 105, -140, -260],
  ['#cfff4a', 160, -55, 200],
  ['#f2f5ec', 150, 55, -220],
  ['#cfff4a', 95, 130, 280],
  ['#f2f5ec', 0, 160, -300],
  ['#cfff4a', -95, 135, 220],
  ['#f2f5ec', -155, 50, -200],
  ['#cfff4a', -160, -45, 260],
  ['#f2f5ec', 65, -100, -240],
];

function SuccessOverlay({
  crest,
  name,
  chips,
  copy,
  colors,
  styles,
  onDone,
}: {
  crest: CrestDesign;
  name: string;
  chips: { label: string; accent?: boolean }[];
  copy: Copy;
  colors: ThemeColors;
  styles: Styles;
  onDone: () => void;
}) {
  const dim = useEntrance(300, 0, Easing.ease);
  const win = useEntrance(900, 0, Easing.bezier(0.2, 1.3, 0.3, 1));
  const burst = useEntrance(1400, 450, Easing.bezier(0.1, 0.7, 0.3, 1));
  const rays = useLoop(14000, { easing: Easing.linear });
  return (
    <Animated.View
      accessibilityViewIsModal
      accessibilityRole="alert"
      accessibilityLabel={copy.teamWizardCreatedTitle}
      style={[styles.success, { opacity: dim }]}
    >
      <View style={styles.successStage}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rays,
            {
              transform: [
                {
                  rotate: rays.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
                },
              ],
            },
          ]}
        >
          <Svg width={520} height={520} viewBox="0 0 520 520">
            <Defs>
              <RadialGradient id="team-rays-fade" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#ffffff" stopOpacity="1" />
                <Stop offset="0.68" stopColor="#ffffff" stopOpacity="0" />
              </RadialGradient>
              <Mask id="team-rays-mask">
                <Rect width="520" height="520" fill="url(#team-rays-fade)" />
              </Mask>
            </Defs>
            <G mask="url(#team-rays-mask)">
              {Array.from({ length: 16 }, (_, index) => {
                const start = (index * 22.5 * Math.PI) / 180;
                const end = ((index * 22.5 + 9) * Math.PI) / 180;
                const point = (angle: number) =>
                  `${260 + 260 * Math.sin(angle)},${260 - 260 * Math.cos(angle)}`;
                return (
                  <Polygon
                    key={index}
                    points={`260,260 ${point(start)} ${point(end)}`}
                    fill={colors.primaryButton}
                    opacity={0.13}
                  />
                );
              })}
            </G>
          </Svg>
        </Animated.View>
        {confetti.map(([color, x, y, rotation], index) => (
          <Animated.View
            key={index}
            pointerEvents="none"
            style={[
              styles.confetti,
              {
                backgroundColor: color,
                opacity: burst.interpolate({
                  inputRange: [0, 0.01, 0.7, 1],
                  outputRange: [0, 1, 1, 0],
                }),
                transform: [
                  { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, x] }) },
                  { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, y] }) },
                  {
                    rotate: burst.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${rotation}deg`],
                    }),
                  },
                  { scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                ],
              },
            ]}
          />
        ))}
        <Animated.View
          style={{
            opacity: win,
            transform: [
              { perspective: 600 },
              {
                rotateY: win.interpolate({ inputRange: [0, 1], outputRange: ['-540deg', '0deg'] }),
              },
              { scale: win.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
            ],
          }}
        >
          <Crest {...crest} size={140} label={`${copy.teamWizardCrestLabel}: ${crest.initials}`} />
        </Animated.View>
      </View>
      <Rise delay={500} distance={16}>
        <Text accessibilityRole="header" style={styles.successName}>
          {name}
        </Text>
      </Rise>
      <Rise delay={600} distance={16}>
        <Text style={styles.successBody}>{copy.teamWizardCreatedBody}</Text>
      </Rise>
      <Rise delay={700} distance={16} style={styles.successChips}>
        {chips.map((chip) => (
          <View key={chip.label} style={styles.successChip}>
            <Text style={[styles.successChipText, chip.accent && { color: colors.accentText }]}>
              {chip.label}
            </Text>
          </View>
        ))}
      </Rise>
      <Rise delay={800} distance={16}>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={({ pressed }) => [
            styles.doneButton,
            { transform: [{ scale: pressed ? 0.96 : 1 }] },
          ]}
        >
          <Text style={styles.doneText}>{copy.teamWizardDone}</Text>
        </Pressable>
      </Rise>
    </Animated.View>
  );
}

function CrestShapeGlyph({ color, shape }: { color: string; shape: TeamCrestShape }) {
  return (
    <Svg width={28} height={31} viewBox="0 0 100 110" fill="none">
      {shape === 'round' ? (
        <Circle cx="50" cy="55" r="44" stroke={color} strokeWidth={8} />
      ) : (
        <Path d={crestPaths[shape]} stroke={color} strokeWidth={8} strokeLinejoin="round" />
      )}
    </Svg>
  );
}

function PatternSample({ pattern }: { pattern: TeamCrestPattern }) {
  return (
    <View style={sampleStyles.sample}>
      {pattern === 'stripes'
        ? [0, 8, 16].map((left) => (
            <View key={left} style={[sampleStyles.stripe, { left: left + 4 }]} />
          ))
        : null}
      {pattern === 'half' ? <View style={sampleStyles.half} /> : null}
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(colors: ThemeColors, locale: Locale) {
  const body = bodyFont(locale);
  const semibold = bodyFont(locale, 'semibold');
  const display = displayFont(locale);
  return StyleSheet.create({
    root: {
      flex: 1,
      minHeight: 0,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
      overflow: 'hidden',
      backgroundColor: colors.background,
    },
    keyboardFrame: { flex: 1, minHeight: 0 },
    header: {
      zIndex: 2,
      height: undefined,
      minHeight: headerOverlap,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 18,
      paddingBottom: 12,
    },
    closeButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.background === '#0C1210' ? 'rgba(12,18,16,0.6)' : colors.surface,
    },
    headerTitle: {
      flex: 1,
      minWidth: 0,
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 24,
      lineHeight: 26,
      fontWeight: '800',
    },
    stepLabel: {
      color: colors.textSecondary,
      fontFamily: semibold,
      fontSize: 14,
      fontWeight: '600',
    },
    stage: {
      height: stageHeight,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 18,
    },
    crestBox: { width: 112, height: 128, alignItems: 'center', justifyContent: 'center' },
    crestTools: { position: 'absolute', right: 16, top: 14, gap: 8 },
    toolButton: {
      width: 46,
      height: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolButtonPrimary: { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
    looksRow: { gap: 10, paddingVertical: 2 },
    lookCard: {
      width: 88,
      paddingVertical: 8,
      alignItems: 'center',
      gap: 4,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    lookCardOn: { borderColor: colors.primaryButton },
    lookText: { color: colors.textPrimary, fontSize: 11, fontWeight: '700' },
    emblemRow: { flexDirection: 'row', gap: 8 },
    emblemButton: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emblemButtonOn: { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
    emblemText: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
    emblemTextOn: { color: colors.primaryButtonText },
    previewName: {
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 30,
      lineHeight: 31,
      fontWeight: '800',
      textAlign: 'center',
    },
    previewLine: {
      color: colors.textSecondary,
      fontFamily: body,
      fontSize: 14,
      textAlign: 'center',
    },
    bars: { flexDirection: 'row', gap: 6, paddingHorizontal: 18 },
    body: { flex: 1, minHeight: 0 },
    bodyContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18 },
    stepTitle: {
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 30,
      lineHeight: 30,
      fontWeight: '800',
    },
    helperText: { color: colors.textSecondary, fontFamily: body, fontSize: 14, lineHeight: 20 },
    fieldBlock: { gap: 8 },
    fieldLabelRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    fieldLabel: {
      color: colors.textSecondary,
      fontFamily: semibold,
      fontSize: 14,
      fontWeight: '600',
    },
    characterCount: { color: colors.textSecondary, fontFamily: body, fontSize: 12 },
    field: {
      height: 54,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      borderRadius: 14,
      backgroundColor: colors.option,
      paddingHorizontal: 14,
      color: colors.textPrimary,
      fontFamily: semibold,
      fontSize: 18,
      fontWeight: '600',
    },
    fieldFocused: {
      borderColor: colors.accentText,
      shadowColor: colors.primaryButton,
      shadowOpacity: 0.3,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 0 },
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    half: { flexBasis: '45%' },
    third: { flexBasis: '28%' },
    option: {
      flexGrow: 1,
      minHeight: 48,
      paddingHorizontal: 10,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
      backgroundColor: colors.option,
      alignItems: 'center',
      justifyContent: 'center',
    },
    optionTall: { minHeight: 78, gap: 6 },
    optionRow: { flexDirection: 'row', gap: 8 },
    optionSelected: { backgroundColor: colors.primaryButton, borderColor: colors.primaryButton },
    optionText: { fontFamily: semibold, fontSize: 15, fontWeight: '600' },
    swatchRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, padding: 6 },
    openCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.well,
    },
    openCopy: { flex: 1, minWidth: 0, gap: 2 },
    openTitle: { color: colors.textPrimary, fontFamily: semibold, fontSize: 16, fontWeight: '600' },
    footer: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 18,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.navBorder,
      backgroundColor: colors.navBar,
    },
    nextButton: {
      flex: 1,
      height: 54,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.primaryButton,
    },
    nextText: {
      color: colors.primaryButtonText,
      fontFamily: semibold,
      fontSize: 18,
      fontWeight: '600',
    },
    disabledNext: {
      flex: 1,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.borderStrong,
    },
    disabledNextText: {
      color: colors.textSecondary,
      fontFamily: semibold,
      fontSize: 15,
      fontWeight: '600',
      textAlign: 'center',
    },
    ghostButton: {
      height: 54,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
    },
    ghostText: { color: colors.textPrimary, fontFamily: semibold, fontSize: 16, fontWeight: '600' },
    loadMessage: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 14 },
    success: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      zIndex: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      padding: 24,
      overflow: 'hidden',
      backgroundColor: colors.background === '#0C1210' ? '#070b09' : colors.background,
    },
    successStage: { width: 170, height: 180, alignItems: 'center', justifyContent: 'center' },
    rays: { position: 'absolute', width: 520, height: 520, left: -175, top: -170 },
    confetti: {
      position: 'absolute',
      left: 80,
      top: 85,
      width: 10,
      height: 10,
      borderRadius: 3,
    },
    successName: {
      color: colors.textPrimary,
      fontFamily: display,
      fontSize: 46,
      lineHeight: 46,
      fontWeight: '800',
      textAlign: 'center',
    },
    successBody: {
      maxWidth: 300,
      color: colors.textSecondary,
      fontFamily: body,
      fontSize: 17,
      lineHeight: 24,
      textAlign: 'center',
    },
    successChips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
    successChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: colors.optionBorder,
    },
    successChipText: {
      color: colors.textPrimary,
      fontFamily: semibold,
      fontSize: 14,
      fontWeight: '600',
    },
    doneButton: {
      marginTop: 6,
      height: 54,
      paddingHorizontal: 34,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryButton,
    },
    doneText: {
      color: colors.primaryButtonText,
      fontFamily: semibold,
      fontSize: 17,
      fontWeight: '600',
    },
  });
}

const swatchStyles = StyleSheet.create({
  hit: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: 38, height: 38, borderRadius: 19 },
});
const haloStyles = StyleSheet.create({
  halo: { position: 'absolute', top: -8, left: -14, right: -14, bottom: -8 },
  floor: { position: 'absolute', left: 12, right: 12, bottom: -12, height: 18 },
});
const barStyles = StyleSheet.create({ bar: { flex: 1, height: 5, borderRadius: 999 } });
const sampleStyles = StyleSheet.create({
  sample: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: ink,
    backgroundColor: '#e9f0de',
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', top: 0, bottom: 0, width: 4, backgroundColor: '#56634c' },
  half: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '50%',
    backgroundColor: '#56634c',
  },
});
const toggleStyles = StyleSheet.create({
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
