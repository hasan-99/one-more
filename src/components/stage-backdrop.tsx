import { Animated, Easing, StyleSheet, View, type DimensionValue } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useLoop } from '@/components/motion';
import type { ThemeColors } from '@/theme/tokens';

const sparks: {
  left: DimensionValue;
  size: number;
  lime: boolean;
  duration: number;
  delay: number;
}[][] = [
  [
    { left: '14%', size: 4, lime: true, duration: 7000, delay: 0 },
    { left: '30%', size: 3, lime: false, duration: 9000, delay: 2000 },
    { left: '70%', size: 4, lime: true, duration: 8000, delay: 1000 },
    { left: '86%', size: 3, lime: false, duration: 10000, delay: 3500 },
  ],
  [
    { left: '12%', size: 4, lime: true, duration: 8000, delay: 0 },
    { left: '28%', size: 3, lime: false, duration: 10000, delay: 2500 },
    { left: '72%', size: 4, lime: true, duration: 9000, delay: 1200 },
    { left: '88%', size: 3, lime: false, duration: 11000, delay: 4000 },
  ],
];

/**
 * Floodlit stage behind hero areas: radial pitch glow, two swaying light beams
 * (reference `.st-beam`) and rising sparks (`.st-dot`). Purely decorative.
 */
export function StageBackdrop({
  id,
  colors,
  height,
  glowY = '108%',
  glowStop = 0.62,
  glowColor = '#1f3a28',
  rise = 240,
  variant = 0,
  beamWidth = 220,
}: {
  id: string;
  colors: ThemeColors;
  height: number | `${number}%`;
  glowY?: `${number}%`;
  glowStop?: number;
  glowColor?: string;
  rise?: number;
  variant?: 0 | 1;
  beamWidth?: number;
}) {
  const dark = colors.background === '#0C1210';
  const left = useLoop(7000, { alternate: true });
  const right = useLoop(9000, { alternate: true });
  const beamHeight = typeof height === 'number' ? height * 1.3 : 520;
  const pivot = (value: Animated.Value, from: string, to: string) => [
    { translateY: -beamHeight / 2 },
    { rotate: value.interpolate({ inputRange: [0, 1], outputRange: [from, to] }) },
    { translateY: beamHeight / 2 },
  ];
  return (
    <View pointerEvents="none" style={[styles.root, { height }]}>
      <Svg width="100%" height="100%" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id={`${id}-glow`}
            cx="50%"
            cy={glowY}
            rx="80%"
            ry="100%"
            fx="50%"
            fy={glowY}
          >
            <Stop offset="0" stopColor={dark ? glowColor : colors.pitch} />
            <Stop offset={glowStop} stopColor={colors.background} />
            <Stop offset="1" stopColor={colors.background} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id}-glow)`} />
      </Svg>
      <Animated.View
        style={[
          styles.beam,
          {
            left: -90,
            width: beamWidth,
            height: beamHeight,
            transform: pivot(left, '-16deg', '-30deg'),
          },
        ]}
      >
        <Beam id={`${id}-beam-l`} opacity={dark ? 0.23 : 0.5} />
      </Animated.View>
      <Animated.View
        style={[
          styles.beam,
          {
            right: -90,
            width: beamWidth,
            height: beamHeight,
            transform: pivot(right, '30deg', '16deg'),
          },
        ]}
      >
        <Beam id={`${id}-beam-r`} opacity={dark ? 0.2 : 0.45} />
      </Animated.View>
      {sparks[variant].map((dot) => (
        <Spark
          key={String(dot.left)}
          left={dot.left}
          size={dot.size}
          duration={dot.duration}
          delay={dot.delay}
          rise={rise}
          color={dot.lime ? colors.primaryButton : colors.textPrimary}
        />
      ))}
    </View>
  );
}

function Beam({ id, opacity }: { id: string; opacity: number }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 220 400" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#deff96" stopOpacity={opacity} />
          <Stop offset="0.75" stopColor="#deff96" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      <Polygon points="101,0 119,0 220,400 0,400" fill={`url(#${id})`} />
    </Svg>
  );
}

function Spark({
  left,
  size,
  color,
  duration,
  delay,
  rise,
}: {
  left: DimensionValue;
  size: number;
  color: string;
  duration: number;
  delay: number;
  rise: number;
}) {
  const progress = useLoop(duration, { delay, easing: Easing.linear });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: -10,
        left,
        width: size,
        height: size,
        borderRadius: size,
        backgroundColor: color,
        opacity: progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.8, 0] }),
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] }) },
        ],
      }}
    />
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  beam: { position: 'absolute', top: -20 },
});
