import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  Line,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

import { useEntrance, useLoop } from '@/components/motion';
import { StageBackdrop } from '@/components/stage-backdrop';
import { useToast } from '@/components/toast/ToastProvider';
import type { TranslationKey } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { bodyFont, displayFont } from '@/theme/typography';

import type { Position, SkillLevel, StrongFoot } from './profile-validation';

type Copy = { [Key in TranslationKey]: string };

export type PlayerCardData = {
  name: string;
  location: string;
  number: number;
  position: Position;
  positionLabel: string;
  strongFoot: StrongFoot;
  strongFootLabel: string;
  skillLevel: SkillLevel | null;
  levelLabel: string;
};

type PlayerCardShareModalProps = PlayerCardData & {
  visible: boolean;
  onClose: () => void;
  copy: Copy;
};

const W = 360;
const H = 640;
const ink = '#0c1210';
const lime = '#cfff4a';
const sage = '#b9c4b4';
const shortPositions: Record<Position, string> = {
  forward: 'ST',
  midfielder: 'MF',
  defender: 'DF',
  goalkeeper: 'GK',
  any: 'ANY',
};
/** Marker centre on the mini pitch (attack is up). */
const pitchSpots: Record<Position, { x: number; y: number }> = {
  forward: { x: 0.5, y: 0.2 },
  midfielder: { x: 0.5, y: 0.47 },
  defender: { x: 0.5, y: 0.72 },
  goalkeeper: { x: 0.5, y: 0.9 },
  any: { x: 0.5, y: 0.5 },
};

export function PlayerCardShareModal({ visible, onClose, copy, ...card }: PlayerCardShareModalProps) {
  const { locale, colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const cardRef = useRef<Svg>(null);
  const [busyAction, setBusyAction] = useState<'share' | 'save' | null>(null);
  const reveal = useEntrance(800, 120, Easing.bezier(0.2, 1.2, 0.3, 1), visible);
  const sheen = useLoop(4200, { delay: 900, easing: Easing.inOut(Easing.ease) });
  const [cardWidth, setCardWidth] = useState(0);

  const exportCard = () =>
    Platform.OS === 'web' ? exportCardOnWeb() : exportCardNative();
  const exportCardNative = () =>
    new Promise<string>((resolve, reject) => {
      if (!cardRef.current) {
        reject(new Error('Player card is not ready.'));
        return;
      }
      try {
        cardRef.current.toDataURL((base64) => {
          if (base64) resolve(base64);
          else reject(new Error('Player card image is empty.'));
        });
      } catch (error) {
        reject(error);
      }
    });

  const downloadOnWeb = (base64: string) => {
    const binary = window.atob(base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'one-more-player-card.png';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleAction = async (action: 'share' | 'save') => {
    setBusyAction(action);
    try {
      const base64 = await exportCard();
      if (Platform.OS === 'web') {
        const file = new File(
          [Uint8Array.from(window.atob(base64), (character) => character.charCodeAt(0))],
          'one-more-player-card.png',
          { type: 'image/png' },
        );
        if (action === 'share' && navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: copy.profileCardShare });
        } else {
          downloadOnWeb(base64);
          showToast(copy.profileCardDownloaded, 'success');
        }
        return;
      }

      const fileUri = `${FileSystem.cacheDirectory}one-more-player-card-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (action === 'share') {
        if (!(await Sharing.isAvailableAsync())) throw new Error('System sharing is unavailable.');
        await Sharing.shareAsync(fileUri, {
          mimeType: 'image/png',
          UTI: 'public.png',
          dialogTitle: copy.profileShareCardTitle,
        });
      } else {
        await MediaLibrary.saveToLibraryAsync(fileUri);
        showToast(copy.profileCardSaved, 'success');
      }
    } catch {
      showToast(copy.profileCardSaveError, 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const cardName = card.name.trim() || (locale === 'en' ? 'ONE MORE Player' : 'Παίκτης ONE MORE');
  const semibold = bodyFont(locale, 'semibold');

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View
        style={[
          styles.modalRoot,
          {
            backgroundColor: colors.background === '#0C1210' ? '#070b09' : colors.background,
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 18),
          },
        ]}
      >
        <StageBackdrop id="player-card-stage" colors={colors} height="100%" glowY="45%" glowStop={0.7} rise={420} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.profileCardClose}
          onPress={onClose}
          style={[styles.closeButton, { top: Math.max(insets.top, 12), borderColor: colors.optionBorder }]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M6 6l12 12M18 6L6 18" stroke={colors.textPrimary} strokeWidth={2.4} strokeLinecap="round" />
          </Svg>
        </Pressable>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text
            accessibilityRole="header"
            style={[styles.heading, { color: colors.textPrimary, fontFamily: displayFont(locale) }]}
          >
            {copy.profileShareCardTitle}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontFamily: bodyFont(locale) }]}>
            {copy.profileShareCardSubtitle}
          </Text>

          <Animated.View
            onLayout={(event) => setCardWidth(event.nativeEvent.layout.width)}
            style={[
              styles.cardFrame,
              {
                opacity: reveal,
                transform: [
                  { perspective: 900 },
                  { rotateY: reveal.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] }) },
                  { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                ],
              },
            ]}
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
            {cardWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.sheen,
                  {
                    width: cardWidth * 0.6,
                    transform: [
                      {
                        translateX: sheen.interpolate({
                          inputRange: [0, 0.4, 1],
                          outputRange: [-cardWidth, cardWidth * 1.4, cardWidth * 1.4],
                        }),
                      },
                      { rotate: '18deg' },
                    ],
                  },
                ]}
              >
                <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 10 10">
                  <Defs>
                    <LinearGradient id="card-sheen" x1="0" y1="0" x2="1" y2="0">
                      <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
                      <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0.14" />
                      <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                    </LinearGradient>
                  </Defs>
                  <Rect width="10" height="10" fill="url(#card-sheen)" />
                </Svg>
              </Animated.View>
            ) : null}
          </Animated.View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleAction('share')}
              disabled={busyAction !== null}
              style={({ pressed }) => [
                styles.actionButton,
                { backgroundColor: colors.primaryButton, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              {busyAction === 'share' ? (
                <ActivityIndicator color={colors.primaryButtonText} />
              ) : (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"
                    stroke={colors.primaryButtonText}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
              <Text style={[styles.actionText, { color: colors.primaryButtonText, fontFamily: semibold }]}>
                {copy.profileCardShare}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleAction('save')}
              disabled={busyAction !== null}
              style={({ pressed }) => [
                styles.actionButton,
                styles.secondaryAction,
                { borderColor: colors.optionBorder, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              {busyAction === 'save' ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"
                    stroke={colors.textPrimary}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
              <Text style={[styles.actionText, { color: colors.textPrimary, fontFamily: semibold }]}>
                {busyAction === 'save' ? copy.profileCardSaving : copy.profileCardSaveImage}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

type Palette = { accent: string; glow: string; top: string; bottom: string; onAccent: string };
/** Card colourway follows the player's level, so cards feel collectible. */
const palettes: Record<SkillLevel | 'none', Palette> = {
  beginner: { accent: '#7ef0c8', glow: '#2fd6a0', top: '#12322b', bottom: '#040d0b', onAccent: ink },
  intermediate: { accent: lime, glow: '#a6ff00', top: '#1d3624', bottom: '#060a07', onAccent: ink },
  advanced: { accent: '#ffd34d', glow: '#ffb000', top: '#3a2c0c', bottom: '#0a0803', onAccent: ink },
  none: { accent: lime, glow: '#a6ff00', top: '#1d3624', bottom: '#060a07', onAccent: ink },
};

/** Small deterministic PRNG so every player gets their own pattern and ID. */
function seeded(text: string) {
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  let state = hash >>> 0;
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  return { next, id: (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 6) };
}

/** The exported artwork. Pure SVG so it can be rendered to a PNG for sharing. */
function PlayerCardArt({
  name,
  location,
  number,
  position,
  positionLabel,
  strongFoot,
  skillLevel,
  levelLabel,
  copy,
}: PlayerCardData & { copy: Copy }) {
  const palette = palettes[skillLevel ?? 'none'];
  const { accent, glow, onAccent } = palette;
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const surname = (words.length > 1 ? words[words.length - 1] : words[0] ?? 'PLAYER').toUpperCase();
  const firstName = words.length > 1 ? words.slice(0, -1).join(' ').toUpperCase() : '';
  const surnameSize = Math.min(92, Math.floor(640 / Math.max(surname.length, 4)));
  const random = seeded(`${name}|${number}`);
  const playerId = `${random.id}-${String(number).padStart(2, '0')}`;
  const shards = Array.from({ length: 7 }, () => {
    const x = random.next() * W;
    const y = 60 + random.next() * 360;
    const size = 60 + random.next() * 140;
    const angle = random.next() * Math.PI * 2;
    const point = (offset: number, scale: number) =>
      `${(x + Math.cos(angle + offset) * size * scale).toFixed(1)},${(y + Math.sin(angle + offset) * size * scale).toFixed(1)}`;
    return { points: `${point(0, 1)} ${point(2.3, 0.55)} ${point(4.1, 0.8)}`, opacity: 0.04 + random.next() * 0.08 };
  });
  const bars = skillLevel === 'advanced' ? 3 : skillLevel === 'intermediate' ? 2 : skillLevel === 'beginner' ? 1 : 0;
  const numberText = String(number);
  const spot = pitchSpots[position];
  const footShort = strongFoot === 'left' ? 'L' : strongFoot === 'right' ? 'R' : 'L+R';
  const stubTop = 548;

  return (
    <>
      <Defs>
        <ClipPath id="pc-clip">
          <Rect width={W} height={H} rx="30" />
        </ClipPath>
        <LinearGradient id="pc-bg" x1="0" y1="0" x2="0.4" y2="1">
          <Stop offset="0" stopColor={palette.top} />
          <Stop offset="1" stopColor={palette.bottom} />
        </LinearGradient>
        <RadialGradient id="pc-glow" cx="70%" cy="22%" r="60%">
          <Stop offset="0" stopColor={glow} stopOpacity="0.5" />
          <Stop offset="0.5" stopColor={glow} stopOpacity="0.08" />
          <Stop offset="1" stopColor={glow} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="pc-number" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={accent} stopOpacity="1" />
          <Stop offset="1" stopColor={accent} stopOpacity="0.15" />
        </LinearGradient>
        <LinearGradient id="pc-edge" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={accent} />
          <Stop offset="0.3" stopColor="#ffffff" stopOpacity="0.5" />
          <Stop offset="0.5" stopColor={accent} stopOpacity="0.15" />
          <Stop offset="0.75" stopColor="#ffffff" stopOpacity="0.45" />
          <Stop offset="1" stopColor={accent} />
        </LinearGradient>
        <LinearGradient id="pc-fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.bottom} stopOpacity="0" />
          <Stop offset="1" stopColor={palette.bottom} stopOpacity="0.95" />
        </LinearGradient>
        <RadialGradient id="pc-heat" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={accent} stopOpacity="0.9" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <G clipPath="url(#pc-clip)">
        <Rect width={W} height={H} fill="url(#pc-bg)" />
        {shards.map((shard, index) => (
          <Polygon key={index} points={shard.points} fill={accent} opacity={shard.opacity} />
        ))}
        {/* halftone dots fading towards the bottom */}
        {Array.from({ length: 14 }, (_, row) =>
          Array.from({ length: 13 }, (_, column) => (
            <Circle
              key={`${row}-${column}`}
              cx={12 + column * 28 + (row % 2) * 14}
              cy={70 + row * 24}
              r={Math.max(0.4, 2.4 - row * 0.16)}
              fill={accent}
              opacity={0.12}
            />
          )),
        )}
        <Rect width={W} height={H} fill="url(#pc-glow)" />
        {/* diagonal speed slashes */}
        <Polygon points={`-40,330 ${W + 40},150 ${W + 40},178 -40,358`} fill={accent} opacity="0.9" />
        <Polygon points={`-40,372 ${W + 40},192 ${W + 40},198 -40,378`} fill={accent} opacity="0.45" />

        {/* giant double-printed number */}
        <SvgText
          x={W - 14}
          y="352"
          textAnchor="end"
          fontSize="330"
          fontWeight="800"
          fontFamily="BarlowCondensed_800ExtraBold"
          fill="none"
          stroke={accent}
          strokeWidth="2"
          opacity="0.55"
        >
          {numberText}
        </SvgText>
        <SvgText
          x={W - 26}
          y="340"
          textAnchor="end"
          fontSize="330"
          fontWeight="800"
          fontFamily="BarlowCondensed_800ExtraBold"
          fill="url(#pc-number)"
        >
          {numberText}
        </SvgText>

        {/* vertical position strip */}
        <G transform={`translate(30 ${stubTop - 210}) rotate(-90)`}>
          <SvgText x="0" y="0" fill={accent} fontSize="12" fontWeight="700" letterSpacing="5" fontFamily="Barlow_600SemiBold">
            {`${positionLabel.toUpperCase()} · ${shortPositions[position]}`}
          </SvgText>
        </G>

        {/* header */}
        <SvgImage href={require('@/assets/images/one-more-logo.png')} x="22" y="22" width="44" height="44" />
        <SvgText x="76" y="40" fill="#ffffff" fontSize="15" fontWeight="800" letterSpacing="1" fontFamily="BarlowCondensed_800ExtraBold">
          ONE MORE
        </SvgText>
        <SvgText x="76" y="57" fill={accent} fontSize="8.5" fontWeight="700" letterSpacing="1.4" fontFamily="Barlow_600SemiBold">
          {copy.profileCardMatchday}
        </SvgText>
        <G>
          <Rect x={W - 22 - 146} y="24" width="146" height="40" rx="20" fill="#000000" opacity="0.35" stroke={accent} strokeWidth="1.5" />
          {[0, 1, 2].map((index) => (
            <Path
              key={index}
              d="M0 -6 L1.8 -1.9 L6.2 -1.8 L2.8 1 L4 5.4 L0 2.9 L-4 5.4 L-2.8 1 L-6.2 -1.8 L-1.8 -1.9 Z"
              transform={`translate(${W - 22 - 128 + index * 15} 44)`}
              fill={index < bars ? accent : 'none'}
              stroke={accent}
              strokeWidth="1.2"
            />
          ))}
          <SvgText x={W - 22 - 50} y="49" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="700" letterSpacing="1" fontFamily="Barlow_600SemiBold">
            {truncate(levelLabel.toUpperCase(), 13)}
          </SvgText>
        </G>

        {/* name block */}
        <Rect x="0" y="380" width={W} height={stubTop - 380} fill="url(#pc-fade)" />
        {firstName ? (
          <SvgText x="24" y="424" fill="#ffffff" fontSize="18" fontWeight="700" letterSpacing="5" fontFamily="Barlow_600SemiBold">
            {truncate(firstName, 22)}
          </SvgText>
        ) : null}
        <SvgText x="20" y={424 + surnameSize * 0.82} fill="#ffffff" fontSize={surnameSize} fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
          {surname}
        </SvgText>
        <Rect x="24" y={436 + surnameSize * 0.82} width="56" height="5" fill={accent} />
        <SvgText x="92" y={442 + surnameSize * 0.82} fill={sage} fontSize="13" fontWeight="500" fontFamily="Barlow_500Medium">
          {truncate(location, 34)}
        </SvgText>

        {/* ticket stub */}
        <Rect x="0" y={stubTop} width={W} height={H - stubTop} fill={accent} />
        <Line x1="18" y1={stubTop} x2={W - 18} y2={stubTop} stroke={onAccent} strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" opacity="0.5" />
        <Circle cx="0" cy={stubTop} r="12" fill={palette.bottom} />
        <Circle cx={W} cy={stubTop} r="12" fill={palette.bottom} />
        <StubStat x={24} label={copy.profileCardFoot} value={footShort} color={onAccent} top={stubTop} />
        <StubStat x={92} label={copy.profileCardPosition} value={shortPositions[position]} color={onAccent} top={stubTop} />
        <StubStat x={176} label={copy.profileCardPlayerId} value={playerId} color={onAccent} top={stubTop} small />
        {/* mini pitch with heat */}
        <G transform={`translate(${W - 68} ${stubTop + 14})`}>
          <Rect x="0" y="0" width="46" height="62" rx="5" fill={onAccent} />
          <Circle cx={spot.x * 46} cy={spot.y * 62} r="16" fill="url(#pc-heat)" />
          <Rect x="3" y="3" width="40" height="56" rx="3" fill="none" stroke={accent} strokeOpacity="0.55" strokeWidth="1" />
          <Line x1="3" y1="31" x2="43" y2="31" stroke={accent} strokeOpacity="0.55" strokeWidth="1" />
          <Circle cx="23" cy="31" r="6" fill="none" stroke={accent} strokeOpacity="0.55" strokeWidth="1" />
          <Circle cx={spot.x * 46} cy={spot.y * 62} r="4" fill={accent} />
        </G>
        <SvgText x="24" y={H - 16} fill={onAccent} fontSize="10" fontWeight="700" letterSpacing="2.6" fontFamily="Barlow_600SemiBold">
          {copy.profileCardBrandLine}
        </SvgText>
      </G>
      <Rect x="1.5" y="1.5" width={W - 3} height={H - 3} rx="29" fill="none" stroke="url(#pc-edge)" strokeWidth="3" />
    </>
  );
}

function StubStat({
  x,
  label,
  value,
  color,
  top,
  small = false,
}: {
  x: number;
  label: string;
  value: string;
  color: string;
  top: number;
  small?: boolean;
}) {
  return (
    <G>
      <SvgText x={x} y={top + 30} fill={color} opacity="0.65" fontSize="9" fontWeight="700" letterSpacing="1.6" fontFamily="Barlow_600SemiBold">
        {label}
      </SvgText>
      <SvgText x={x} y={top + 60} fill={color} fontSize={small ? 22 : 30} fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
        {value}
      </SvgText>
    </G>
  );
}


const exportScale = 3;
const cardFonts = ['BarlowCondensed_800ExtraBold', 'Barlow_600SemiBold', 'Barlow_500Medium'];

async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Font-face URLs that expo-font registered on the page, by family name. */
function registeredFontUrls(): Map<string, string> {
  const urls = new Map<string, string>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSFontFaceRule)) continue;
      const family = rule.style.getPropertyValue('font-family').replace(/["']/g, '').trim();
      const match = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue('src'));
      if (family && match) urls.set(family, match[1]);
    }
  }
  return urls;
}

/**
 * Web export: the browser cannot see page fonts or external images inside an SVG
 * drawn to a canvas, so inline both as data URLs and render at 3x for a sharp PNG.
 */
async function exportCardOnWeb(): Promise<string> {
  const source = document.querySelector('#player-card-art svg');
  if (!(source instanceof SVGSVGElement)) throw new Error('Player card is not ready.');
  const svg = source.cloneNode(true) as SVGSVGElement;
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(W * exportScale));
  svg.setAttribute('height', String(H * exportScale));
  svg.removeAttribute('style');

  for (const image of Array.from(svg.querySelectorAll('image'))) {
    const href = image.getAttribute('href') ?? image.getAttribute('xlink:href');
    if (href && !href.startsWith('data:')) image.setAttribute('href', await toDataUrl(href));
  }
  const fontUrls = registeredFontUrls();
  const faces = await Promise.all(
    cardFonts.map(async (family) => {
      const url = fontUrls.get(family);
      return url ? `@font-face{font-family:'${family}';src:url(${await toDataUrl(url)});}` : '';
    }),
  );
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = faces.join('');
  svg.insertBefore(style, svg.firstChild);

  const markup = new XMLSerializer().serializeToString(svg);
  const image = new window.Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = W * exportScale;
  canvas.height = H * exportScale;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, paddingHorizontal: 18, overflow: 'hidden' },
  closeButton: {
    position: 'absolute',
    right: 18,
    zIndex: 4,
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(12,18,16,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48, paddingBottom: 12, gap: 6 },
  heading: { fontSize: 30, lineHeight: 32, fontWeight: '800', width: '100%', maxWidth: 400 },
  subtitle: { fontSize: 15, width: '100%', maxWidth: 400, marginBottom: 14 },
  cardFrame: {
    width: '100%',
    maxWidth: 400,
    aspectRatio: W / H,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: lime,
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  sheen: { position: 'absolute', top: '-20%', bottom: '-20%', left: 0 },
  actions: { width: '100%', maxWidth: 400, flexDirection: 'row', gap: 10, marginTop: 16 },
  actionButton: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  secondaryAction: { borderWidth: 1.5, backgroundColor: 'rgba(12,18,16,0.6)' },
  actionText: { fontSize: 16, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
});
