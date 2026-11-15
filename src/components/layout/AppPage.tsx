import { Link, type Href } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { BackButton } from '@/components/layout/BackButton';
import type { TranslationKey } from '@/i18n';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export function AppPage({
  title,
  description,
  heading: customHeading,
  backHref,
  children,
}: PropsWithChildren<{
  title: string;
  description?: string;
  /** Replaces the standard title block (for pages with a compact header of their own). */
  heading?: ReactNode;
  /** Shows a back button above the heading; used when the page is opened from another page. */
  backHref?: Href;
}>) {
  const { colors, locale } = useAppPreferences();
  const styles = makeStyles(colors);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        {backHref ? <BackButton fallback={backHref} /> : null}
        {customHeading ?? (
          <View style={[styles.heading, !description && styles.headingCompact]}>
            <View style={[styles.headingRule, { backgroundColor: colors.primaryButton }]} />
            <View style={styles.headingCopy}>
              <Text
                accessibilityRole="header"
                style={[styles.title, locale === 'el' && styles.titleGreek]}
              >
                {title}
              </Text>
              {description ? <Text style={styles.description}>{description}</Text> : null}
            </View>
            <View pointerEvents="none" style={styles.pitchMark}>
              <View style={[styles.pitchHalfLine, { backgroundColor: colors.border }]} />
              <View style={[styles.pitchCenter, { borderColor: colors.border }]} />
              <View style={[styles.pitchSpot, { backgroundColor: colors.accentText }]} />
            </View>
          </View>
        )}
        {children}
      </View>
    </ScrollView>
  );
}

export function AppCard({ children }: PropsWithChildren) {
  const { colors, theme } = useAppPreferences();
  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: theme === 'light' ? '#243320' : 'transparent',
        },
      ]}
    >
      {children}
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  const { colors, locale } = useAppPreferences();
  return (
    <View
      style={[cardStyles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[cardStyles.emptyIcon, { backgroundColor: colors.surfaceRaised }]}>
        <Svg width={26} height={26} viewBox="0 0 32 32" fill="none" accessibilityLabel="">
          <Rect x="3.5" y="5.5" width="25" height="21" rx="3" stroke={colors.accentText} />
          <Path d="M16 6v20M4 16h24" stroke={colors.border} strokeLinecap="round" />
          <Circle cx="16" cy="16" r="4" stroke={colors.accentText} />
          <Circle cx="16" cy="16" r="1.2" fill={colors.accentText} />
        </Svg>
      </View>
      <Text
        style={[
          cardStyles.emptyTitle,
          locale === 'el' && cardStyles.emptyTitleGreek,
          { color: colors.textPrimary },
        ]}
      >
        {title}
      </Text>
      <Text style={[cardStyles.emptyCopy, { color: colors.textSecondary }]}>{description}</Text>
    </View>
  );
}

export function AppAction({
  labelKey,
  href,
  secondary = false,
}: {
  labelKey: TranslationKey;
  href: string;
  secondary?: boolean;
}) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  return (
    <Link href={href as Href} asChild>
      <Pressable
        accessibilityRole="link"
        style={StyleSheet.flatten([
          cardStyles.action,
          {
            backgroundColor: secondary ? colors.surfaceRaised : colors.primaryButton,
            borderColor: secondary ? colors.border : colors.primaryButton,
          },
        ])}
      >
        <Text
          style={[
            cardStyles.actionText,
            { color: secondary ? colors.textPrimary : colors.primaryButtonText },
          ]}
        >
          {copy[labelKey]}
        </Text>
        <Svg width={18} height={18} viewBox="0 0 20 20" fill="none" accessibilityLabel="">
          <Path
            d="M4 10h11m-4-4 4 4-4 4"
            stroke={secondary ? colors.textSecondary : colors.primaryButtonText}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Pressable>
    </Link>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 22,
    gap: 12,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  empty: { borderWidth: 1, borderRadius: 20, padding: 22, gap: 10 },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 22,
    lineHeight: 25,
    fontWeight: '700',
  },
  emptyTitleGreek: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 24 },
  emptyCopy: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22 },
  action: {
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderRadius: 15,
  },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, fontWeight: '700' },
});

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    page: { flexGrow: 1, alignItems: 'center', paddingBottom: 116 },
    content: {
      width: '100%',
      maxWidth: 1120,
      paddingHorizontal: 24,
      paddingTop: 30,
      paddingBottom: 28,
      gap: 22,
    },
    heading: {
      minHeight: 112,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 14,
      overflow: 'hidden',
      position: 'relative',
    },
    headingCompact: { minHeight: 76 },
    headingRule: { width: 4, borderRadius: 4, marginVertical: 3, zIndex: 1 },
    headingCopy: { flex: 1, justifyContent: 'center', gap: 5, paddingVertical: 4, zIndex: 1 },
    title: {
      color: colors.textPrimary,
      fontFamily: 'BarlowCondensed_700Bold',
      fontSize: 38,
      lineHeight: 42,
      fontWeight: '700',
      maxWidth: 720,
    },
    titleGreek: { fontFamily: 'Inter_600SemiBold', fontSize: 29, lineHeight: 36 },
    description: {
      color: colors.textSecondary,
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 23,
      maxWidth: 660,
    },
    pitchMark: {
      position: 'absolute',
      width: 168,
      height: 110,
      right: -62,
      top: 0,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      opacity: 0.16,
      zIndex: 0,
    },
    pitchHalfLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1 },
    pitchCenter: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      transform: [{ translateX: -22 }, { translateY: -22 }],
    },
    pitchSpot: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: 4,
      height: 4,
      borderRadius: 3,
      transform: [{ translateX: -2 }, { translateY: -2 }],
    },
  });
}
