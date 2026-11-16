import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { AppCard, AppPage } from '@/components/layout/AppPage';
import { translations } from '@/i18n';
import { developerAddress, developerName, legalUpdated, supportEmail } from '@/legal/contact';
import { legalContent, type LegalKind } from '@/legal/legal-content';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

const pathPattern = /(\/(?:privacy|terms|support|delete-account|licenses)\b)/;
const exactPath = /^\/(privacy|terms|support|delete-account|licenses)$/;

function fill(text: string, email: string | null): string {
  return text
    .replaceAll('{developer}', developerName)
    .replaceAll('{email}', email ?? developerName);
}

export function LegalDocument({ kind }: { kind: LegalKind }) {
  const { colors, locale } = useAppPreferences();
  const copy = translations[locale];
  const doc = legalContent[kind][locale];

  // Turns "/privacy" style references into real links and keeps the rest as text.
  const renderText = (text: string): ReactNode[] =>
    fill(text, supportEmail)
      .split(pathPattern)
      .map((part, index) =>
        exactPath.test(part) ? (
          <Link
            key={index}
            href={part as Href}
            style={{ color: colors.accentText, fontWeight: '700' }}
          >
            {part}
          </Link>
        ) : (
          part
        ),
      );

  return (
    <AppPage title={doc.title} description={fill(doc.intro, supportEmail)}>
      <Text style={{ color: colors.textMuted, fontSize: 13 }}>
        {copy.legalUpdatedOn}: {legalUpdated}
      </Text>
      {doc.sections.map((section) => (
        <AppCard key={section.heading}>
          <Text
            accessibilityRole="header"
            style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '800' }}
          >
            {section.heading}
          </Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={{ color: colors.textSecondary, lineHeight: 23 }}>
              {renderText(paragraph)}
            </Text>
          ))}
        </AppCard>
      ))}
      <AppCard>
        <Text
          accessibilityRole="header"
          style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '800' }}
        >
          {copy.legalContactLine}
        </Text>
        <Text style={{ color: colors.textSecondary }}>
          {developerName}
          {developerAddress ? `, ${developerAddress}` : ''}
        </Text>
        {supportEmail ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={copy.legalSupportMailto}
            onPress={() => void Linking.openURL(`mailto:${supportEmail}`)}
            style={{ minHeight: 48, justifyContent: 'center' }}
          >
            <Text style={{ color: colors.accentText, fontWeight: '700' }}>{supportEmail}</Text>
          </Pressable>
        ) : null}
      </AppCard>
      <View>
        <Link href={'/' as Href} asChild>
          <Pressable
            accessibilityRole="link"
            style={{ minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' }}
          >
            <Text style={{ color: colors.accentText, fontWeight: '700' }}>
              {copy.legalBackHome}
            </Text>
          </Pressable>
        </Link>
      </View>
    </AppPage>
  );
}
