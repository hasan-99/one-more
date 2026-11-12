import { Component, type PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

type AppErrorBoundaryProps = PropsWithChildren<{
  locale: 'en' | 'el';
  background: string;
  surface: string;
  border: string;
  text: string;
  secondary: string;
  action: string;
  actionText: string;
}>;

type AppErrorBoundaryState = { hasError: boolean };

export function AppErrorBoundary({ children }: PropsWithChildren) {
  const { locale, colors } = useAppPreferences();
  return (
    <ErrorBoundaryFrame
      locale={locale}
      background={colors.background}
      surface={colors.surface}
      border={colors.border}
      text={colors.textPrimary}
      secondary={colors.textSecondary}
      action={colors.primaryButton}
      actionText={colors.primaryButtonText}
    >
      {children}
    </ErrorBoundaryFrame>
  );
}

class ErrorBoundaryFrame extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Keep the event useful for host log collectors without forwarding user text, route, or stack.
    console.error('[one-more-monitor] ui_render_error');
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const copy = translations[this.props.locale];
    return (
      <View
        accessibilityRole="alert"
        style={[styles.screen, { backgroundColor: this.props.background }]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: this.props.surface, borderColor: this.props.border },
          ]}
        >
          <Text accessibilityRole="header" style={[styles.title, { color: this.props.text }]}>
            {copy.appErrorTitle}
          </Text>
          <Text style={[styles.description, { color: this.props.secondary }]}>
            {copy.appErrorDescription}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              this.setState({ hasError: false });
              router.replace('/');
            }}
            style={[styles.action, { backgroundColor: this.props.action }]}
          >
            <Text style={{ color: this.props.actionText, fontWeight: '700' }}>
              {copy.appErrorRetry}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: '100%', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    gap: 16,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  description: { fontSize: 16, lineHeight: 24 },
  action: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
});
