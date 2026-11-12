import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';
import { useToast } from './ToastProvider';

export function ToastViewport() {
  const { toasts, dismiss } = useToast();
  const { colors, locale } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const copy = translations[locale];

  if (toasts.length === 0) return null;

  return (
    <View pointerEvents="box-none" style={[styles.viewport, { top: Math.max(12, insets.top + 8) }]}>
      {toasts.map((toast) => {
        const palette =
          toast.kind === 'success'
            ? { background: colors.success, text: colors.successText }
            : toast.kind === 'error'
              ? { background: colors.error, text: colors.errorText }
              : { background: colors.info, text: colors.infoText };
        return (
          <View
            key={toast.id}
            accessibilityRole={toast.kind === 'error' ? 'alert' : 'status'}
            accessibilityLiveRegion={toast.kind === 'error' ? 'assertive' : 'polite'}
            style={[
              styles.toast,
              { backgroundColor: palette.background, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.message, { color: palette.text }]}>{toast.message}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.toastDismiss}
              hitSlop={8}
              onPress={() => dismiss(toast.id)}
              style={styles.dismiss}
            >
              <Text style={[styles.dismissText, { color: palette.text }]}>×</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'flex-end',
    gap: 8,
    zIndex: 10000,
    elevation: 12,
  },
  toast: {
    width: '100%',
    maxWidth: 440,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 8,
    borderWidth: 1,
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
  },
  message: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  dismiss: { minWidth: 36, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  dismissText: { fontSize: 24, lineHeight: 28, fontWeight: '500' },
});
