import { Link, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

/** Row of public legal and support links, used on sign-up, settings and the landing page. */
export function LegalLinks({ compact = false }: { compact?: boolean }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const links: [string, string][] = [
    ['/privacy', copy.legalPrivacyLink],
    ['/terms', copy.legalTermsLink],
    ['/support', copy.legalSupportLink],
  ];
  if (!compact) {
    links.push(['/delete-account', copy.legalDeletionLink], ['/licenses', copy.legalLicensesLink]);
  }
  return (
    <View
      accessibilityRole="navigation"
      accessibilityLabel={copy.legalLinksLabel}
      style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 2 }}
    >
      {links.map(([href, label]) => (
        <Link key={href} href={href as Href} asChild>
          <Pressable accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.accentText, fontWeight: '700', fontSize: 14 }}>
              {label}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}
