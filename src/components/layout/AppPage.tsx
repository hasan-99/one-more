import { Link, type Href } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { TranslationKey } from '@/i18n';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export function AppPage({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description?: string }>) {
  const { colors } = useAppPreferences();
  const styles = makeStyles(colors);
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.page}
    >
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
        {children}
      </View>
    </ScrollView>
  );
}

export function AppCard({ children }: PropsWithChildren) {
  const { colors } = useAppPreferences();
  return (
    <View
      style={{ backgroundColor: colors.surface, borderColor: colors.border, ...cardStyles.card }}
    >
      {children}
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  const { colors } = useAppPreferences();
  return (
    <View
      style={[cardStyles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[cardStyles.marker, { backgroundColor: colors.primaryButton }]} />
      <Text style={{ color: colors.textPrimary, ...cardStyles.emptyTitle }}>{title}</Text>
      <Text style={{ color: colors.textSecondary, ...cardStyles.emptyCopy }}>{description}</Text>
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
        style={({ pressed }) =>
          StyleSheet.flatten([
            cardStyles.action,
            {
              backgroundColor: secondary ? colors.surfaceRaised : colors.primaryButton,
              opacity: pressed ? 0.82 : 1,
            },
          ])
        }
      >
        <Text
          style={{
            color: secondary ? colors.textPrimary : colors.primaryButtonText,
            ...cardStyles.actionText,
          }}
        >
          {copy[labelKey]}
        </Text>
      </Pressable>
    </Link>
  );
}

const cardStyles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 22, gap: 10 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 22, gap: 9 },
  marker: { width: 8, height: 8, borderRadius: 5, marginBottom: 4 },
  emptyTitle: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  emptyCopy: { fontSize: 14, lineHeight: 21 },
  action: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  actionText: { fontSize: 13, fontWeight: '700' },
});

function makeStyles(colors: ReturnType<typeof useAppPreferences>['colors']) {
  return StyleSheet.create({
    page: { flexGrow: 1, alignItems: 'center', paddingBottom: 110 },
    content: { width: '100%', maxWidth: 1120, paddingHorizontal: 24, paddingTop: 34, gap: 18 },
    title: { color: colors.textPrimary, fontSize: 36, lineHeight: 42, fontWeight: '800' },
    description: {
      color: colors.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      maxWidth: 680,
      marginTop: -8,
    },
  });
}
