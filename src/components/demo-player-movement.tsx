import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { FootballBall } from '@/components/football-ball';

type DemoLabels = {
  goalkeeper: string;
  defender: string;
  midfielder: string;
  playerMidfielder: string;
  striker: string;
  placeTaken: string;
  goal: string;
  pitchAccessibility: string;
};

type DemoPlayerMovementProps = {
  accent: string;
  accentText: string;
  opponent: string;
  opponentText: string;
  labels: DemoLabels;
  reduceMotion: boolean;
  onPlaceTakenChange: (taken: boolean) => void;
};

const FIELD = { width: 340, height: 220 };
const PLAYERS = [
  { x: 28, y: 110, team: 'home', role: 'goalkeeper' },
  { x: 80, y: 66, team: 'home', role: 'defender' },
  { x: 80, y: 154, team: 'home', role: 'defender' },
  { x: 205, y: 88, team: 'home', role: 'striker' },
  { x: 312, y: 110, team: 'away', role: 'goalkeeper' },
  { x: 262, y: 66, team: 'away', role: 'defender' },
  { x: 262, y: 154, team: 'away', role: 'defender' },
  { x: 222, y: 112, team: 'away', role: 'midfielder' },
] as const;

const FORMATION_POINTS = [
  [28, 110],
  [80, 66],
  [80, 154],
  [205, 88],
  [150, 110],
  [312, 110],
  [262, 66],
  [262, 154],
  [222, 112],
  [196, 156],
] as const;

const CONNECTIONS = [
  [0, 1],
  [0, 2],
  [1, 2],
  [1, 4],
  [2, 4],
  [4, 3],
  [5, 6],
  [5, 7],
  [6, 7],
  [6, 8],
  [7, 8],
  [8, 9],
  [4, 8],
  [3, 9],
] as const;

const BALL_FRAMES = [
  [0, 38, 112, 1],
  [14, 38, 112, 1],
  [22, 90, 68, 1],
  [26, 90, 68, 1],
  [36, 160, 112, 1],
  [40, 160, 112, 1],
  [48, 186, 106, 1],
  [58, 270, 98, 1],
  [62, 270, 98, 1],
  [68, 336, 106, 1],
  [70, 338, 106, 0],
  [95, 38, 112, 0],
  [98, 38, 112, 1],
  [100, 38, 112, 1],
] as const;

const BALL_SPIN_FRAMES = [
  [0, 0, 1],
  [14, 0, 1],
  [18, 200, 1.35],
  [22, 360, 1],
  [26, 360, 1],
  [36, 720, 1],
  [40, 720, 1],
  [48, 900, 1],
  [53, 1200, 1.4],
  [58, 1440, 1],
  [62, 1440, 1],
  [68, 2200, 1],
  [100, 2200, 1],
] as const;

const PLAYER_MOTION = [
  { input: [0, 12, 15, 20, 55, 100], x: [0, 0, 5, 0, 8, 0], y: [0, 0, 0, 0, -4, 0] },
  { input: [0, 22, 25, 60, 80, 100], x: [0, 0, 4, 4, 30, 0], y: [0, 0, 2, 2, 6, 0] },
  { input: [0, 20, 60, 80, 100], x: [0, 0, 40, 40, 0], y: [0, 0, -14, -14, 0] },
  {
    input: [0, 30, 46, 58, 62, 65, 72, 76, 80, 84, 96, 100],
    x: [0, -5, -2, 56, 56, 60, 60, 56, 60, 56, 0, 0],
    y: [0, 6, 4, 8, 8, 9, -3, 9, 1, 9, 0, 0],
  },
  { input: [0, 30, 60, 68, 82, 94, 100], x: [0, 0, 0, -2, -2, 0, 0], y: [0, 6, 0, -22, -22, 0, 0] },
  { input: [0, 30, 48, 58, 76, 94, 100], x: [0, -10, -6, 6, 6, 0, 0], y: [0, 6, 14, 20, 20, 0, 0] },
  { input: [0, 40, 58, 76, 94, 100], x: [0, -14, -2, -2, 0, 0], y: [0, -10, -26, -26, 0, 0] },
  {
    input: [0, 14, 26, 36, 48, 58, 76, 94, 100],
    x: [0, 0, -18, -30, -26, 4, 4, 0, 0],
    y: [0, 0, 2, 10, 14, 6, 6, 0, 0],
  },
] as const;

const MIDFIELDER_FILL = {
  input: [0, 11, 13, 16, 48, 70, 88, 95, 100],
  x: [0, 0, 0, 0, 26, 34, 0, 0, 0],
  y: [0, 0, 0, 0, -6, -8, 0, 0, 0],
  opacity: [0, 0, 1, 1, 1, 1, 1, 0, 0],
} as const;

const OPEN_SLOT_OPACITY = {
  input: [0, 9, 11, 93, 97, 100],
  output: [1, 1, 0, 0, 1, 1],
} as const;

export function DemoPlayerMovement({
  accent,
  accentText,
  opponent,
  opponentText,
  labels,
  reduceMotion,
  onPlaceTakenChange,
}: DemoPlayerMovementProps) {
  const [progress] = useState(() => new Animated.Value(0));
  const [fieldSize, setFieldSize] = useState({ width: 0, height: 0 });
  const scaleX = fieldSize.width / FIELD.width;
  const scaleY = fieldSize.height / FIELD.height;
  const playerScale = Math.min(scaleX, scaleY);

  useEffect(() => {
    if (reduceMotion) {
      progress.stopAnimation();
      progress.setValue(0);
      onPlaceTakenChange(false);
      return;
    }

    const animation = Animated.loop(
      Animated.timing(progress, { toValue: 100, duration: 10_000, useNativeDriver: false }),
    );
    animation.start();

    let fillTimer: ReturnType<typeof setTimeout>;
    let resetTimer: ReturnType<typeof setTimeout>;
    const startCycle = () => {
      onPlaceTakenChange(false);
      fillTimer = setTimeout(() => onPlaceTakenChange(true), 1_100);
      resetTimer = setTimeout(() => onPlaceTakenChange(false), 9_500);
    };
    startCycle();
    const cycleTimer = setInterval(startCycle, 10_000);
    return () => {
      animation.stop();
      clearInterval(cycleTimer);
      clearTimeout(fillTimer);
      clearTimeout(resetTimer);
    };
  }, [onPlaceTakenChange, progress, reduceMotion]);

  const ballStyle = useMemo(
    () => ({
      left: progress.interpolate({
        inputRange: BALL_FRAMES.map(([at]) => at),
        outputRange: BALL_FRAMES.map(([, x]) => x * scaleX - 10 * playerScale),
      }),
      top: progress.interpolate({
        inputRange: BALL_FRAMES.map(([at]) => at),
        outputRange: BALL_FRAMES.map(([, , y]) => y * scaleY - 10 * playerScale),
      }),
      opacity: progress.interpolate({
        inputRange: BALL_FRAMES.map(([at]) => at),
        outputRange: BALL_FRAMES.map(([, , , opacity]) => opacity),
      }),
      transform: [
        {
          rotate: progress.interpolate({
            inputRange: BALL_SPIN_FRAMES.map(([at]) => at),
            outputRange: BALL_SPIN_FRAMES.map(([, degrees]) => `${degrees}deg`),
          }),
        },
        {
          scale: progress.interpolate({
            inputRange: BALL_SPIN_FRAMES.map(([at]) => at),
            outputRange: BALL_SPIN_FRAMES.map(([, , scale]) => scale),
          }),
        },
      ],
    }),
    [playerScale, progress, scaleX, scaleY],
  );

  const goalOpacity = progress.interpolate({
    inputRange: [0, 67, 69, 71, 91, 94, 100],
    outputRange: [0, 0, 0.95, 1, 1, 0, 0],
  });

  const fillX = progress.interpolate({
    inputRange: MIDFIELDER_FILL.input,
    outputRange: MIDFIELDER_FILL.x.map((value) => value * scaleX),
  });
  const fillY = progress.interpolate({
    inputRange: MIDFIELDER_FILL.input,
    outputRange: MIDFIELDER_FILL.y.map((value) => value * scaleY),
  });

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={labels.pitchAccessibility}
      nativeID="demo-formation"
      onLayout={({ nativeEvent }) =>
        setFieldSize({
          width: nativeEvent.layout.width,
          height: nativeEvent.layout.height,
        })
      }
      pointerEvents="none"
      style={styles.formation}
    >
      {CONNECTIONS.map(([fromIndex, toIndex], index) => {
        const [x1, y1] = FORMATION_POINTS[fromIndex];
        const [x2, y2] = FORMATION_POINTS[toIndex];
        const px1 = x1 * scaleX;
        const py1 = y1 * scaleY;
        const px2 = x2 * scaleX;
        const py2 = y2 * scaleY;
        const length = Math.hypot(px2 - px1, py2 - py1);
        const angle = (Math.atan2(py2 - py1, px2 - px1) * 180) / Math.PI;
        const homeLink = toIndex < 5 && fromIndex < 5;
        return (
          <View
            key={`${fromIndex}-${toIndex}`}
            nativeID={`demo-connection-${index + 1}`}
            style={[
              styles.connection,
              {
                left: (px1 + px2 - length) / 2,
                top: (py1 + py2) / 2,
                width: length,
                backgroundColor: homeLink ? accent : opponent,
                opacity: homeLink ? 0.48 : 0.36,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}

      {PLAYERS.map((player, index) => {
        const motion = PLAYER_MOTION[index]!;
        const xOffset = progress.interpolate({
          inputRange: [...motion.input],
          outputRange: motion.x.map((value) => value * scaleX),
        });
        const yOffset = progress.interpolate({
          inputRange: [...motion.input],
          outputRange: motion.y.map((value) => value * scaleY),
        });
        return (
          <Animated.View
            key={index}
            nativeID={`demo-starting-player-${index + 1}`}
            style={[
              styles.player,
              {
                left: player.x * scaleX - 10 * playerScale,
                top: player.y * scaleY - 10 * playerScale,
                width: 20 * playerScale,
                height: 20 * playerScale,
                borderRadius: 10 * playerScale,
                backgroundColor: player.team === 'home' ? accent : opponent,
              },
              { transform: [{ translateX: xOffset }, { translateY: yOffset }] },
            ]}
          >
            <Text
              style={[
                styles.role,
                {
                  color: player.team === 'home' ? accentText : opponentText,
                  fontSize: Math.max(6, 8 * playerScale),
                },
              ]}
            >
              {player.role === 'midfielder' ? labels.playerMidfielder : labels[player.role]}
            </Text>
          </Animated.View>
        );
      })}

      <Animated.View
        nativeID="demo-open-slot"
        style={[
          styles.openSlot,
          {
            left: 150 * scaleX - 10 * playerScale,
            top: 110 * scaleY - 10 * playerScale,
            width: 20 * playerScale,
            height: 20 * playerScale,
            borderRadius: 10 * playerScale,
            opacity: progress.interpolate({
              inputRange: [...OPEN_SLOT_OPACITY.input],
              outputRange: [...OPEN_SLOT_OPACITY.output],
            }),
          },
        ]}
      >
        <View style={[styles.openSlotRing, { borderColor: accent }]} />
        <Text
          style={[styles.openSlotText, { color: accent, fontSize: Math.max(9, 12 * playerScale) }]}
        >
          +
        </Text>
      </Animated.View>

      <View
        nativeID="demo-open-slot-secondary"
        style={[
          styles.openSlot,
          {
            left: 196 * scaleX - 10 * playerScale,
            top: 156 * scaleY - 10 * playerScale,
            width: 20 * playerScale,
            height: 20 * playerScale,
            borderRadius: 10 * playerScale,
            borderColor: opponent,
          },
        ]}
      >
        <Text
          style={[
            styles.openSlotText,
            { color: opponent, fontSize: Math.max(9, 12 * playerScale) },
          ]}
        >
          +
        </Text>
      </View>

      <Animated.View
        nativeID="demo-player-filled"
        style={[
          styles.player,
          styles.filledPlayer,
          {
            left: 150 * scaleX - 10 * playerScale,
            top: 110 * scaleY - 10 * playerScale,
            width: 20 * playerScale,
            height: 20 * playerScale,
            borderRadius: 10 * playerScale,
            backgroundColor: accent,
            opacity: progress.interpolate({
              inputRange: [...MIDFIELDER_FILL.input],
              outputRange: [...MIDFIELDER_FILL.opacity],
            }),
            transform: [{ translateX: fillX }, { translateY: fillY }],
          },
        ]}
      >
        <Text style={[styles.role, { color: accentText, fontSize: Math.max(6, 8 * playerScale) }]}>
          {labels.playerMidfielder}
        </Text>
      </Animated.View>

      <Animated.View
        nativeID="demo-pass-trail-outer"
        style={[
          styles.ballTrail,
          ballStyle,
          { width: 20 * playerScale, height: 20 * playerScale, borderRadius: 10 * playerScale },
        ]}
      >
        <Svg height="100%" width="100%" viewBox="0 0 20 20">
          <Circle cx="10" cy="10" r="5" fill="#ffffff" fillOpacity={0.2} />
        </Svg>
      </Animated.View>
      <Animated.View
        nativeID="demo-pass-trail-inner"
        style={[
          styles.ballTrail,
          ballStyle,
          { width: 20 * playerScale, height: 20 * playerScale, borderRadius: 10 * playerScale },
        ]}
      >
        <Svg height="100%" width="100%" viewBox="0 0 20 20">
          <Circle cx="10" cy="10" r="6.5" fill="#ffffff" fillOpacity={0.4} />
        </Svg>
      </Animated.View>
      <Animated.View
        nativeID="demo-pass-pulse"
        testID="demo-pass-pulse"
        style={[
          styles.ballGlow,
          ballStyle,
          { width: 20 * playerScale, height: 20 * playerScale, borderRadius: 10 * playerScale },
        ]}
      >
        <FootballBall size={20 * playerScale} variant="demo" />
      </Animated.View>

      <Animated.View
        nativeID="demo-goal-highlight"
        style={[
          styles.goalHighlight,
          {
            right: 0,
            top: 86 * scaleY,
            width: 10 * scaleX,
            height: 48 * scaleY,
            borderColor: opponent,
            backgroundColor: accent,
            opacity: goalOpacity,
          },
        ]}
      />
      <Animated.Text
        nativeID="demo-goal-callout"
        style={[
          styles.goalCallout,
          {
            left: 262 * scaleX,
            top: 42 * scaleY,
            color: accent,
            opacity: goalOpacity,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 68, 71, 74, 83, 100],
                  outputRange: [8, 8, 0, -2, -14, -14].map((value) => value * scaleY),
                }),
              },
              {
                scale: progress.interpolate({
                  inputRange: [0, 68, 71, 74, 83, 100],
                  outputRange: [0.6, 0.6, 1.2, 1, 1, 1],
                }),
              },
            ],
          },
        ]}
      >
        {labels.goal}
      </Animated.Text>

      <Animated.View
        nativeID="demo-pitch-chip"
        style={[
          styles.chip,
          {
            left: 96 * scaleX,
            top: 40 * scaleY,
            backgroundColor: accent,
            opacity: progress.interpolate({
              inputRange: [0, 9, 11, 93, 97, 100],
              outputRange: [1, 1, 0, 0, 1, 1],
            }),
          },
        ]}
      >
        <Text
          style={[styles.chipText, { color: accentText, fontSize: Math.max(8, 11 * playerScale) }]}
        >
          {labels.midfielder}
        </Text>
      </Animated.View>
      <Animated.View
        nativeID="demo-place-taken-chip"
        style={[
          styles.chip,
          {
            left: 96 * scaleX,
            top: 40 * scaleY,
            backgroundColor: opponent,
            opacity: progress.interpolate({
              inputRange: [0, 11, 14, 91, 94, 100],
              outputRange: [0, 0, 1, 1, 0, 0],
            }),
          },
        ]}
      >
        <Text
          style={[
            styles.chipText,
            { color: opponentText, fontSize: Math.max(8, 11 * playerScale) },
          ]}
        >
          {labels.placeTaken}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  formation: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  connection: { position: 'absolute', height: 1, marginTop: -0.5 },
  player: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CFFF4A',
    shadowOpacity: 0.26,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  role: { fontWeight: '800', lineHeight: 9, textAlign: 'center' },
  openSlot: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: '#0C1210',
  },
  openSlotRing: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1.5,
    borderRadius: 99,
  },
  openSlotText: { fontWeight: '700', lineHeight: 16 },
  filledPlayer: { borderWidth: 1.5, borderColor: '#FFFFFF', zIndex: 2 },
  ballGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CFFF4A',
    shadowOpacity: 0.88,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 7,
  },
  ballTrail: {
    position: 'absolute',
  },
  goalHighlight: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 2,
  },
  goalCallout: {
    position: 'absolute',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    fontFamily: 'BarlowCondensed_700Bold',
  },
  chip: {
    position: 'absolute',
    minHeight: 18,
    borderRadius: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontWeight: '600' },
});
