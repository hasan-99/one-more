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
  formats: number[];
  /** Seven flags, Monday first. */
  days: boolean[];
  dayLetters: string[];
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
const paper = '#f2f5ec';
const sage = '#b9c4b4';
const line = '#2a3d31';
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
const jerseyPath =
  'M70 14 C82 26 118 26 130 14 L170 30 L194 70 L166 86 L154 66 L154 176 C154 181 150 184 146 184 L54 184 C50 184 46 181 46 176 L46 66 L34 86 L6 70 L30 30 Z';

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

/** The exported artwork. Pure SVG so it can be rendered to a PNG for sharing. */
function PlayerCardArt({
  name,
  location,
  number,
  position,
  positionLabel,
  strongFoot,
  strongFootLabel,
  skillLevel,
  levelLabel,
  formats,
  days,
  dayLetters,
  copy,
}: PlayerCardData & { copy: Copy }) {
  const shownName = truncate(name, 20);
  const nameSize = shownName.length > 16 ? 34 : shownName.length > 12 ? 40 : 46;
  const surname = (name.trim().split(/\s+/u).pop() ?? '').toUpperCase().slice(0, 10);
  const bars = skillLevel === 'advanced' ? 3 : skillLevel === 'intermediate' ? 2 : skillLevel === 'beginner' ? 1 : 0;
  const spot = pitchSpots[position];
  const anyDay = days.some(Boolean);
  const tileY = 368;
  const tileW = 100;
  const tileH = 82;
  const tiles = [24, 130, 236];

  return (
    <>
      <Defs>
        <ClipPath id="pc-clip">
          <Rect width={W} height={H} rx="30" />
        </ClipPath>
        <LinearGradient id="pc-bg" x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor="#1b3123" />
          <Stop offset="0.55" stopColor="#0f1b14" />
          <Stop offset="1" stopColor="#070b09" />
        </LinearGradient>
        <RadialGradient id="pc-glow" cx="50%" cy="28%" r="55%">
          <Stop offset="0" stopColor={lime} stopOpacity="0.32" />
          <Stop offset="0.6" stopColor={lime} stopOpacity="0.04" />
          <Stop offset="1" stopColor={lime} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="pc-beam" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#deff96" stopOpacity="0.28" />
          <Stop offset="0.8" stopColor="#deff96" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="pc-edge" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={lime} stopOpacity="1" />
          <Stop offset="0.35" stopColor={lime} stopOpacity="0.15" />
          <Stop offset="0.65" stopColor="#7ef0c8" stopOpacity="0.2" />
          <Stop offset="1" stopColor={lime} stopOpacity="0.9" />
        </LinearGradient>
        <LinearGradient id="pc-tile" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.07" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0.02" />
        </LinearGradient>
        <RadialGradient id="pc-floor" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#000000" stopOpacity="0.6" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      <G clipPath="url(#pc-clip)">
        <Rect width={W} height={H} fill="url(#pc-bg)" />
        {/* mown pitch stripes */}
        {Array.from({ length: 10 }, (_, index) => (
          <Rect key={index} x="0" y={index * 60} width={W} height="30" fill="#ffffff" opacity="0.018" />
        ))}
        <Polygon points="20,0 60,0 200,330 -120,330" fill="url(#pc-beam)" />
        <Polygon points="300,0 340,0 480,330 160,330" fill="url(#pc-beam)" />
        <Rect width={W} height={H} fill="url(#pc-glow)" />
        {/* centre-circle watermark */}
        <Circle cx="180" cy="170" r="118" fill="none" stroke={lime} strokeOpacity="0.08" strokeWidth="1.5" />
        <Line x1="0" y1="170" x2={W} y2="170" stroke={lime} strokeOpacity="0.06" strokeWidth="1.5" />
        {/* ghost number */}
        <SvgText
          x="180"
          y="262"
          textAnchor="middle"
          fontSize="250"
          fontWeight="800"
          fontFamily="BarlowCondensed_800ExtraBold"
          fill="none"
          stroke={lime}
          strokeOpacity="0.16"
          strokeWidth="1.5"
        >
          {String(number)}
        </SvgText>

        {/* header */}
        <SvgImage href={require('@/assets/images/one-more-logo.png')} x="22" y="22" width="40" height="40" />
        <SvgText x="72" y="39" fill={lime} fontSize="11" fontWeight="700" letterSpacing="2.4" fontFamily="Barlow_600SemiBold">
          {copy.profileCardTag}
        </SvgText>
        <SvgText x="72" y="56" fill={sage} fontSize="11" fontWeight="600" letterSpacing="1" fontFamily="Barlow_600SemiBold">
          ONE MORE · NICOSIA
        </SvgText>
        <G>
          <Rect x="270" y="22" width="68" height="40" rx="12" fill={lime} />
          <SvgText x="304" y="49" textAnchor="middle" fill={ink} fontSize="22" fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
            {shortPositions[position]}
          </SvgText>
        </G>

        {/* jersey */}
        <Rect x="110" y="236" width="140" height="18" fill="url(#pc-floor)" />
        <G transform="translate(95 76) scale(0.85)">
          <Path d={jerseyPath} fill={lime} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
          <Path d="M100 24 L154 66 L154 176 C154 181 150 184 146 184 L100 184 Z" fill={ink} opacity="0.08" />
          <Path d="M70 14 C82 32 118 32 130 14 L123 11 C113 24 87 24 77 11 Z" fill={ink} />
          <Polygon points="6,70 34,86 38,79 10,63" fill={ink} />
          <Polygon points="194,70 166,86 162,79 190,63" fill={ink} />
          <Path d="M46 172 L154 172" stroke={ink} strokeWidth="2.5" opacity="0.5" />
          {surname ? (
            <SvgText x="100" y="70" textAnchor="middle" fill={ink} fontSize="16" fontWeight="600" letterSpacing="3" fontFamily="Barlow_600SemiBold">
              {surname}
            </SvgText>
          ) : null}
          <SvgText x="100" y="150" textAnchor="middle" fill={ink} fontSize={number > 9 ? 70 : 82} fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
            {String(number)}
          </SvgText>
        </G>

        {/* name */}
        <SvgText x="180" y={300} textAnchor="middle" fill={paper} fontSize={nameSize} fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
          {shownName.toUpperCase()}
        </SvgText>
        <SvgText x="180" y="326" textAnchor="middle" fill={sage} fontSize="14" fontWeight="500" fontFamily="Barlow_500Medium">
          {truncate([positionLabel, location].filter(Boolean).join(' · '), 44)}
        </SvgText>
        <Rect x="150" y="340" width="60" height="3" rx="1.5" fill={lime} />

        {/* stat tiles */}
        {tiles.map((x) => (
          <Rect key={x} x={x} y={tileY} width={tileW} height={tileH} rx="16" fill="url(#pc-tile)" stroke={line} strokeWidth="1.5" />
        ))}
        {/* foot */}
        <G transform={`translate(${tiles[0] + 38} ${tileY + 12})`}>
          <FootMark foot={strongFoot} />
        </G>
        <TileLabel x={tiles[0] + tileW / 2} y={tileY + 54} label={copy.profileCardFoot} />
        <TileValue x={tiles[0] + tileW / 2} y={tileY + 72} value={truncate(strongFootLabel, 13)} />
        {/* level */}
        <G transform={`translate(${tiles[1] + 37} ${tileY + 12})`}>
          {[0, 1, 2].map((index) => (
            <Rect
              key={index}
              x={index * 10}
              y={20 - index * 7}
              width="6"
              height={8 + index * 7}
              rx="2"
              fill={lime}
              opacity={index < bars ? 1 : 0.22}
            />
          ))}
        </G>
        <TileLabel x={tiles[1] + tileW / 2} y={tileY + 54} label={copy.profileCardLevel} />
        <TileValue x={tiles[1] + tileW / 2} y={tileY + 72} value={truncate(levelLabel, 13)} />
        {/* position mini pitch */}
        <G transform={`translate(${tiles[2] + 34} ${tileY + 8})`}>
          <Rect x="0" y="0" width="32" height="38" rx="4" fill="#27432f" stroke="#9cc4a6" strokeOpacity="0.6" strokeWidth="1" />
          <Line x1="0" y1="19" x2="32" y2="19" stroke="#9cc4a6" strokeOpacity="0.6" strokeWidth="1" />
          <Circle cx="16" cy="19" r="5" fill="none" stroke="#9cc4a6" strokeOpacity="0.6" strokeWidth="1" />
          <Rect x="9" y="0" width="14" height="6" fill="none" stroke="#9cc4a6" strokeOpacity="0.6" strokeWidth="1" />
          <Rect x="9" y="32" width="14" height="6" fill="none" stroke="#9cc4a6" strokeOpacity="0.6" strokeWidth="1" />
          <Circle cx={spot.x * 32} cy={spot.y * 38} r="5" fill={lime} stroke={ink} strokeWidth="1.5" />
        </G>
        <TileLabel x={tiles[2] + tileW / 2} y={tileY + 62} label={copy.profileCardPosition} />
        <TileValue x={tiles[2] + tileW / 2} y={tileY + 76} value={shortPositions[position]} small />

        {/* availability */}
        <SvgText x="24" y="482" fill={sage} fontSize="11" fontWeight="700" letterSpacing="1.6" fontFamily="Barlow_600SemiBold">
          {copy.profileCardAvailable}
        </SvgText>
        {anyDay ? null : (
          <SvgText x="336" y="482" textAnchor="end" fill={sage} fontSize="11" fontFamily="Barlow_500Medium">
            {copy.profileCardNoDays}
          </SvgText>
        )}
        {days.map((on, index) => {
          const cx = 24 + 16 + index * 46.6;
          return (
            <G key={index}>
              <Circle cx={cx} cy="510" r="16" fill={on ? lime : 'none'} stroke={on ? lime : line} strokeWidth="1.5" />
              <SvgText x={cx} y="515" textAnchor="middle" fill={on ? ink : sage} fontSize="13" fontWeight="700" fontFamily="Barlow_600SemiBold">
                {dayLetters[index] ?? ''}
              </SvgText>
            </G>
          );
        })}

        {/* formats */}
        <SvgText x="24" y="560" fill={sage} fontSize="11" fontWeight="700" letterSpacing="1.6" fontFamily="Barlow_600SemiBold">
          {copy.profileCardFormats}
        </SvgText>
        {[5, 7, 8, 11].map((size, index) => {
          const on = formats.includes(size);
          const x = 24 + index * 80;
          return (
            <G key={size}>
              <Rect x={x} y="570" width="72" height="28" rx="14" fill={on ? lime : 'none'} stroke={on ? lime : line} strokeWidth="1.5" />
              <SvgText x={x + 36} y="589" textAnchor="middle" fill={on ? ink : sage} fontSize="13" fontWeight="700" fontFamily="Barlow_600SemiBold">
                {`${size}v${size}`}
              </SvgText>
            </G>
          );
        })}
        <Rect x="0" y="612" width={W} height="28" fill={lime} />
        <SvgText x="180" y="631" textAnchor="middle" fill={ink} fontSize="11" fontWeight="700" letterSpacing="2.4" fontFamily="Barlow_600SemiBold">
          {copy.profileCardBrandLine}
        </SvgText>
      </G>
      <Rect x="1.5" y="1.5" width={W - 3} height={H - 3} rx="29" fill="none" stroke="url(#pc-edge)" strokeWidth="3" />
    </>
  );
}

function TileLabel({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <SvgText x={x} y={y} textAnchor="middle" fill={sage} fontSize="9.5" fontWeight="700" letterSpacing="1.4" fontFamily="Barlow_600SemiBold">
      {label}
    </SvgText>
  );
}

function TileValue({ x, y, value, small = false }: { x: number; y: number; value: string; small?: boolean }) {
  return (
    <SvgText x={x} y={y} textAnchor="middle" fill={paper} fontSize={small ? 13 : 14} fontWeight="700" fontFamily="Barlow_600SemiBold">
      {value}
    </SvgText>
  );
}

const footD =
  'M9.5 22c-2.6 0-3.7-2.4-3.4-5.3.3-2.9 1.3-4.9 1.3-7.7C7.4 6.7 8.7 5.2 10.7 5.2s3.3 1.5 3.1 4.2c-.2 2.8-1.4 4.3-1.4 7.2 0 2.9-.9 5.4-2.9 5.4z';

function FootShape({ fill }: { fill: string }) {
  return (
    <>
      <Path d={footD} fill={fill} />
      <Circle cx="9.2" cy="2.9" r="1.3" fill={fill} />
      <Circle cx="12" cy="2.6" r="1.1" fill={fill} />
      <Circle cx="14.3" cy="3.4" r="1" fill={fill} />
    </>
  );
}

function FootMark({ foot }: { foot: StrongFoot }) {
  const dim = '#cfff4a';
  if (foot === 'both') {
    return (
      <G transform="translate(-2 0) scale(1.2)">
        <G transform="translate(17 1) scale(-0.85 0.85)">
          <FootShape fill={dim} />
        </G>
        <G transform="translate(12 1) scale(0.85)">
          <FootShape fill={dim} />
        </G>
      </G>
    );
  }
  return (
    <G transform={foot === 'left' ? 'translate(28.8 0) scale(-1.2 1.2)' : 'scale(1.2)'}>
      <FootShape fill={dim} />
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
