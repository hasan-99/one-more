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
  Ellipse,
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
const jerseyPath =
  'M70 14 C82 26 118 26 130 14 L170 30 L194 70 L166 86 L154 66 L154 176 C154 181 150 184 146 184 L54 184 C50 184 46 181 46 176 L46 66 L34 86 L6 70 L30 30 Z';
const shortPositions: Record<Position, string> = {
  forward: 'ST',
  midfielder: 'MF',
  defender: 'DF',
  goalkeeper: 'GK',
  any: 'ANY',
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

type Palette = { accent: string; deep: string };
/** Accent follows the player's level so cards feel collectible. */
const palettes: Record<SkillLevel | 'none', Palette> = {
  beginner: { accent: '#7ef0c8', deep: '#0c2a22' },
  intermediate: { accent: lime, deep: '#1c3a12' },
  advanced: { accent: '#ffd34d', deep: '#3a2c08' },
  none: { accent: lime, deep: '#1c3a12' },
};

/** Stable short ID derived from the player's name and number. */
function playerCode(text: string) {
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
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
  const { accent, deep } = palettes[skillLevel ?? 'none'];
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const surname = (words[words.length - 1] ?? '').toUpperCase().slice(0, 10);
  const shownName = truncate(name.toUpperCase(), 20);
  const nameSize = Math.min(48, Math.floor(560 / Math.max(shownName.length, 8)));
  const bars = skillLevel === 'advanced' ? 3 : skillLevel === 'intermediate' ? 2 : skillLevel === 'beginner' ? 1 : 0;
  const shortPos = shortPositions[position];
  const pillWidth = 64 + positionLabel.length * 8.2;
  const pillX = 180 - (56 + pillWidth) / 2;
  const chosenFormats = [5, 7, 8, 11].filter((size) => formats.includes(size));
  const code = `${playerCode(`${name}|${number}`)}-${String(number).padStart(2, '0')}`;
  const crowd = Array.from({ length: 90 }, (_, index) => ({
    x: (index * 37.3) % 360,
    y: 168 + ((index * 13.7) % 70),
    r: 0.8 + ((index * 7) % 5) * 0.25,
    o: 0.08 + ((index * 11) % 7) * 0.03,
  }));

  return (
    <>
      <Defs>
        <ClipPath id="pc-clip">
          <Rect width={W} height={H} rx="30" />
        </ClipPath>
        <LinearGradient id="pc-bg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#0d1813" />
          <Stop offset="0.45" stopColor="#0a120e" />
          <Stop offset="1" stopColor="#050806" />
        </LinearGradient>
        <RadialGradient id="pc-flood" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <Stop offset="0.25" stopColor="#e9fbd0" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#e9fbd0" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="pc-cone" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#f4ffe0" stopOpacity="0.22" />
          <Stop offset="1" stopColor="#f4ffe0" stopOpacity="0" />
        </LinearGradient>
        <RadialGradient id="pc-grass" cx="50%" cy="0%" r="70%">
          <Stop offset="0" stopColor={accent} stopOpacity="0.45" />
          <Stop offset="0.5" stopColor={deep} stopOpacity="0.6" />
          <Stop offset="1" stopColor="#050806" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="pc-halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={accent} stopOpacity="0.35" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="pc-shirt" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <Stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="1" stopColor="#000000" stopOpacity="0.22" />
        </LinearGradient>
        <LinearGradient id="pc-panel" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.06" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0.015" />
        </LinearGradient>
        <LinearGradient id="pc-cta" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <Stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="pc-fade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#060a08" stopOpacity="0" />
          <Stop offset="1" stopColor="#060a08" stopOpacity="1" />
        </LinearGradient>
      </Defs>

      <G clipPath="url(#pc-clip)">
        <Rect width={W} height={H} fill="url(#pc-bg)" />
        {/* stadium: light cones, stands with crowd, floodlights */}
        <Polygon points="40,96 70,96 230,300 -60,300" fill="url(#pc-cone)" />
        <Polygon points="290,96 320,96 420,300 130,300" fill="url(#pc-cone)" />
        <Path d="M0 150 Q180 120 360 150 L360 250 L0 250 Z" fill="#0f1c16" />
        <Path d="M0 190 Q180 168 360 190 L360 250 L0 250 Z" fill="#132219" />
        {crowd.map((dot, index) => (
          <Circle key={index} cx={dot.x} cy={dot.y} r={dot.r} fill={index % 9 === 0 ? accent : '#dfe8da'} opacity={dot.o} />
        ))}
        {[54, 306].map((cx) => (
          <G key={cx}>
            <Circle cx={cx} cy="96" r="46" fill="url(#pc-flood)" />
            {[0, 1, 2, 3].map((column) =>
              [0, 1].map((row) => (
                <Circle key={`${column}-${row}`} cx={cx - 15 + column * 10} cy={90 + row * 10} r="3.2" fill="#ffffff" />
              )),
            )}
          </G>
        ))}
        <Rect x="0" y="232" width={W} height="60" fill="url(#pc-grass)" />
        <Rect x="0" y="250" width={W} height="120" fill="url(#pc-fade)" />

        {/* header */}
        <SvgImage href={require('@/assets/images/one-more-logo.png')} x="163" y="14" width="34" height="34" />
        <Line x1="64" y1="66" x2="104" y2="66" stroke={accent} strokeWidth="1.2" />
        <Line x1="256" y1="66" x2="296" y2="66" stroke={accent} strokeWidth="1.2" />
        <SvgText x="180" y="70" textAnchor="middle" fill="#d8ddd4" fontSize="11" fontWeight="700" letterSpacing="4.5" fontFamily="Barlow_600SemiBold">
          {copy.profileCardTag}
        </SvgText>

        {/* jersey hero */}
        <Ellipse cx="180" cy="170" rx="120" ry="100" fill="url(#pc-halo)" />
        <Ellipse cx="180" cy="266" rx="86" ry="9" fill="#000000" opacity="0.55" />
        <G transform="translate(80 80) scale(1)">
          <Path d={jerseyPath} fill={accent} />
          <Path d="M30 30 L70 14 C74 18 79 21 84 23 L44 44 Z" fill={ink} opacity="0.6" />
          <Polygon points="6,70 34,86 38,79 10,63" fill={ink} opacity="0.75" />
          <Path d="M170 30 L130 14 C126 18 121 21 116 23 L156 44 Z" fill={ink} opacity="0.6" />
          <Polygon points="194,70 166,86 162,79 190,63" fill={ink} opacity="0.75" />
          <Path d={jerseyPath} fill="url(#pc-shirt)" />
          <Path d="M70 14 C82 32 118 32 130 14 L123 11 C113 24 87 24 77 11 Z" fill={ink} />
          <Path d={jerseyPath} fill="none" stroke={ink} strokeOpacity="0.5" strokeWidth="2" strokeLinejoin="round" />
          {surname ? (
            <SvgText x="100" y="70" textAnchor="middle" fill={ink} fontSize="22" fontWeight="800" letterSpacing="1" fontFamily="BarlowCondensed_800ExtraBold">
              {surname}
            </SvgText>
          ) : null}
          <SvgText x="100" y="160" textAnchor="middle" fill={ink} fontSize={number > 9 ? 78 : 92} fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
            {String(number)}
          </SvgText>
        </G>

        {/* name, position pill, location */}
        <G transform="translate(180 316) skewX(-9)">
          <SvgText x="2" y="2" textAnchor="middle" fill="#000000" opacity="0.6" fontSize={nameSize} fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
            {shownName}
          </SvgText>
          <SvgText x="0" y="0" textAnchor="middle" fill="#ffffff" fontSize={nameSize} fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
            {shownName}
          </SvgText>
        </G>
        <G transform={`translate(${pillX} 330)`}>
          <Rect x="0" y="0" width={56 + pillWidth} height="28" rx="14" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1.2" />
          <Path d="M14 0 H62 L54 28 H14 A14 14 0 0 1 14 0 Z" fill={accent} />
          <SvgText x="34" y="20" textAnchor="middle" fill={ink} fontSize="17" fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
            {shortPos}
          </SvgText>
          <SvgText x={66 + pillWidth / 2 - 6} y="19" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="600" fontFamily="Barlow_600SemiBold">
            {positionLabel}
          </SvgText>
        </G>
        {location ? (
          <G>
            <Path
              d="M0 -7 C-4.4 -7 -7 -3.8 -7 -0.6 C-7 4 0 10 0 10 C0 10 7 4 7 -0.6 C7 -3.8 4.4 -7 0 -7 Z"
              transform={`translate(${180 - truncate(location, 34).length * 3.4 - 12} 375)`}
              fill={accent}
            />
            <SvgText x={180 + 6} y="380" textAnchor="middle" fill="#d8ddd4" fontSize="14" fontWeight="500" fontFamily="Barlow_500Medium">
              {truncate(location, 34)}
            </SvgText>
          </G>
        ) : null}

        {/* stats panel */}
        <Rect x="22" y="398" width="316" height="72" rx="16" fill="url(#pc-panel)" stroke="#ffffff" strokeOpacity="0.1" />
        <Line x1="127" y1="410" x2="127" y2="458" stroke="#ffffff" strokeOpacity="0.12" />
        <Line x1="233" y1="410" x2="233" y2="458" stroke="#ffffff" strokeOpacity="0.12" />
        <G transform="translate(62 410)">
          <FootMark foot={strongFoot} color={accent} />
        </G>
        <G transform="translate(167 410)">
          {[0, 1, 2].map((index) => (
            <Rect key={index} x={index * 9} y={18 - index * 7} width="6" height={9 + index * 7} rx="2" fill={accent} opacity={index < bars ? 1 : 0.25} />
          ))}
        </G>
        <G transform="translate(268 411)">
          <Rect x="0" y="0" width="30" height="22" rx="3" fill="none" stroke={accent} strokeWidth="1.6" />
          <Line x1="15" y1="0" x2="15" y2="22" stroke={accent} strokeWidth="1.4" />
          <Circle cx="15" cy="11" r="4" fill="none" stroke={accent} strokeWidth="1.4" />
          <Rect x="0" y="6" width="5" height="10" fill="none" stroke={accent} strokeWidth="1.2" />
          <Rect x="25" y="6" width="5" height="10" fill="none" stroke={accent} strokeWidth="1.2" />
        </G>
        {[
          { x: 74.5, value: strongFootLabel },
          { x: 180, value: levelLabel },
          { x: 285.5, value: shortPos },
        ].map((stat) => (
          <SvgText key={stat.x} x={stat.x} y="456" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600" fontFamily="Barlow_600SemiBold">
            {truncate(stat.value, 14)}
          </SvgText>
        ))}

        {/* availability + formats */}
        <SvgText x="26" y="498" fill="#ffffff" fontSize="13" fontWeight="600" fontFamily="Barlow_600SemiBold">
          {copy.profileCardAvailableTitle}
        </SvgText>
        {days.map((on, index) => {
          const cx = 36 + index * 25;
          return (
            <G key={index}>
              <Circle cx={cx} cy="520" r="10.5" fill={on ? accent : 'none'} stroke={on ? accent : '#ffffff'} strokeOpacity={on ? 1 : 0.22} strokeWidth="1.2" />
              <SvgText x={cx} y="524" textAnchor="middle" fill={on ? ink : '#c9d0c5'} fontSize="10" fontWeight="700" fontFamily="Barlow_600SemiBold">
                {dayLetters[index] ?? ''}
              </SvgText>
            </G>
          );
        })}
        <Line x1="214" y1="486" x2="214" y2="532" stroke="#ffffff" strokeOpacity="0.15" />
        <SvgText x="226" y="498" fill="#ffffff" fontSize="13" fontWeight="600" fontFamily="Barlow_600SemiBold">
          {copy.profileCardFormatsTitle}
        </SvgText>
        {chosenFormats.slice(0, 2).map((size, index) => (
          <G key={size}>
            <Rect x={226 + index * 56} y="509" width="50" height="22" rx="11" fill={accent} />
            <SvgText x={251 + index * 56} y="524" textAnchor="middle" fill={ink} fontSize="12" fontWeight="700" fontFamily="Barlow_600SemiBold">
              {`${size}v${size}`}
            </SvgText>
          </G>
        ))}
        {chosenFormats.length > 2 ? (
          <SvgText x="338" y="498" textAnchor="end" fill={accent} fontSize="11" fontWeight="700" fontFamily="Barlow_600SemiBold">
            {`+${chosenFormats.length - 2}`}
          </SvgText>
        ) : null}

        {/* call to action */}
        <Rect x="40" y="552" width="280" height="42" rx="21" fill={accent} opacity="0.25" />
        <Rect x="44" y="555" width="272" height="36" rx="18" fill={accent} />
        <Rect x="44" y="555" width="272" height="36" rx="18" fill="url(#pc-cta)" />
        <G transform="translate(172 580) skewX(-9)">
          <SvgText x="0" y="0" textAnchor="middle" fill={ink} fontSize="17" fontWeight="800" letterSpacing="0.5" fontFamily="BarlowCondensed_800ExtraBold">
            {copy.profileCardBrandLine}
          </SvgText>
        </G>
        <Path d="M282 573 h14 M290 567 l6 6 -6 6" stroke={ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <SvgText x="180" y="620" textAnchor="middle" fill="#ffffff" opacity="0.35" fontSize="9" fontWeight="700" letterSpacing="2.4" fontFamily="Barlow_600SemiBold">
          {`${copy.profileCardPlayerId} ${code}`}
        </SvgText>
      </G>
      {/* glowing frame */}
      <Rect x="3" y="3" width={W - 6} height={H - 6} rx="28" fill="none" stroke={accent} strokeOpacity="0.25" strokeWidth="6" />
      <Rect x="3" y="3" width={W - 6} height={H - 6} rx="28" fill="none" stroke={accent} strokeWidth="2" />
    </>
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

function FootMark({ foot, color }: { foot: StrongFoot; color: string }) {
  if (foot === 'both') {
    return (
      <G transform="translate(-4 0) scale(1.1)">
        <G transform="translate(17 1) scale(-0.85 0.85)">
          <FootShape fill={color} />
        </G>
        <G transform="translate(12 1) scale(0.85)">
          <FootShape fill={color} />
        </G>
      </G>
    );
  }
  return (
    <G transform={foot === 'left' ? 'translate(26.4 0) scale(-1.1 1.1)' : 'scale(1.1)'}>
      <FootShape fill={color} />
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
