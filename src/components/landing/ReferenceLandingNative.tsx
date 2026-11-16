import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildHomeReferenceHtml,
  type HomeReferenceCopy,
} from '@/components/landing/home-reference-html';
import { translations } from '@/i18n';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export function ReferenceLandingNative() {
  const { locale, setLocale } = useAppPreferences();
  const copy = translations[locale];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(true);
  const [logoPop] = useState(() => new Animated.Value(1));
  const html = useMemo(() => {
    const htmlCopy: HomeReferenceCopy = {
      eyebrow: copy.eyebrow,
      heroLineOne: copy.heroLineOne,
      heroLineTwo: copy.heroLineTwo,
      intro: copy.intro,
      landingGetStarted: copy.landingGetStarted,
      demoExampleGame: copy.demoExampleGame,
      demoTitle: copy.demoTitle,
      demoSubtitle: copy.demoSubtitle,
      demoAvailability: copy.demoAvailability,
      demoOnePlaceOpen: copy.demoOnePlaceOpen,
      landingFooterLead: copy.landingFooterLead,
      landingFooterEmphasis: copy.landingFooterEmphasis,
      languageSwitchLabel: locale === 'en' ? copy.authSwitchToGreek : copy.authSwitchToEnglish,
      languageCode: locale === 'en' ? 'EN' : 'EL',
    };
    return buildHomeReferenceHtml(htmlCopy, { top: insets.top, bottom: insets.bottom });
  }, [copy, insets.bottom, insets.top, locale]);
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (event.nativeEvent.data === 'sign-in') {
        router.push('/sign-in' as Href);
      } else if (event.nativeEvent.data === 'switch-language') {
        void setLocale(locale === 'en' ? 'el' : 'en');
      }
    },
    [locale, setLocale],
  );
  const logoLeft = Math.max((width - 480) / 2, 0) + 18;

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (!active) return;
        setReduceMotion(enabled);
        if (!enabled) {
          logoPop.setValue(0);
          Animated.timing(logoPop, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.back(1.3)),
            useNativeDriver: true,
          }).start();
        }
      })
      .catch(() => {
        if (active) logoPop.setValue(1);
      });
    return () => {
      active = false;
      subscription.remove();
      logoPop.stopAnimation();
    };
  }, [logoPop]);

  useEffect(() => {
    if (!reduceMotion) return;
    logoPop.stopAnimation();
    logoPop.setValue(1);
  }, [logoPop, reduceMotion]);

  const logoStyle = {
    opacity: logoPop,
    transform: [
      { scale: logoPop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
      {
        rotate: logoPop.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }),
      },
    ],
  };

  return (
    <View style={styles.root}>
      <WebView
        accessibilityLabel="ONE MORE home"
        allowsBackForwardNavigationGestures={false}
        bounces={false}
        javaScriptEnabled
        onMessage={handleMessage}
        originWhitelist={['*']}
        scrollEnabled={false}
        setSupportMultipleWindows={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        source={{ html }}
        style={styles.webView}
      />
      <Animated.Image
        accessibilityLabel="ONE MORE football logo"
        accessibilityRole="image"
        pointerEvents="none"
        resizeMode="cover"
        source={require('@/assets/images/one-more-logo-256.png')}
        style={[styles.logo, { left: logoLeft, top: insets.top + 14 }, logoStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c1210' },
  webView: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },
  logo: {
    position: 'absolute',
    top: 14,
    width: 60,
    height: 60,
    borderRadius: 15,
  },
});
