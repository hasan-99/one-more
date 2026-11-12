import type { PropsWithChildren } from 'react';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { PreferenceSwitchers } from '@/components/preferences-switchers';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export function AuthPage({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description: string }>) {
  const { colors } = useAppPreferences();
  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <BrandMark />
        <PreferenceSwitchers />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
        </View>
        {children}
      </View>
    </ScrollView>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
  autoComplete = 'off',
  secureTextEntry = false,
  maxLength,
  accessibilityHint,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoComplete?: 'off' | 'email' | 'current-password' | 'new-password' | 'one-time-code';
  secureTextEntry?: boolean;
  maxLength?: number;
  accessibilityHint?: string;
  editable?: boolean;
}) {
  const { colors } = useAppPreferences();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        editable={editable}
        autoCapitalize="none"
        autoComplete={autoComplete}
        autoCorrect={false}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
            color: colors.textPrimary,
          },
        ]}
        value={value}
      />
    </View>
  );
}

export function AuthButton({
  label,
  disabled = false,
  onPress,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppPreferences();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors.primaryButton, opacity: disabled ? 0.55 : pressed ? 0.78 : 1 },
      ]}
    >
      <Text style={[styles.buttonText, { color: colors.primaryButtonText }]}>{label}</Text>
    </Pressable>
  );
}

export function AuthFeedback({
  children,
  kind = 'error',
}: PropsWithChildren<{ kind?: 'error' | 'success' | 'info' }>) {
  const { colors } = useAppPreferences();
  const color =
    kind === 'error'
      ? colors.errorText
      : kind === 'success'
        ? colors.successText
        : colors.textSecondary;
  return (
    <Text
      accessibilityRole={kind === 'error' ? 'alert' : 'text'}
      style={[styles.feedback, { color }]}
    >
      {children}
    </Text>
  );
}

export function AuthTextLink({ children, href }: PropsWithChildren<{ href: string }>) {
  const { colors } = useAppPreferences();
  return (
    <Link href={href as Href} style={[styles.link, { color: colors.accentText }]}>
      {children}
    </Link>
  );
}

export function AuthCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { colors } = useAppPreferences();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={styles.checkboxRow}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: colors.border,
            backgroundColor: checked ? colors.primaryButton : 'transparent',
          },
        ]}
      >
        {checked ? (
          <Text style={[styles.checkmark, { color: colors.primaryButtonText }]}>✓</Text>
        ) : null}
      </View>
      <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 480, borderWidth: 1, borderRadius: 20, padding: 24, gap: 24 },
  heading: { gap: 8 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  description: { fontSize: 14, lineHeight: 21 },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  button: {
    minHeight: 48,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 14, fontWeight: '800' },
  feedback: { fontSize: 13, lineHeight: 20 },
  link: {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 4,
    textDecorationLine: 'underline',
  },
  checkboxRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { fontSize: 15, lineHeight: 18, fontWeight: '800' },
  checkboxLabel: { flex: 1, fontSize: 13, lineHeight: 19 },
  footer: { gap: 14 },
});
