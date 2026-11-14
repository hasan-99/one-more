import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, Image as SvgImage, Line, Rect, Text as SvgText } from 'react-native-svg';

import { useToast } from '@/components/toast/ToastProvider';
import type { TranslationKey } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

type Copy = { [Key in TranslationKey]: string };

type PlayerCardShareModalProps = {
  visible: boolean;
  onClose: () => void;
  name: string;
  location: string;
  number: number;
  position: string;
  strongFoot: string;
  level: string;
  formats: string[];
  availability: string[];
  copy: Copy;
};

export function PlayerCardShareModal({
  visible,
  onClose,
  name,
  location,
  number,
  position,
  strongFoot,
  level,
  formats,
  availability,
  copy,
}: PlayerCardShareModalProps) {
  const { locale, colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const cardRef = useRef<Svg>(null);
  const [busyAction, setBusyAction] = useState<'share' | 'save' | null>(null);

  const exportCard = () =>
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

  const cardName = name.trim() || (locale === 'en' ? 'ONE MORE Player' : 'Παίκτης ONE MORE');
  const shownName = cardName.length > 24 ? `${cardName.slice(0, 22)}…` : cardName;
  const formatSummary = formats.length > 2
    ? `${formats.slice(0, 2).join(', ')} +${formats.length - 2}`
    : formats.join(', ');
  const firstAvailability = availability[0] ?? '—';
  const secondAvailability = availability[1]
    ? `${availability[1]}${availability.length > 2 ? ` +${availability.length - 2}` : ''}`
    : '';

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={[styles.modalRoot, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 18) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.profileCardClose} onPress={onClose} style={[styles.closeButton, { top: Math.max(insets.top, 12), borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.closeGlyph, { color: colors.textPrimary }]}>×</Text>
        </Pressable>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text accessibilityRole="header" style={[styles.heading, { color: colors.textPrimary }]}>{copy.profileShareCardTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{copy.profileShareCardSubtitle}</Text>
          <View style={styles.cardFrame}>
            <Svg
              ref={cardRef}
              width="100%"
              height="100%"
              viewBox="0 0 360 500"
              preserveAspectRatio="xMidYMid meet"
              accessibilityRole="image"
              accessibilityLabel={`${copy.profileShareCardTitle}: ${cardName}`}
            >
              <Defs>
                <ClipPath id="player-card-clip"><Rect x="0" y="0" width="360" height="500" rx="30" /></ClipPath>
              </Defs>
              <Rect x="0" y="0" width="360" height="500" rx="30" fill="#cfff4a" />
              <Rect x="0" y="0" width="360" height="500" rx="30" fill="#f5ffd4" opacity=".18" />
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <Line key={index} x1={-75 + index * 82} y1="500" x2={175 + index * 82} y2="0" stroke="#fff" strokeWidth="19" opacity=".13" clipPath="url(#player-card-clip)" />
              ))}
              <SvgImage href={require('@/assets/images/one-more-logo.png')} x="286" y="22" width="50" height="50" />
              <SvgText x="24" y="66" fill="#08100b" fontFamily="BarlowCondensed_700Bold" fontSize="47" fontWeight="800">{number}</SvgText>
              <SvgText x="27" y="92" fill="#132118" fontFamily="BarlowCondensed_700Bold" fontSize="17" fontWeight="800" letterSpacing="1">{shortPosition(position)}</SvgText>
              <Circle cx="180" cy="192" r="66" stroke="#203d2b" strokeWidth="2" fill="none" opacity=".22" />
              <Circle cx="180" cy="192" r="7" fill="#203d2b" opacity=".32" />
              <Line x1="24" y1="192" x2="336" y2="192" stroke="#203d2b" strokeWidth="2" opacity=".16" />
              <Line x1="180" y1="122" x2="180" y2="260" stroke="#203d2b" strokeWidth="2" opacity=".16" />
              <SvgText x="24" y="286" fill="#08100b" fontFamily="BarlowCondensed_700Bold" fontSize={shownName.length > 17 ? 29 : 35} fontWeight="800">{shownName}</SvgText>
              <SvgText x="25" y="311" fill="#253a2c" fontSize="16" fontWeight="600">{truncate(location, 40)}</SvgText>
              <Line x1="24" y1="330" x2="336" y2="330" stroke="#203d2b" strokeWidth="1.5" opacity=".35" />
              <SvgText x="25" y="356" fill="#253a2c" fontSize="12" fontWeight="700" letterSpacing="1.1">{copy.profileCardFoot}</SvgText>
              <SvgText x="25" y="380" fill="#08100b" fontSize="17" fontWeight="800">{strongFoot}</SvgText>
              <SvgText x="190" y="356" fill="#253a2c" fontSize="12" fontWeight="700" letterSpacing="1.1">{copy.profileCardLevel}</SvgText>
              <SvgText x="190" y="380" fill="#08100b" fontSize="17" fontWeight="800">{truncate(level, 16)}</SvgText>
              <SvgText x="25" y="410" fill="#253a2c" fontSize="12" fontWeight="700" letterSpacing="1.1">{copy.profileCardFormats}</SvgText>
              <SvgText x="25" y="434" fill="#08100b" fontSize="14" fontWeight="800">{truncate(formatSummary, 20)}</SvgText>
              <SvgText x="190" y="410" fill="#253a2c" fontSize="12" fontWeight="700" letterSpacing="1.1">{copy.profileCardAvailability}</SvgText>
              <SvgText x="190" y="429" fill="#08100b" fontSize="12" fontWeight="800">{truncate(firstAvailability, 20)}</SvgText>
              {secondAvailability ? <SvgText x="190" y="446" fill="#08100b" fontSize="12" fontWeight="800">{truncate(secondAvailability, 20)}</SvgText> : null}
              <Line x1="24" y1="462" x2="336" y2="462" stroke="#203d2b" strokeWidth="1.5" opacity=".28" />
              <SvgText x="25" y="486" fill="#203d2b" fontSize="13" fontWeight="800" letterSpacing="1.5">{copy.profileCardBrandLine}</SvgText>
            </Svg>
          </View>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => void handleAction('share')} disabled={busyAction !== null} style={[styles.actionButton, styles.primaryAction, { backgroundColor: colors.primaryButton }]}>
              {busyAction === 'share' ? <ActivityIndicator color={colors.primaryButtonText} /> : <Text style={[styles.actionGlyph, { color: colors.primaryButtonText }]}>↥</Text>}
              <Text style={[styles.primaryText, { color: colors.primaryButtonText }]}>{copy.profileCardShare}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => void handleAction('save')} disabled={busyAction !== null} style={[styles.actionButton, styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {busyAction === 'save' ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={[styles.secondaryGlyph, { color: colors.textPrimary }]}>↓</Text>}
              <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>{busyAction === 'save' ? copy.profileCardSaving : copy.profileCardSaveImage}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function shortPosition(value: string) {
  switch (value) {
    case 'Goalkeeper': case 'Τερματοφύλακας': return 'GK';
    case 'Defender': case 'Αμυντικός': return 'DF';
    case 'Midfielder': case 'Μέσος': return 'MF';
    case 'Forward': case 'Επιθετικός': return 'FW';
    default: return 'ALL';
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, paddingHorizontal: 18 },
  closeButton: { position: 'absolute', right: 18, zIndex: 4, width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  closeGlyph: { fontSize: 30, lineHeight: 34 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 42, paddingBottom: 12, gap: 7 },
  heading: { fontFamily: 'Inter_600SemiBold', fontSize: 25, lineHeight: 32, width: '100%', maxWidth: 420 },
  subtitle: { fontSize: 14, width: '100%', maxWidth: 420, marginBottom: 12 },
  cardFrame: { width: '100%', maxWidth: 420, aspectRatio: 0.72, overflow: 'hidden', borderRadius: 30 },
  actions: { width: '100%', maxWidth: 420, flexDirection: 'row', gap: 10, marginTop: 14 },
  actionButton: { flex: 1, minHeight: 52, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 8 },
  primaryAction: {},
  secondaryAction: { borderWidth: 1 },
  actionGlyph: { fontSize: 25, fontWeight: '800' },
  primaryText: { fontSize: 15, fontWeight: '800' },
  secondaryGlyph: { fontSize: 24, fontWeight: '700' },
  secondaryText: { fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
});
