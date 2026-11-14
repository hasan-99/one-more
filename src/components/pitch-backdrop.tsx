import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { AuthPitchReference } from '@/components/auth/AuthPitchReference';
import { FootballBall } from '@/components/football-ball';
import { useAppPreferences } from '@/preferences/AppPreferencesProvider';

export function PitchBackdrop({ authAtmosphere = false }: { authAtmosphere?: boolean }) {
  const { colors } = useAppPreferences();
  const { height } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(true);
  const [motionProgress] = useState(() => new Animated.Value(0));
  const [ballX] = useState(() => new Animated.Value(0));
  const [ballY] = useState(() => new Animated.Value(0));
  const [ballSpin] = useState(() => new Animated.Value(0));
  const [glowProgress] = useState(() => new Animated.Value(0));
  const [leftBeamProgress] = useState(() => new Animated.Value(0));
  const [rightBeamProgress] = useState(() => new Animated.Value(0));
  const [lampProgress] = useState(() => new Animated.Value(0));
  const [rightLampProgress] = useState(() => new Animated.Value(0));
  const [floorProgress] = useState(() => new Animated.Value(0));
  const [dotProgresses] = useState(() => Array.from({ length: 10 }, () => new Animated.Value(0)));
  const [trailProgresses] = useState(() => Array.from({ length: 2 }, () => new Animated.Value(0)));
  const [trailYProgresses] = useState(() => Array.from({ length: 2 }, () => new Animated.Value(0)));

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        if (active) setReduceMotion(true);
      });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || reduceMotion || authAtmosphere) {
      motionProgress.stopAnimation();
      [
        ballX,
        ballY,
        ballSpin,
        glowProgress,
        leftBeamProgress,
        rightBeamProgress,
        lampProgress,
        rightLampProgress,
        floorProgress,
        ...trailProgresses,
        ...trailYProgresses,
        ...dotProgresses,
      ].forEach((value) => value.stopAnimation());
      motionProgress.setValue(0);
      [
        ballX,
        ballY,
        ballSpin,
        glowProgress,
        leftBeamProgress,
        rightBeamProgress,
        lampProgress,
        rightLampProgress,
        floorProgress,
        ...trailProgresses,
        ...trailYProgresses,
        ...dotProgresses,
      ].forEach((value) => value.setValue(0));
      return;
    }
    const motionAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(motionProgress, { toValue: 1, duration: 14_000, useNativeDriver: true }),
        Animated.timing(motionProgress, { toValue: 0, duration: 14_000, useNativeDriver: true }),
      ]),
    );
    const animations: Animated.CompositeAnimation[] = [motionAnimation];
    const loop = (sequence: Animated.CompositeAnimation) =>
      animations.push(Animated.loop(sequence));
    if (authAtmosphere) {
      loop(
        Animated.sequence([
          Animated.timing(glowProgress, { toValue: 1, duration: 9_000, useNativeDriver: true }),
          Animated.timing(glowProgress, { toValue: 0, duration: 9_000, useNativeDriver: true }),
        ]),
      );
      loop(
        Animated.sequence([
          Animated.timing(leftBeamProgress, { toValue: 1, duration: 8_000, useNativeDriver: true }),
          Animated.timing(leftBeamProgress, { toValue: 0, duration: 8_000, useNativeDriver: true }),
        ]),
      );
      loop(
        Animated.sequence([
          Animated.timing(rightBeamProgress, {
            toValue: 1,
            duration: 10_000,
            useNativeDriver: true,
          }),
          Animated.timing(rightBeamProgress, {
            toValue: 0,
            duration: 10_000,
            useNativeDriver: true,
          }),
        ]),
      );
      loop(
        Animated.sequence([
          Animated.timing(lampProgress, { toValue: 1, duration: 2_600, useNativeDriver: true }),
          Animated.timing(lampProgress, { toValue: 0, duration: 2_600, useNativeDriver: true }),
        ]),
      );
      animations.push(
        Animated.sequence([
          Animated.delay(1_300),
          Animated.loop(
            Animated.sequence([
              Animated.timing(rightLampProgress, {
                toValue: 1,
                duration: 2_600,
                useNativeDriver: true,
              }),
              Animated.timing(rightLampProgress, {
                toValue: 0,
                duration: 2_600,
                useNativeDriver: true,
              }),
            ]),
          ),
        ]),
      );
      loop(Animated.timing(floorProgress, { toValue: 1, duration: 7_000, useNativeDriver: true }));
      const durations = [
        13_000, 10_000, 15_000, 11_000, 14_000, 12_000, 16_000, 17_000, 9_000, 18_000,
      ];
      const delays = [0, 3_000, 6_000, 1_500, 8_000, 4_000, 9_500, 11_000, 5_000, 13_000];
      trailProgresses.forEach((progress, index) =>
        animations.push(
          Animated.sequence([
            Animated.delay(index === 0 ? 2_160 : 2_080),
            Animated.loop(
              Animated.sequence([
                Animated.parallel([
                  Animated.timing(progress, {
                    toValue: 1,
                    duration: 4_950,
                    easing: Easing.linear,
                    useNativeDriver: true,
                  }),
                  Animated.sequence([
                    Animated.timing(trailYProgresses[index]!, {
                      toValue: 1,
                      duration: 2_475,
                      easing: Easing.bezier(0.2, 0.6, 0.4, 1),
                      useNativeDriver: true,
                    }),
                    Animated.timing(trailYProgresses[index]!, {
                      toValue: 0,
                      duration: 2_475,
                      easing: Easing.bezier(0.6, 0, 0.8, 0.4),
                      useNativeDriver: true,
                    }),
                  ]),
                ]),
                Animated.delay(4_050),
                Animated.parallel([
                  Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
                  Animated.timing(trailYProgresses[index]!, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                  }),
                ]),
              ]),
            ),
          ]),
        ),
      );
      dotProgresses.forEach((progress, index) =>
        animations.push(
          Animated.sequence([
            Animated.delay(delays[index] ?? 0),
            Animated.loop(
              Animated.sequence([
                Animated.timing(progress, {
                  toValue: 1,
                  duration: durations[index] ?? 12_000,
                  useNativeDriver: true,
                }),
                Animated.timing(progress, { toValue: 0, duration: 0, useNativeDriver: true }),
              ]),
            ),
          ]),
        ),
      );
      animations.push(
        Animated.sequence([
          Animated.delay(2_000),
          Animated.loop(
            Animated.sequence([
              Animated.parallel([
                Animated.timing(ballX, {
                  toValue: 1,
                  duration: 4_950,
                  easing: Easing.linear,
                  useNativeDriver: true,
                }),
                Animated.sequence([
                  Animated.timing(ballY, {
                    toValue: 1,
                    duration: 2_475,
                    easing: Easing.bezier(0.2, 0.6, 0.4, 1),
                    useNativeDriver: true,
                  }),
                  Animated.timing(ballY, {
                    toValue: 0,
                    duration: 2_475,
                    easing: Easing.bezier(0.6, 0, 0.8, 0.4),
                    useNativeDriver: true,
                  }),
                ]),
                Animated.timing(ballSpin, {
                  toValue: 1,
                  duration: 4_950,
                  easing: Easing.linear,
                  useNativeDriver: true,
                }),
              ]),
              Animated.delay(4_050),
              Animated.parallel([
                Animated.timing(ballX, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(ballY, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.timing(ballSpin, { toValue: 0, duration: 0, useNativeDriver: true }),
              ]),
            ]),
          ),
        ]),
      );
    }
    const animation = Animated.parallel(animations);
    animation.start();
    return () => animation.stop();
  }, [
    authAtmosphere,
    ballSpin,
    ballX,
    ballY,
    dotProgresses,
    floorProgress,
    glowProgress,
    lampProgress,
    leftBeamProgress,
    motionProgress,
    reduceMotion,
    rightBeamProgress,
    rightLampProgress,
    trailProgresses,
    trailYProgresses,
  ]);

  if (authAtmosphere && Platform.OS !== 'web') {
    return <AuthPitchReference />;
  }

  const nativeMotionStyle = {
    opacity: motionProgress.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.1] }),
    transform: [
      {
        rotate: motionProgress.interpolate({
          inputRange: [0, 1],
          outputRange: ['-11deg', '-9deg'],
        }),
      },
      { translateY: motionProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) },
    ],
  };
  const ballStyle = {
    opacity: 1,
    transform: [
      { translateX: ballX.interpolate({ inputRange: [0, 1], outputRange: [-60, 540] }) },
      { translateY: ballY.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.8] }) },
      { rotate: ballSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '900deg'] }) },
    ],
  };

  return (
    <View
      {...(Platform.OS === 'web'
        ? {}
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants' as const,
          })}
      nativeID={authAtmosphere ? 'auth-bg-all' : 'pitch-backdrop'}
      pointerEvents="none"
      style={styles.backdrop}
    >
      {!authAtmosphere ? <View style={[styles.wash, { backgroundColor: colors.pitch }]} /> : null}
      {authAtmosphere ? (
        <>
          <View nativeID="auth-night-sky" style={styles.authNightSky}>
            {Platform.OS !== 'web' ? (
              <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" width="100%">
                <Defs>
                  <LinearGradient id="auth-sky-gradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#070b09" />
                    <Stop offset="0.45" stopColor="#0c1511" />
                    <Stop offset="1" stopColor="#101c15" />
                  </LinearGradient>
                </Defs>
                <Polygon points="0,0 100,0 100,100 0,100" fill="url(#auth-sky-gradient)" />
              </Svg>
            ) : null}
          </View>
          <View nativeID="auth-floor-window" style={styles.floorWindow}>
            <Animated.View
              nativeID="auth-floor"
              style={[
                styles.floor,
                {
                  transform: [
                    { perspective: 420 },
                    { rotateX: '66deg' },
                    {
                      translateY: floorProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 480],
                      }),
                    },
                  ],
                },
              ]}
            >
              {Platform.OS !== 'web' ? (
                <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 100 960" width="100%">
                  <Line x1="24" y1="0" x2="24" y2="960" stroke="rgba(242,245,236,0.3)" />
                  <Line x1="76" y1="0" x2="76" y2="960" stroke="rgba(242,245,236,0.3)" />
                  {Array.from({ length: 9 }, (_, index) => (
                    <Line
                      key={index}
                      x1="0"
                      y1={index * 120}
                      x2="100"
                      y2={index * 120}
                      stroke="rgba(242,245,236,0.13)"
                    />
                  ))}
                </Svg>
              ) : null}
            </Animated.View>
          </View>
          <Animated.View
            nativeID="pitch-backdrop-beam-left"
            style={[
              styles.beam,
              styles.beamLeft,
              {
                transform: [
                  {
                    rotate: leftBeamProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['-20deg', '-36deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            {Platform.OS !== 'web' ? <AuthBeamGraphic side="left" /> : null}
          </Animated.View>
          <Animated.View
            nativeID="pitch-backdrop-beam-right"
            style={[
              styles.beam,
              styles.beamRight,
              {
                transform: [
                  {
                    rotate: rightBeamProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['36deg', '20deg'],
                    }),
                  },
                ],
              },
            ]}
          >
            {Platform.OS !== 'web' ? <AuthBeamGraphic side="right" /> : null}
          </Animated.View>
          <Animated.View
            nativeID="auth-lamp-left"
            style={[
              styles.lamp,
              styles.lampLeft,
              {
                opacity: lampProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.65, 1],
                }),
                transform: [
                  {
                    scale: lampProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.15],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            nativeID="auth-lamp-right"
            style={[
              styles.lamp,
              styles.lampRight,
              {
                opacity: rightLampProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.65, 1],
                }),
                transform: [
                  {
                    scale: rightLampProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.9, 1.15],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            nativeID="pitch-backdrop-glow"
            style={[
              styles.glow,
              {
                transform: [
                  {
                    translateX: glowProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-30, 40],
                    }),
                  },
                  {
                    translateY: glowProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 50],
                    }),
                  },
                  {
                    scale: glowProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }),
                  },
                ],
              },
            ]}
          >
            {Platform.OS !== 'web' ? (
              <Svg height="100%" width="100%" viewBox="0 0 280 280">
                <Defs>
                  <RadialGradient id="auth-backdrop-glow">
                    <Stop offset="0" stopColor="#cfff4a" stopOpacity="0.13" />
                    <Stop offset="0.7" stopColor="#cfff4a" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Circle cx="140" cy="140" r="140" fill="url(#auth-backdrop-glow)" />
              </Svg>
            ) : null}
          </Animated.View>
          {dotProgresses.map((progress, index) => {
            const dot = [
              ['8%', 5, '#f2f5ec', 10, 18],
              ['22%', 3, '#cfff4a', 6, -14],
              ['37%', 6, '#cfff4a', 12, 22],
              ['52%', 3, '#f2f5ec', 6, -10],
              ['66%', 5, '#cfff4a', 10, 16],
              ['80%', 4, '#cfff4a', 8, -20],
              ['92%', 6, '#f2f5ec', 12, -12],
              ['14%', 4, '#cfff4a', 8, 12],
              ['60%', 3, '#cfff4a', 6, 8],
              ['74%', 5, '#f2f5ec', 10, -16],
            ][index];
            return (
              <Animated.View
                key={index}
                nativeID={`auth-light-dot-${index}`}
                style={[
                  styles.dot,
                  {
                    left: dot?.[0] as `${number}%`,
                    width: Number(dot?.[1]),
                    height: Number(dot?.[1]),
                    backgroundColor: String(dot?.[2]),
                    opacity: progress.interpolate({
                      inputRange: [0, 0.12, 0.8, 1],
                      outputRange: [0, 0.85, 0.5, 0],
                    }),
                    transform: [
                      {
                        translateX: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, Number(dot?.[4])],
                        }),
                      },
                      {
                        translateY: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, -height * 1.05],
                        }),
                      },
                    ],
                  },
                ]}
              />
            );
          })}
        </>
      ) : null}
      {!authAtmosphere ? (
        <Animated.View nativeID="pitch-backdrop-motion" style={[styles.motion, nativeMotionStyle]}>
          <View
            nativeID="pitch-field-outline"
            style={[styles.field, { borderColor: colors.pitchLine }]}
          >
            <View
              nativeID="pitch-halfway-line"
              style={[styles.halfwayLine, { backgroundColor: colors.pitchLine }]}
            />
            <View
              nativeID="pitch-center-circle"
              style={[styles.centerCircle, { borderColor: colors.pitchLine }]}
            />
            <View
              nativeID="pitch-center-spot"
              style={[styles.centerSpot, { backgroundColor: colors.pitchLine }]}
            />
            <View
              nativeID="pitch-left-penalty"
              style={[styles.leftPenalty, { borderColor: colors.pitchLine }]}
            />
            <View
              nativeID="pitch-right-penalty"
              style={[styles.rightPenalty, { borderColor: colors.pitchLine }]}
            />
            <View style={[styles.leftGoal, { borderColor: colors.pitchLine }]} />
            <View style={[styles.rightGoal, { borderColor: colors.pitchLine }]} />
          </View>
        </Animated.View>
      ) : null}
      {authAtmosphere ? (
        <>
          <Animated.View
            nativeID="auth-ball-trail-x-0"
            style={[
              styles.ballTrail,
              {
                opacity: 0.25,
                transform: [
                  {
                    translateX: trailProgresses[0]!.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-60, 540],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              nativeID="auth-ball-trail-y-0"
              style={{
                transform: [
                  {
                    translateY: trailYProgresses[0]!.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -height * 0.8],
                    }),
                  },
                ],
              }}
            >
              <TrailGlow size={18} />
            </Animated.View>
          </Animated.View>
          <Animated.View
            nativeID="auth-ball-trail-x-1"
            style={[
              styles.ballTrail,
              {
                opacity: 0.4,
                transform: [
                  {
                    translateX: trailProgresses[1]!.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-60, 540],
                    }),
                  },
                ],
              },
            ]}
          >
            <Animated.View
              nativeID="auth-ball-trail-y-1"
              style={{
                transform: [
                  {
                    translateY: trailYProgresses[1]!.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -height * 0.8],
                    }),
                  },
                ],
              }}
            >
              <TrailGlow size={24} />
            </Animated.View>
          </Animated.View>
        </>
      ) : null}
      {authAtmosphere ? (
        <Animated.View nativeID="pitch-backdrop-ball" style={[styles.ball, ballStyle]}>
          <FootballBall size={34} variant="auth" />
        </Animated.View>
      ) : null}
      {authAtmosphere ? <View nativeID="auth-vignette" style={styles.vignette} /> : null}
    </View>
  );
}

function AuthBeamGraphic({ side }: { side: 'left' | 'right' }) {
  const gradientId = `auth-beam-gradient-${side}`;
  return (
    <Svg height="100%" preserveAspectRatio="none" viewBox="0 0 260 800" width="100%">
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#deff96" stopOpacity={side === 'left' ? 0.26 : 0.22} />
          <Stop offset="0.72" stopColor="#deff96" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polygon points="120,0 140,0 260,800 0,800" fill={`url(#${gradientId})`} />
      <Polygon points="124,0 136,0 220,620 40,620" fill={`url(#${gradientId})`} opacity={0.35} />
    </Svg>
  );
}

function TrailGlow({ size }: { size: number }) {
  return (
    <View
      nativeID={`auth-ball-trail-glow-${size}`}
      style={size === 18 ? styles.ballTrailSmall : styles.ballTrailMedium}
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  wash: {
    position: 'absolute',
    width: 420,
    height: 420,
    top: 24,
    right: -180,
    borderRadius: 220,
    opacity: 0.08,
  },
  authNightSky: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#0c1210',
  },
  floorWindow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '62%',
    overflow: 'hidden',
  },
  floor: {
    position: 'absolute',
    left: '-70%',
    right: '-70%',
    bottom: -30,
    height: 960,
    backgroundColor: '#13231a',
  },
  floorLeftLine: {
    position: 'absolute',
    left: '24%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(242,245,236,0.3)',
  },
  floorRightLine: {
    position: 'absolute',
    right: '24%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(242,245,236,0.3)',
  },
  floorBand: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'rgba(28,54,38,0.65)',
  },
  glow: {
    position: 'absolute',
    top: '18%',
    left: '10%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'transparent',
  },
  beam: {
    position: 'absolute',
    top: -30,
    width: 260,
    height: '125%',
    backgroundColor: 'transparent',
  },
  beamLeft: { left: -110, transform: [{ rotate: '-20deg' }] },
  beamRight: { right: -110, transform: [{ rotate: '36deg' }] },
  lamp: {
    position: 'absolute',
    top: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f4ffd0',
  },
  lampLeft: { left: 12 },
  lampRight: { right: 12 },
  dot: { position: 'absolute', bottom: -20, borderRadius: 8 },
  vignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(7,11,9,0.12)',
  },
  motion: {
    position: 'absolute',
    top: 90,
    right: -210,
    width: '145%',
    maxWidth: 1500,
    height: 390,
    padding: 12,
    opacity: 0.08,
    transform: [{ rotate: '-11deg' }],
  },
  ball: {
    position: 'absolute',
    left: 0,
    bottom: '10%',
    width: 34,
    height: 34,
  },
  ballTrail: {
    position: 'absolute',
    left: 0,
    bottom: '10%',
    zIndex: 1,
  },
  ballTrailSmall: {
    width: 18,
    height: 18,
    margin: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(207,255,74,0.25)',
  },
  ballTrailMedium: {
    width: 24,
    height: 24,
    margin: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(207,255,74,0.4)',
  },
  field: { flex: 1, borderWidth: 1.5, borderRadius: 18, overflow: 'hidden' },
  halfwayLine: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1 },
  centerCircle: {
    position: 'absolute',
    width: 112,
    height: 112,
    top: '50%',
    left: '50%',
    marginTop: -56,
    marginLeft: -56,
    borderWidth: 1,
    borderRadius: 56,
  },
  centerSpot: {
    position: 'absolute',
    width: 5,
    height: 5,
    top: '50%',
    left: '50%',
    marginTop: -2.5,
    marginLeft: -2.5,
    borderRadius: 3,
  },
  leftPenalty: {
    position: 'absolute',
    width: '18%',
    height: '50%',
    top: '25%',
    left: 0,
    borderWidth: 1,
    borderLeftWidth: 0,
  },
  rightPenalty: {
    position: 'absolute',
    width: '18%',
    height: '50%',
    top: '25%',
    right: 0,
    borderWidth: 1,
    borderRightWidth: 0,
  },
  leftGoal: {
    position: 'absolute',
    width: '8%',
    height: '24%',
    top: '38%',
    left: 0,
    borderWidth: 1,
    borderLeftWidth: 0,
  },
  rightGoal: {
    position: 'absolute',
    width: '8%',
    height: '24%',
    top: '38%',
    right: 0,
    borderWidth: 1,
    borderRightWidth: 0,
  },
});
