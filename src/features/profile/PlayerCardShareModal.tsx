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
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
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

/** Card artwork size: the template image's own pixel size. */
const W = 1024;
const H = 1536;
const ink = '#0c1210';
const lime = '#cfff4a';
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

/** Stable short ID derived from the player's name and number. */
function playerCode(text: string) {
  let hash = 2166136261;
  for (const character of text) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 6);
}

/** Rough width of a string in em for sizing text to fit a box. */
function fitSize(text: string, maxWidth: number, maxSize: number, emPerChar: number) {
  return Math.min(maxSize, Math.floor(maxWidth / (Math.max(text.length, 1) * emPerChar)));
}

/**
 * The exported artwork: the supplied card design as a background template
 * (stadium, jersey, frame and glow) with the player's own details drawn on top
 * in the same places. Pure SVG so it renders to a PNG for sharing.
 */
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
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const surname = (words[words.length - 1] ?? '').toUpperCase().slice(0, 12);
  const fullName = truncate(name.toUpperCase(), 22);
  const nameSize = fitSize(fullName, 640, 104, 0.6);
  const surnameSize = fitSize(surname, 170, 60, 0.5);
  const numberText = String(number);
  const numberSize = numberText.length > 1 ? 200 : 236;
  const shortPos = shortPositions[position];
  const bars = skillLevel === 'advanced' ? 3 : skillLevel === 'intermediate' ? 2 : skillLevel === 'beginner' ? 1 : 0;
  const labelWidth = Math.max(130, positionLabel.length * 19);
  const pillWidth = 140 + labelWidth;
  const pillX = 512 - pillWidth / 2;
  const place = truncate(location, 30);
  const placeWidth = place.length * 15;
  const chosen = [5, 7, 8, 11].filter((size) => formats.includes(size));
  const formatWidth = chosen.length > 2 ? (305 - 10 * (chosen.length - 1)) / chosen.length : 142;
  const code = `${playerCode(`${name}|${number}`)}-${numberText.padStart(2, '0')}`;

  return (
    <>
      <Defs>
        <LinearGradient id="pc-pill" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#e6ff7a" />
          <Stop offset="1" stopColor="#b6f21f" />
        </LinearGradient>
        <LinearGradient id="pc-name" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="1" stopColor="#dfe4dc" />
        </LinearGradient>
      </Defs>
      <SvgImage href={require('@/assets/images/player-card-template.jpg')} x="0" y="0" width={W} height={H} />

      {/* jersey print */}
      {surname ? (
        <SvgText x="517" y="336" textAnchor="middle" fill="#121612" fontSize={surnameSize} fontWeight="800" letterSpacing="1" fontFamily="BarlowCondensed_800ExtraBold">
          {surname}
        </SvgText>
      ) : null}
      <SvgText x="517" y="532" textAnchor="middle" fill="#121612" fontSize={numberSize} fontWeight="800" fontFamily="BarlowCondensed_800ExtraBold">
        {numberText}
      </SvgText>

      {/* name */}
      <SvgText x="516" y="709" textAnchor="middle" fill="#000000" opacity="0.45" fontSize={nameSize} fontWeight="800" fontFamily="Barlow_800ExtraBoldItalic">
        {fullName}
      </SvgText>
      <SvgText x="512" y="704" textAnchor="middle" fill="url(#pc-name)" fontSize={nameSize} fontWeight="800" fontFamily="Barlow_800ExtraBoldItalic">
        {fullName}
      </SvgText>

      {/* position pill */}
      <G transform={`translate(${pillX} 736)`}>
        <Rect x="0" y="0" width={pillWidth} height="52" rx="26" fill="#0b1310" stroke={lime} strokeOpacity="0.45" strokeWidth="2" />
        <Path d="M26 0 H140 L126 52 H26 A26 26 0 0 1 26 0 Z" fill="url(#pc-pill)" />
        <SvgText x="74" y="38" textAnchor="middle" fill={ink} fontSize="38" fontWeight="800" fontFamily="Barlow_800ExtraBoldItalic">
          {shortPos}
        </SvgText>
        <SvgText x={140 + labelWidth / 2} y="37" textAnchor="middle" fill="#ffffff" fontSize="33" fontWeight="600" fontFamily="Barlow_600SemiBold">
          {positionLabel}
        </SvgText>
      </G>

      {/* location */}
      {place ? (
        <G>
          <Path
            d="M0 -15 C-9 -15 -15 -8 -15 -1 C-15 9 0 21 0 21 C0 21 15 9 15 -1 C15 -8 9 -15 0 -15 Z M0 -6 a5.5 5.5 0 1 0 0.01 0"
            transform={`translate(${512 - placeWidth / 2 - 24} 818)`}
            fill={lime}
            fillRule="evenodd"
          />
          <SvgText x={512 + 8} y="832" textAnchor="middle" fill="#e1e6dd" fontSize="30" fontWeight="500" fontFamily="Barlow_500Medium">
            {place}
          </SvgText>
        </G>
      ) : null}

      {/* stats */}
      <G transform="translate(230 884)">
        <FootMark foot={strongFoot} color={lime} scale={2.75} />
      </G>
      <G transform="translate(484 893)">
        {[0, 1, 2].map((index) => (
          <Rect key={index} x={index * 24} y={36 - index * 18} width="16" height={20 + index * 18} rx="4" fill={lime} opacity={index < bars ? 1 : 0.28} />
        ))}
      </G>
      {[
        { x: 262, value: strongFootLabel },
        { x: 520, value: levelLabel },
        { x: 780, value: shortPos },
      ].map((stat) => (
        <SvgText key={stat.x} x={stat.x} y="988" textAnchor="middle" fill="#ffffff" fontSize="31" fontWeight="600" fontFamily="Barlow_600SemiBold">
          {truncate(stat.value, 14)}
        </SvgText>
      ))}

      {/* availability */}
      {days.map((on, index) => {
        const cx = 137 + index * 62.7;
        return (
          <G key={index}>
            <Circle cx={cx} cy="1135" r="26" fill={on ? lime : '#0f1714'} stroke={on ? lime : '#3d4c42'} strokeWidth="2.5" />
            <SvgText x={cx} y="1145" textAnchor="middle" fill={on ? ink : '#c3cabf'} fontSize="27" fontWeight="600" fontFamily="Barlow_600SemiBold">
              {dayLetters[index] ?? ''}
            </SvgText>
          </G>
        );
      })}

      {/* formats */}
      {chosen.map((size, index) => {
        const x = 614 + index * (formatWidth + 10);
        return (
          <G key={size}>
            <Rect x={x} y="1106" width={formatWidth} height="58" rx="29" fill="url(#pc-pill)" />
            <SvgText x={x + formatWidth / 2} y="1146" textAnchor="middle" fill={ink} fontSize={chosen.length > 2 ? 26 : 32} fontWeight="700" fontFamily="Barlow_600SemiBold">
              {`${size}v${size}`}
            </SvgText>
          </G>
        );
      })}

      <SvgText x="512" y="1410" textAnchor="middle" fill="#ffffff" opacity="0.4" fontSize="22" fontWeight="600" letterSpacing="6" fontFamily="Barlow_600SemiBold">
        {`${copy.profileCardPlayerId} ${code}`}
      </SvgText>
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

function FootMark({ foot, color, scale }: { foot: StrongFoot; color: string; scale: number }) {
  if (foot === 'both') {
    return (
      <G transform={`translate(-6 0) scale(${scale})`}>
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
    <G transform={foot === 'left' ? `translate(${24 * scale} 0) scale(${-scale} ${scale})` : `scale(${scale})`}>
      <FootShape fill={color} />
    </G>
  );
}

const exportScale = 1;
const cardFonts = ['BarlowCondensed_800ExtraBold', 'Barlow_800ExtraBoldItalic', 'Barlow_600SemiBold', 'Barlow_500Medium'];

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
