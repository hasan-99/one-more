import { Link, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { AppCard, AppPage } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export function LegalPlaceholder({ kind }: { kind: 'privacy' | 'terms' }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const title = kind === 'privacy' ? copy.legalPrivacyTitle : copy.legalTermsTitle;
  const body = kind === 'privacy' ? copy.legalPrivacyBody : copy.legalTermsBody;

  return (
    <AppPage title={title} description={copy.legalPendingReview}>
      <AppCard>
        <Text style={{ color: colors.textPrimary, lineHeight: 24 }}>{body}</Text>
      </AppCard>
      <Link href={'/' as Href} asChild>
        <Pressable
          accessibilityRole="link"
          style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}
        >
          <Text style={{ color: colors.accentText, fontWeight: '700' }}>{copy.legalBackHome}</Text>
        </Pressable>
      </Link>
    </AppPage>
  );
}
