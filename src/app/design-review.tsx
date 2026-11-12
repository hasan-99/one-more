import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { ResponsiveNav } from '@/components/layout/ResponsiveNav';
import { PreferenceSwitchers } from '@/components/preferences-switchers';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export default function DesignReviewScreen() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DesignReviewGallery />;
}

function DesignReviewGallery() {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const { width } = useWindowDimensions();
  const compact = Platform.OS !== 'web' && width < 600;
  const [dialogVisible, setDialogVisible] = useState(false);
  const styles = createStyles(colors);

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View nativeID="design-review-shell" style={[styles.shell, compact && styles.shellCompact]}>
        <View style={styles.header}>
          <BrandMark />
          <PreferenceSwitchers />
        </View>
        <ResponsiveNav active="review" />
        <Text accessibilityRole="header" style={styles.title}>
          {copy.designReviewTitle}
        </Text>
        <Text style={styles.intro}>{copy.designReviewIntro}</Text>

        <View nativeID="design-review-grid" style={styles.grid}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{copy.galleryButtons}</Text>
            <View style={styles.buttonRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDialogVisible(true)}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{copy.galleryPrimary}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDialogVisible(true)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>{copy.gallerySecondary}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                disabled
                style={styles.disabledButton}
              >
                <Text style={styles.disabledButtonText}>{copy.galleryDisabled}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{copy.galleryFields}</Text>
            <Text style={styles.fieldLabel}>{copy.galleryName}</Text>
            <TextInput
              accessibilityLabel={copy.galleryName}
              placeholder={copy.galleryName}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <Text style={[styles.fieldLabel, styles.secondField]}>{copy.galleryEmail}</Text>
            <TextInput
              accessibilityLabel={copy.galleryEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="name@example.com"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{copy.galleryBadges}</Text>
            <View style={styles.badgeRow}>
              <StatusBadge
                label={copy.galleryOpen}
                background={colors.info}
                foreground={colors.infoText}
              />
              <StatusBadge
                label={copy.galleryPending}
                background={colors.warning}
                foreground={colors.warningText}
              />
              <StatusBadge
                label={copy.galleryConfirmed}
                background={colors.success}
                foreground={colors.successText}
              />
              <StatusBadge
                label={copy.demoLabel}
                background={colors.surfaceRaised}
                foreground={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{copy.galleryCards}</Text>
            <View style={styles.gameCard}>
              <View style={styles.cardTopline}>
                <Text style={styles.cardEyebrow}>{copy.galleryAccent}</Text>
                <StatusBadge
                  label={copy.galleryOpen}
                  background={colors.info}
                  foreground={colors.infoText}
                />
              </View>
              <Text style={styles.cardTitle}>{copy.galleryGameTitle}</Text>
              <Text style={styles.cardMeta}>{copy.galleryGameMeta}</Text>
              <View style={styles.divider} />
              <Text style={styles.cardSpots}>{copy.galleryGameSpots}</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{copy.galleryTypography}</Text>
            <Text style={styles.displayText}>ONE MORE.</Text>
            <Text style={styles.headingText}>
              {copy.heroLineOne} {copy.heroLineTwo}
            </Text>
            <Text style={styles.bodyText}>{copy.intro}</Text>
            <Text style={styles.greekSample}>Ελληνικά · Λευκωσία · αγώνας</Text>
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{copy.galleryModal}</Text>
            <Text style={styles.bodyText}>{copy.galleryDialogCopy}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDialogVisible(true)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>{copy.galleryDialogTitle}</Text>
            </Pressable>
          </View>
        </View>
        <Text style={styles.footer}>
          {copy.demoLabel} · {Platform.OS === 'web' ? 'Web' : 'Native'}
        </Text>
      </View>

      <Modal
        visible={dialogVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDialogVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.dialog}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {copy.galleryDialogTitle}
            </Text>
            <Text style={styles.bodyText}>{copy.galleryDialogCopy}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setDialogVisible(false)}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>{copy.galleryDialogAction}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatusBadge({
  label,
  background,
  foreground,
}: {
  label: string;
  background: string;
  foreground: string;
}) {
  return (
    <View
      style={{
        backgroundColor: background,
        borderRadius: 999,
        paddingHorizontal: 10,
        minHeight: 28,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: foreground, fontSize: 11, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.background },
    content: { alignItems: 'center', paddingBottom: 48 },
    shell: { width: '100%', maxWidth: 1200, paddingHorizontal: 32 },
    shellCompact: { paddingHorizontal: 16 },
    header: {
      minHeight: 84,
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { color: colors.textPrimary, fontSize: 38, fontWeight: '700', marginTop: 32 },
    intro: {
      color: colors.textSecondary,
      fontSize: 15,
      lineHeight: 23,
      marginTop: 8,
      marginBottom: 24,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    panel: {
      flexGrow: 1,
      flexBasis: 340,
      minWidth: 0,
      padding: 20,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
    buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    primaryButton: {
      minHeight: 48,
      borderRadius: 12,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primaryButton,
    },
    primaryButtonText: { color: colors.primaryButtonText, fontWeight: '700', fontSize: 13 },
    secondaryButton: {
      minHeight: 48,
      borderRadius: 12,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryButtonText: { color: colors.textPrimary, fontWeight: '600', fontSize: 13 },
    disabledButton: {
      minHeight: 48,
      borderRadius: 12,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surfaceRaised,
      opacity: 0.65,
    },
    disabledButtonText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
    fieldLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    secondField: { marginTop: 4 },
    input: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.textPrimary,
      paddingHorizontal: 13,
      fontSize: 14,
    },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    gameCard: {
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTopline: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    cardEyebrow: {
      color: colors.accentText,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    cardTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: 12 },
    cardMeta: { color: colors.textSecondary, fontSize: 13, marginTop: 5 },
    divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
    cardSpots: { color: colors.textPrimary, fontSize: 12, fontWeight: '600' },
    displayText: { color: colors.textPrimary, fontSize: 40, fontWeight: '800', letterSpacing: -1 },
    headingText: { color: colors.accentText, fontSize: 24, fontWeight: '700' },
    bodyText: { color: colors.textSecondary, fontSize: 14, lineHeight: 21 },
    greekSample: { color: colors.textPrimary, fontSize: 16 },
    footer: { color: colors.textMuted, fontSize: 11, marginTop: 20, alignSelf: 'flex-start' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.68)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    dialog: {
      width: '100%',
      maxWidth: 440,
      borderRadius: 22,
      padding: 24,
      gap: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
  });
}
