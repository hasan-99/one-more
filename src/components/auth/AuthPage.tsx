import { Children, createContext, useContext, type PropsWithChildren } from 'react';
import { Link, type Href } from 'expo-router';
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useEffect, useState } from 'react';

import { BrandMark } from '@/components/brand-mark';
import { PitchBackdrop } from '@/components/pitch-backdrop';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

const PitchAuthContext = createContext({ pitchBackdrop: false, compact: false });

export function AuthPage({
  title,
  description,
  children,
  pitchBackdrop = false,
  scrollable = true,
}: PropsWithChildren<{
  title: string;
  description: string;
  pitchBackdrop?: boolean;
  scrollable?: boolean;
}>) {
  const { colors, locale, setLocale, preferencesReady, theme } = useAppPreferences();
  const { height } = useWindowDimensions();
  const copy = translations[locale];
  const cardEntrance = useNativeEntrance(400, false);
  // Keep the reference proportions on normal phones; only compress on very short screens.
  const compactPitch = pitchBackdrop && height < 700;
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const authCard = (
    <Animated.View
      nativeID="auth-card"
      style={[
        styles.card,
        pitchBackdrop ? styles.pitchForm : null,
        compactPitch ? styles.pitchFormCompact : null,
        !pitchBackdrop
          ? {
              backgroundColor: theme === 'dark' ? 'rgba(14,22,17,0.66)' : colors.surface,
              borderColor: theme === 'dark' ? '#2f4538' : colors.border,
            }
          : null,
        cardEntrance,
      ]}
    >
      <View style={styles.topBar}>
        <AuthReveal delay={500} nativeID="auth-logo-reveal" pop>
          <BrandMark prominent logoSize={56} />
        </AuthReveal>
        <View style={styles.preferenceControls}>
          <Pressable
            nativeID="auth-language-toggle"
            accessibilityRole="button"
            accessibilityLabel={locale === 'en' ? copy.authSwitchToGreek : copy.authSwitchToEnglish}
            accessibilityState={{ disabled: !preferencesReady }}
            disabled={!preferencesReady}
            onPress={() => setLocale(locale === 'en' ? 'el' : 'en')}
            style={({ pressed }) => [
              styles.compactControl,
              {
                backgroundColor: pitchBackdrop ? colors.primaryButton : colors.surfaceRaised,
                borderColor: pitchBackdrop ? 'transparent' : colors.border,
              },
              pressed && styles.pressedControl,
            ]}
          >
            <Text
              style={[
                styles.languageCode,
                { color: pitchBackdrop ? colors.primaryButtonText : colors.textPrimary },
              ]}
            >
              {locale === 'en' ? 'EN' : 'EL'}
            </Text>
          </Pressable>
        </View>
      </View>
      <View nativeID="auth-heading" style={styles.heading}>
        <Text
          accessibilityRole="header"
          style={[
            compactPitch ? styles.titleCompact : styles.title,
            { color: pitchBackdrop ? '#f2f5ec' : colors.textPrimary },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            compactPitch ? styles.descriptionCompact : styles.description,
            { color: pitchBackdrop ? '#b9c4b4' : colors.textSecondary },
          ]}
        >
          {description}
        </Text>
      </View>
      {children}
    </Animated.View>
  );
  const authScrollView = (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      scrollEnabled={scrollable || keyboardVisible}
    >
      {authCard}
    </ScrollView>
  );
  return (
    <View
      nativeID={pitchBackdrop ? 'auth-pitch-root' : undefined}
      style={[styles.authRoot, { backgroundColor: pitchBackdrop ? '#0c1210' : colors.background }]}
    >
      {pitchBackdrop ? <PitchBackdrop authAtmosphere /> : null}
      <PitchAuthContext.Provider value={{ pitchBackdrop, compact: compactPitch }}>
        {pitchBackdrop && !scrollable ? (
          <View style={styles.centeredContent}>{authScrollView}</View>
        ) : (
          authScrollView
        )}
      </PitchAuthContext.Provider>
    </View>
  );
}

function useNativeEntrance(delay: number, pop: boolean) {
  const [progress] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (enabled) {
        progress.stopAnimation();
        progress.setValue(1);
      }
    });
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!active) return;
        if (!enabled) {
          progress.setValue(0);
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(progress, {
              toValue: 1,
              duration: pop ? 650 : 500,
              useNativeDriver: true,
            }),
          ]).start();
        }
      })
      .catch(() => progress.setValue(1));
    return () => {
      active = false;
      subscription.remove();
      progress.stopAnimation();
    };
  }, [delay, pop, progress]);

  return {
    opacity: progress,
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
      ...(pop
        ? [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) }]
        : []),
    ],
  };
}

export function AuthForm({ children }: PropsWithChildren) {
  const { compact } = useContext(PitchAuthContext);
  return (
    <View nativeID="auth-form" style={compact ? styles.formCompact : styles.form}>
      {Children.toArray(children).map((child, index) => (
        <AuthReveal key={index} delay={720 + index * 100} nativeID={`auth-step-${index}`}>
          {child}
        </AuthReveal>
      ))}
    </View>
  );
}

export function AuthReveal({
  children,
  delay = 0,
  nativeID,
  pop = false,
}: PropsWithChildren<{ delay?: number; nativeID?: string; pop?: boolean }>) {
  const animation = useNativeEntrance(delay, pop);
  return (
    <Animated.View nativeID={nativeID} style={animation}>
      {children}
    </Animated.View>
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
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoComplete?:
    'off' | 'email' | 'name' | 'tel' | 'current-password' | 'new-password' | 'one-time-code';
  secureTextEntry?: boolean;
  maxLength?: number;
  accessibilityHint?: string;
  editable?: boolean;
}) {
  const { colors } = useAppPreferences();
  const { pitchBackdrop, compact } = useContext(PitchAuthContext);
  return (
    <View style={compact ? styles.fieldCompact : styles.field}>
      <Text
        style={[
          compact ? styles.labelCompact : styles.label,
          { color: pitchBackdrop ? '#d5dccf' : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
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
          compact ? styles.inputCompact : styles.input,
          {
            backgroundColor: pitchBackdrop ? '#0f1512' : colors.background,
            borderColor: pitchBackdrop ? '#3a5544' : colors.border,
            color: pitchBackdrop ? '#f2f5ec' : colors.textPrimary,
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
  const { compact } = useContext(PitchAuthContext);
  const [shineProgress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    const startIfAllowed = (reduceMotion: boolean) => {
      if (!active || reduceMotion) {
        shineProgress.stopAnimation();
        shineProgress.setValue(0);
        return;
      }
      Animated.loop(
        Animated.sequence([
          Animated.delay(2_000),
          Animated.timing(shineProgress, { toValue: 1, duration: 1_100, useNativeDriver: true }),
          Animated.timing(shineProgress, { toValue: 0, duration: 2_700, useNativeDriver: true }),
        ]),
      ).start();
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', startIfAllowed);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(startIfAllowed)
      .catch(() => startIfAllowed(true));
    return () => {
      active = false;
      subscription.remove();
      shineProgress.stopAnimation();
    };
  }, [shineProgress]);

  return (
    <Pressable
      nativeID="auth-cta"
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        compact ? styles.buttonCompact : styles.button,
        {
          backgroundColor: colors.primaryButton,
          opacity: disabled ? 0.55 : pressed ? 0.78 : 1,
        },
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.buttonShine,
          {
            opacity: shineProgress.interpolate({
              inputRange: [0, 0.1, 0.8, 1],
              outputRange: [0, 0.45, 0.45, 0],
            }),
            transform: [
              {
                translateX: shineProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-110, 360],
                }),
              },
              { skewX: '-16deg' },
            ],
          },
        ]}
      />
      <Text style={[styles.buttonText, { color: colors.primaryButtonText }]}>{label}</Text>
    </Pressable>
  );
}

export function AuthFeedback({
  children,
  kind = 'error',
}: PropsWithChildren<{ kind?: 'error' | 'success' | 'info' }>) {
  const { colors } = useAppPreferences();
  const { pitchBackdrop } = useContext(PitchAuthContext);
  const color =
    kind === 'error'
      ? colors.errorText
      : kind === 'success'
        ? colors.successText
        : pitchBackdrop
          ? '#b9c4b4'
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
  const { pitchBackdrop } = useContext(PitchAuthContext);
  return (
    <Link
      href={href as Href}
      style={[styles.link, { color: pitchBackdrop ? '#cfff4a' : colors.accentText }]}
    >
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
  const { pitchBackdrop, compact } = useContext(PitchAuthContext);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={compact ? styles.checkboxRowCompact : styles.checkboxRow}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: pitchBackdrop ? '#9aaa96' : colors.border,
            backgroundColor: checked ? colors.primaryButton : 'transparent',
          },
        ]}
      >
        {checked ? (
          <Text style={[styles.checkmark, { color: colors.primaryButtonText }]}>✓</Text>
        ) : null}
      </View>
      <Text
        style={[styles.checkboxLabel, { color: pitchBackdrop ? '#b9c4b4' : colors.textSecondary }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  authRoot: { position: 'relative', flex: 1, overflow: 'hidden' },
  screen: { flex: 1, zIndex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 18 },
  centeredContent: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    gap: 24,
    overflow: 'hidden',
  },
  pitchForm: {
    borderWidth: 1.5,
    borderRadius: 28,
    padding: 20,
    gap: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(14,22,17,0.66)',
    borderColor: '#2f4538',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.55,
    shadowRadius: 35,
    elevation: 8,
  },
  pitchFormCompact: { padding: 14, gap: 12, borderRadius: 24 },
  topBar: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  preferenceControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compactControl: {
    minWidth: 48,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageCode: { fontSize: 15, fontWeight: '600' },
  pressedControl: { opacity: 0.7 },
  heading: { gap: 8 },
  headingCompact: { gap: 4 },
  title: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '800',
  },
  titleCompact: {
    fontFamily: 'BarlowCondensed_700Bold',
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '800',
  },
  description: { fontSize: 16, lineHeight: 23 },
  descriptionCompact: { fontSize: 14, lineHeight: 19 },
  field: { gap: 6 },
  fieldCompact: { gap: 5 },
  label: { fontSize: 14, fontWeight: '600' },
  labelCompact: { fontSize: 13, fontWeight: '600' },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  inputCompact: {
    height: 46,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  button: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonCompact: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 44,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonShine: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    width: 54,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
  feedback: { fontSize: 13, lineHeight: 20 },
  link: {
    alignSelf: 'flex-start',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 8,
    textDecorationLine: 'underline',
  },
  checkboxRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkboxRowCompact: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  form: { gap: 14 },
  formCompact: { gap: 10 },
});
