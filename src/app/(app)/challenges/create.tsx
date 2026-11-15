import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/components/toast/ToastProvider';
import { loadMatchFilters, type MatchArea } from '@/features/matches/match-service';
import { getProfileCompletion } from '@/features/profile/profile-service';
import { defaultCrest, OpenSpotCrest } from '@/features/teams/ChallengeCard';
import {
  cyprusDateAfter,
  nudgeSlot,
  sameSlot,
  slotClock,
  slotToForm,
  type ChallengeSlot,
} from '@/features/teams/challenge-slots';
import { createTeamChallenge } from '@/features/teams/challenge-service';
import { toChallengeWindows } from '@/features/teams/challenge-validation';
import { Crest, crestInitials } from '@/features/teams/TeamCrest';
import { listMyTeams, type MyTeam } from '@/features/teams/team-service';
import { translations } from '@/i18n';
import { matchTicketParts } from '@/i18n/format';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { displayFont } from '@/theme/typography';

const lime = '#cfff4a';
const ink = '#10170f';
const formats = [5, 8, 11] as const;
const stepCount = 4;

export default function CreateChallengeScreen() {
  const { colors, locale } = useAppPreferences();
  const { session } = useAuth();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const copy = translations[locale];
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [step, setStep] = useState(0);
  const [teams, setTeams] = useState<MyTeam[]>([]);
  const [areas, setAreas] = useState<MatchArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [allowed, setAllowed] = useState(true);
  const [teamId, setTeamId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [format, setFormat] = useState<number>(5);
  const [slots, setSlots] = useState<ChallengeSlot[]>([{ dayOffset: 2, from: 19, to: 22 }]);
  const [current, setCurrent] = useState<ChallengeSlot>({ dayOffset: 2, from: 19, to: 22 });
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [doneId, setDoneId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFailed(false);
    setLoading(true);
    try {
      if (!session) {
        setAllowed(false);
        return;
      }
      const [mine, filters, complete] = await Promise.all([
        listMyTeams(),
        loadMatchFilters(),
        getProfileCompletion(session.user.id),
      ]);
      const captained = mine.filter((team) => team.role === 'captain');
      setTeams(captained);
      setAreas(filters.areas);
      setAllowed(complete && captained.length > 0);
      const first = captained[0];
      if (first) {
        setTeamId(first.teamId);
        setAreaId(filters.areas.find((area) => area.city_id === first.cityId)?.id ?? '');
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    const task = setTimeout(() => void load(), 0);
    return () => clearTimeout(task);
  }, [load]);

  const team = teams.find((item) => item.teamId === teamId);
  const teamAreas = areas.filter((area) => area.city_id === team?.cityId);
  const area = areas.find((item) => item.id === areaId);
  const areaName = (item: MatchArea) => (locale === 'el' ? item.name_el : item.name_en);
  const cityName = team ? (locale === 'el' ? team.cityNameEl : team.cityNameEn) : '';
  const canNext =
    step === 0 ? Boolean(team) : step === 1 ? Boolean(area) : step === 2 ? slots.length > 0 : true;

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/challenges' as Href);
  };

  const submit = async () => {
    if (!team || !area) return;
    const windows = toChallengeWindows(slots.map((slot) => slotToForm(slot)));
    if (!windows) {
      showToast(copy.challengeValidationWindows, 'error');
      return;
    }
    setSaving(true);
    try {
      const id = await createTeamChallenge({
        homeTeamId: team.teamId,
        format,
        cityId: team.cityId,
        areaId: area.id,
        skillLevel: null,
        note: note.trim(),
        windows,
      });
      setDoneId(id);
      setStep(stepCount);
    } catch {
      showToast(copy.challengeCreateError, 'error');
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step === stepCount - 1) void submit();
    else if (canNext) setStep(step + 1);
  };

  const addSlot = () => {
    if (slots.length >= 5 || slots.some((slot) => sameSlot(slot, current))) return;
    setSlots((list) =>
      [...list, current].sort((a, b) => a.dayOffset - b.dayOffset || a.from - b.from),
    );
  };

  const slotLabel = (slot: ChallengeSlot) => {
    const parts = matchTicketParts(`${cyprusDateAfter(slot.dayOffset)}T12:00:00Z`, locale);
    return `${parts.weekday} ${parts.day} ${parts.month}`;
  };
  const look = team?.crest ?? defaultCrest;
  const titles = [
    copy.challengeStepTeam,
    copy.challengeStepWhere,
    copy.challengeStepWhen,
    copy.challengeStepReview,
  ];
  const finished = step === stepCount && doneId;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.frame}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.challengeClose}
            onPress={close}
            style={styles.closeButton}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.headerTitle}>
            {finished ? copy.challengeDoneTitle : titles[step]}
          </Text>
          {finished ? null : (
            <Text style={styles.stepLabel}>
              {copy.challengeStepLabel
                .replace('{step}', String(step + 1))
                .replace('{total}', String(stepCount))}
            </Text>
          )}
        </View>
        <View style={styles.bars}>
          {Array.from({ length: stepCount }, (_, index) => (
            <View key={index} style={[styles.bar, index <= step && styles.barOn]} />
          ))}
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <Text accessibilityRole="progressbar" style={styles.hint}>
              {copy.chatLoading}
            </Text>
          ) : failed ? (
            <View style={{ gap: 12 }}>
              <Text accessibilityRole="alert" style={styles.hint}>
                {copy.challengeLoadError}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.soft}>
                <Text style={styles.softText}>{copy.challengeRetry}</Text>
              </Pressable>
            </View>
          ) : !allowed ? (
            <Text accessibilityRole="alert" style={styles.hint}>
              {session ? copy.challengeEmptyCaptain : copy.challengeSignIn}
            </Text>
          ) : finished ? (
            <View style={styles.done}>
              <Crest {...look} initials={crestInitials(team?.name ?? '')} size={84} />
              <Text style={styles.doneTitle}>{copy.challengeDoneTitle}</Text>
              <Text style={styles.doneBody}>
                {copy.challengeDoneBody.replace('{area}', area ? areaName(area) : cityName)}
              </Text>
            </View>
          ) : step === 0 ? (
            <View style={{ gap: 12 }}>
              <Text style={styles.hint}>{copy.challengeStepTeamHint}</Text>
              {teams.map((item) => {
                const selected = item.teamId === teamId;
                return (
                  <Pressable
                    key={item.teamId}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      setTeamId(item.teamId);
                      setAreaId(areas.find((a) => a.city_id === item.cityId)?.id ?? '');
                    }}
                    style={[styles.option, selected && styles.optionOn]}
                  >
                    <Crest
                      {...(item.crest ?? defaultCrest)}
                      initials={crestInitials(item.name)}
                      size={40}
                    />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={styles.optionTitle}>
                        {item.name}
                      </Text>
                      <Text style={styles.optionSub}>
                        {copy.challengeHomeArea.replace(
                          '{area}',
                          locale === 'el' ? item.cityNameEl : item.cityNameEn,
                        )}
                      </Text>
                    </View>
                    <View style={[styles.tick, selected && styles.tickOn]}>
                      {selected ? <Text style={styles.tickText}>✓</Text> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : step === 1 ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.label}>{copy.challengeArea.toUpperCase()}</Text>
              <View style={styles.chips}>
                {teamAreas.map((item) => (
                  <Chip
                    key={item.id}
                    label={areaName(item)}
                    selected={areaId === item.id}
                    onPress={() => setAreaId(item.id)}
                    styles={styles}
                  />
                ))}
              </View>
              <Text style={[styles.label, { marginTop: 10 }]}>
                {copy.challengeFormat.toUpperCase()}
              </Text>
              <View style={styles.chips}>
                {formats.map((size) => (
                  <Chip
                    key={size}
                    label={`${size}v${size}`}
                    selected={format === size}
                    onPress={() => setFormat(size)}
                    styles={styles}
                  />
                ))}
              </View>
            </View>
          ) : step === 2 ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.hint}>{copy.challengeWhenHint}</Text>
              <Text style={styles.label}>{copy.challengeDayLabel}</Text>
              <View style={styles.days}>
                {Array.from({ length: 7 }, (_, index) => index + 1).map((offset) => {
                  const date = cyprusDateAfter(offset);
                  const parts = matchTicketParts(`${date}T12:00:00Z`, locale);
                  const selected = current.dayOffset === offset;
                  return (
                    <Pressable
                      key={offset}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${parts.weekday} ${parts.day} ${parts.month}`}
                      onPress={() => setCurrent({ ...current, dayOffset: offset })}
                      style={[styles.day, selected && styles.dayOn]}
                    >
                      <Text style={[styles.dayName, selected && { color: ink }]}>
                        {parts.weekday.slice(0, 3).toUpperCase()}
                      </Text>
                      <Text style={[styles.dayNum, selected && { color: ink }]}>{parts.day}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.label, { marginTop: 8 }]}>{copy.challengeBetweenLabel}</Text>
              <View style={styles.times}>
                <Stepper
                  label={copy.challengeFromLabel}
                  value={slotClock(current.from)}
                  onLess={() => setCurrent(nudgeSlot(current, 'from', -0.5))}
                  onMore={() => setCurrent(nudgeSlot(current, 'from', 0.5))}
                  lessLabel={copy.challengeEarlier}
                  moreLabel={copy.challengeLater}
                  styles={styles}
                />
                <Text style={styles.arrow}>→</Text>
                <Stepper
                  label={copy.challengeUntilLabel}
                  value={slotClock(current.to)}
                  onLess={() => setCurrent(nudgeSlot(current, 'to', -0.5))}
                  onMore={() => setCurrent(nudgeSlot(current, 'to', 0.5))}
                  lessLabel={copy.challengeEarlier}
                  moreLabel={copy.challengeLater}
                  styles={styles}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={slots.length >= 5}
                onPress={addSlot}
                style={[styles.addSlot, slots.length >= 5 && { opacity: 0.4 }]}
              >
                <Text style={styles.addSlotText}>{copy.challengeAddSlot}</Text>
              </Pressable>
              {slots.map((slot) => (
                <View key={`${slot.dayOffset}-${slot.from}-${slot.to}`} style={styles.slotRow}>
                  <Text style={styles.slotText}>
                    {slotLabel(slot)}
                    {'   '}
                    <Text style={{ color: lime }}>
                      {slotClock(slot.from)}–{slotClock(slot.to)}
                    </Text>
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={copy.challengeRemoveSlot}
                    disabled={slots.length < 2}
                    onPress={() => setSlots((list) => list.filter((item) => item !== slot))}
                    style={[styles.slotRemove, slots.length < 2 && { opacity: 0.35 }]}
                  >
                    <Text style={styles.closeText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={styles.previewWrap}>
                <View style={styles.preview}>
                  <View style={styles.vs}>
                    <View style={styles.side}>
                      <Crest {...look} initials={crestInitials(team?.name ?? '')} size={52} />
                      <Text numberOfLines={1} style={styles.sideName}>
                        {team?.name}
                      </Text>
                      <Text style={styles.sideTag}>{copy.challengeHomeLabel}</Text>
                    </View>
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <Text style={[styles.vsText, { fontFamily: displayFont(locale) }]}>VS</Text>
                      <Text style={styles.formatPill}>{`${format}v${format}`}</Text>
                    </View>
                    <View style={styles.side}>
                      <OpenSpotCrest size={52} color={lime} />
                      <Text numberOfLines={1} style={styles.sideName}>
                        {copy.challengeSlotWaiting}
                      </Text>
                      <Text style={styles.sideTag}>{copy.challengeOpenSpot}</Text>
                    </View>
                  </View>
                  <Text style={styles.optionSub}>
                    📍 {area ? areaName(area) : ''}, {cityName}
                  </Text>
                  <View style={styles.slotChips}>
                    {slots.map((slot) => (
                      <Text key={`${slot.dayOffset}-${slot.from}`} style={styles.slotChip}>
                        {slotLabel(slot)}
                        {'  '}
                        <Text style={{ color: lime }}>
                          {slotClock(slot.from)}–{slotClock(slot.to)}
                        </Text>
                      </Text>
                    ))}
                  </View>
                </View>
                <View pointerEvents="none" style={styles.sticker}>
                  <Text style={styles.stickerText}>{copy.challengePreview}</Text>
                </View>
              </View>
              <Text style={styles.label}>{copy.challengeNote.toUpperCase()}</Text>
              <TextInput
                accessibilityLabel={copy.challengeNote}
                value={note}
                onChangeText={setNote}
                placeholder={copy.challengeNotePlaceholder}
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={500}
                style={styles.noteInput}
              />
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 6 }]}>
          {step > 0 && !finished ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep(step - 1)}
              style={styles.back}
            >
              <Text style={styles.backText}>{copy.challengeBack}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            disabled={finished ? false : !canNext || saving || loading || failed || !allowed}
            onPress={() => (finished ? router.replace('/challenges' as Href) : next())}
            style={({ pressed }) => [
              styles.next,
              !finished &&
                (!canNext || saving || loading || failed || !allowed) && { opacity: 0.5 },
              pressed && { opacity: 0.88 },
            ]}
          >
            <Text style={styles.nextText}>
              {finished
                ? copy.challengeViewMine
                : step === stepCount - 1
                  ? saving
                    ? copy.matchSaving
                    : copy.challengePublish
                  : step === 2 && slots.length === 0
                    ? copy.challengeNeedSlot
                    : `${copy.challengeNext}  →`}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function Chip({
  label,
  selected,
  onPress,
  styles,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipOn]}
    >
      <Text style={[styles.chipText, selected && { color: ink }]}>{label}</Text>
    </Pressable>
  );
}

function Stepper({
  label,
  value,
  onLess,
  onMore,
  lessLabel,
  moreLabel,
  styles,
}: {
  label: string;
  value: string;
  onLess: () => void;
  onMore: () => void;
  lessLabel: string;
  moreLabel: string;
  styles: Styles;
}) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${lessLabel}`}
        onPress={onLess}
        style={styles.stepBtn}
      >
        <Text style={styles.stepBtnText}>−</Text>
      </Pressable>
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.stepLabelText}>{label}</Text>
        <Text style={styles.stepValue}>{value}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} ${moreLabel}`}
        onPress={onMore}
        style={styles.stepBtn}
      >
        <Text style={styles.stepBtnText}>+</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    frame: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingBottom: 10,
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
    body: { flex: 1 },
    bodyContent: { padding: 16, paddingTop: 18, gap: 12 },
    hint: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    label: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6 },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 12,
    },
    optionOn: { borderColor: lime, backgroundColor: 'rgba(207,255,74,0.07)' },
    optionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
    optionSub: { color: colors.textSecondary, fontSize: 13 },
    tick: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tickOn: { backgroundColor: lime, borderColor: lime },
    tickText: { color: ink, fontSize: 13, fontWeight: '800' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    chipOn: { backgroundColor: lime, borderColor: lime },
    chipText: { color: colors.textPrimary, fontSize: 14, fontWeight: '700' },
    days: { flexDirection: 'row', gap: 6 },
    day: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    dayOn: { backgroundColor: lime, borderColor: lime },
    dayName: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
    dayNum: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
    times: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    arrow: { color: colors.textSecondary, fontWeight: '800' },
    stepper: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 6,
    },
    stepBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: { color: colors.textPrimary, fontSize: 18, fontWeight: '800' },
    stepLabelText: {
      color: colors.textSecondary,
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.4,
    },
    stepValue: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
    addSlot: {
      height: 46,
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: 'rgba(207,255,74,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    addSlotText: { color: lime, fontSize: 15, fontWeight: '800' },
    slotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 10,
    },
    slotText: { flex: 1, color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
    slotRemove: {
      width: 32,
      height: 32,
      borderRadius: 9,
      backgroundColor: colors.surfaceRaised,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewWrap: { paddingTop: 11 },
    preview: {
      borderWidth: 1.5,
      borderColor: lime,
      borderRadius: 22,
      backgroundColor: colors.cardBottom,
      padding: 14,
      gap: 11,
    },
    sticker: {
      position: 'absolute',
      top: 0,
      right: 16,
      backgroundColor: lime,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      transform: [{ rotate: '3deg' }],
    },
    stickerText: { color: ink, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
    vs: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#070b09',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 8,
    },
    side: { flex: 1, minWidth: 0, alignItems: 'center', gap: 5 },
    sideName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', maxWidth: '100%' },
    sideTag: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
    vsText: { color: lime, fontSize: 26, lineHeight: 28, fontWeight: '800' },
    formatPill: {
      color: colors.textPrimary,
      fontSize: 11,
      fontWeight: '700',
      backgroundColor: colors.surfaceRaised,
      borderRadius: 8,
      paddingHorizontal: 7,
      paddingVertical: 2,
      overflow: 'hidden',
    },
    slotChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    slotChip: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
      borderColor: 'rgba(255,255,255,0.16)',
      borderWidth: 1,
      borderRadius: 9,
      paddingHorizontal: 9,
      paddingVertical: 4,
      overflow: 'hidden',
    },
    noteInput: {
      minHeight: 84,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.textPrimary,
      padding: 12,
      fontSize: 15,
      textAlignVertical: 'top',
    },
    done: { alignItems: 'center', gap: 10, paddingVertical: 24 },
    doneTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', textAlign: 'center' },
    doneBody: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
      maxWidth: 300,
    },
    soft: {
      minHeight: 46,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    softText: { color: colors.textPrimary, fontWeight: '700' },
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
    backText: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
    next: {
      flex: 1,
      height: 52,
      borderRadius: 16,
      backgroundColor: lime,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextText: { color: ink, fontSize: 17, fontWeight: '800' },
  });
}
