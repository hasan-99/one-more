import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Path,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { useReducedMotion } from '@/components/motion';

const NATIVE = Platform.OS !== 'web';
const BALL = 64;
const HEIGHT = 104;
const PERIOD = 1000;

// Classic football: a centre pentagon, five seams and five rim patches, drawn in a 100x100 box.
const CENTER = '0.0,-13.0 12.4,-4.0 7.6,10.5 -7.6,10.5 -12.4,-4.0';
const RIM = [
  '0.0,-33.0 -13.3,-42.7 -8.2,-58.3 8.2,-58.3 13.3,-42.7',
  '31.4,-10.2 36.5,-25.9 52.9,-25.9 58.0,-10.2 44.7,-0.5',
  '19.4,26.7 35.9,26.7 40.9,42.4 27.6,52.0 14.3,42.4',
  '-19.4,26.7 -14.3,42.4 -27.6,52.0 -40.9,42.4 -35.9,26.7',
  '-31.4,-10.2 -44.7,-0.5 -58.0,-10.2 -52.9,-25.9 -36.5,-25.9',
];
const SEAMS =
  'M0.0 -13.0L0.0 -33.0M12.4 -4.0L31.4 -10.2M7.6 10.5L19.4 26.7M-7.6 10.5L-19.4 26.7M-12.4 -4.0L-31.4 -10.2M0.0 -33.0Q-12.4 -38.0 -27.6 -38.0M0.0 -33.0Q12.4 -38.0 27.6 -38.0M31.4 -10.2Q32.4 -23.5 27.6 -38.0M31.4 -10.2Q40.0 0.0 44.7 14.5M19.4 26.7Q32.4 23.5 44.7 14.5M19.4 26.7Q12.4 38.0 0.0 47.0M-19.4 26.7Q-12.4 38.0 0.0 47.0M-19.4 26.7Q-32.4 23.5 -44.7 14.5M-31.4 -10.2Q-40.0 0.0 -44.7 14.5M-31.4 -10.2Q-32.4 -23.5 -27.6 -38.0';

function BallCore() {
  return (
    <Svg width={BALL} height={BALL} viewBox="-50 -50 100 100">
      <Defs>
        <RadialGradient id="ball-shade" cx="38%" cy="32%" r="75%">
          <Stop offset="0" stopColor="#ffffff" />
          <Stop offset="0.55" stopColor="#eef1ea" />
          <Stop offset="1" stopColor="#b9c2b6" />
        </RadialGradient>
        <ClipPath id="ball-clip">
          <Circle r="46" />
        </ClipPath>
      </Defs>
      <Circle r="46" fill="url(#ball-shade)" />
      <G clipPath="url(#ball-clip)">
        <Polygon points={CENTER} fill="#141a16" />
        {RIM.map((points) => (
          <Polygon key={points} points={points} fill="#141a16" />
        ))}
        <Path d={SEAMS} stroke="#141a16" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </G>
      <Circle r="46" fill="none" stroke="#10170f" strokeWidth="2.2" />
    </Svg>
  );
}

function BallGloss() {
  return (
    <Svg width={BALL} height={BALL} viewBox="-50 -50 100 100" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="ball-edge" cx="40%" cy="35%" r="70%">
          <Stop offset="0.6" stopColor="#000000" stopOpacity="0" />
          <Stop offset="1" stopColor="#0a1a10" stopOpacity="0.35" />
        </RadialGradient>
      </Defs>
      <Circle r="46" fill="url(#ball-edge)" />
      <Ellipse
        cx="-16"
        cy="-24"
        rx="14"
        ry="8"
        fill="#ffffff"
        opacity="0.4"
        rotation="-30"
        origin="-16, -24"
      />
    </Svg>
  );
}

/** A football bouncing on the grass: squashes on landing, spins in the air, shadow follows the height. */
export function BallLoader() {
  const reduced = useReducedMotion();
  const [clock] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (reduced) return;
    const bounce = Animated.loop(
      Animated.timing(clock, {
        toValue: 1,
        duration: PERIOD,
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      }),
    );
    const rotate = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: PERIOD,
        easing: Easing.linear,
        useNativeDriver: NATIVE,
      }),
    );
    bounce.start();
    rotate.start();
    return () => {
      bounce.stop();
      rotate.stop();
      clock.setValue(0);
      spin.setValue(0);
    };
  }, [clock, spin, reduced]);

  // Height follows a parabola between landing (10%) and the next landing (90%).
  const frames = useMemo(() => {
    const input: number[] = [0];
    const lift: number[] = [0];
    const steps = 16;
    for (let i = 0; i <= steps; i += 1) {
      const t = 0.1 + (0.8 * i) / steps;
      input.push(t);
      lift.push(-HEIGHT * (1 - ((t - 0.5) / 0.4) ** 2));
    }
    input.push(1);
    lift.push(0);
    return { input, lift };
  }, []);

  const translateY = clock.interpolate({ inputRange: frames.input, outputRange: frames.lift });
  const scaleY = clock.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [0.84, 1, 1, 0.84],
  });
  const scaleX = clock.interpolate({
    inputRange: [0, 0.1, 0.9, 1],
    outputRange: [1.14, 1, 1, 1.14],
  });
  const shadowScale = clock.interpolate({
    inputRange: frames.input,
    outputRange: frames.lift.map((y) => 1.1 - 0.6 * (-y / HEIGHT)),
  });
  const shadowOpacity = clock.interpolate({
    inputRange: frames.input,
    outputRange: frames.lift.map((y) => 0.6 - 0.4 * (-y / HEIGHT)),
  });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const dustOpacity = clock.interpolate({
    inputRange: [0, 0.08, 0.12, 0.36, 1],
    outputRange: [0, 0, 0.8, 0, 0],
  });
  const dustLift = clock.interpolate({
    inputRange: [0, 0.12, 0.36, 1],
    outputRange: [0, 0, -10, -10],
  });

  return (
    <View
      style={styles.scene}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <View style={styles.ground} />
      <Animated.View
        style={[styles.shadow, { opacity: shadowOpacity, transform: [{ scaleX: shadowScale }] }]}
      />
      <Animated.View
        style={[styles.dust, { opacity: dustOpacity, transform: [{ translateY: dustLift }] }]}
      >
        <View style={[styles.puff, { left: 0 }]} />
        <View style={[styles.puff, styles.puffSmall, { left: 15 }]} />
        <View style={[styles.puff, { right: 0 }]} />
      </Animated.View>
      <Animated.View
        style={[
          styles.ball,
          { transformOrigin: 'bottom', transform: [{ translateY }, { scaleX }, { scaleY }] },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <BallCore />
        </Animated.View>
        <BallGloss />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { width: 260, height: 190 },
  ground: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 30,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#2e4a38',
    opacity: 0.8,
  },
  shadow: {
    position: 'absolute',
    left: 102,
    bottom: 22,
    width: 56,
    height: 12,
    borderRadius: 28,
    backgroundColor: '#000000',
  },
  ball: { position: 'absolute', left: 98, bottom: 34, width: BALL, height: BALL },
  dust: { position: 'absolute', left: 112, bottom: 30, width: 36, height: 6 },
  puff: {
    position: 'absolute',
    bottom: 0,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4b7a5a',
  },
  puffSmall: { width: 5, height: 5, borderRadius: 3 },
});
