import { Platform } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  Polygon,
  RadialGradient,
  Stop,
} from 'react-native-svg';

type FootballBallProps = {
  size: number;
  variant?: 'auth' | 'demo';
  glow?: boolean;
};

const AUTH_PANELS = [
  '0,-5.5 3.6,-8.1 2.2,-12.4 -2.2,-12.4 -3.6,-8.1',
  '5.2,-1.7 8.8,0.9 12.5,-1.7 11.1,-6 6.6,-6',
  '3.2,4.4 1.8,8.7 5.5,11.4 9.1,8.7 7.7,4.4',
  '-3.2,4.4 -7.7,4.4 -9.1,8.7 -5.5,11.4 -1.8,8.7',
  '-5.2,-1.7 -6.6,-6 -11.1,-6 -12.5,-1.7 -8.8,0.9',
  '0,-3.7 3.52,-1.14 2.18,2.99 -2.18,2.99 -3.52,-1.14',
];

const DEMO_PANELS = [
  '0,-4.90 -3.23,-7.25 -2,-11.05 2,-11.05 3.23,-7.25',
  '4.66,-1.51 5.90,-5.32 9.89,-5.32 11.13,-1.51 7.89,0.84',
  '2.88,3.96 6.88,3.96 8.11,7.77 4.88,10.11 1.65,7.77',
  '-2.88,3.96 -1.65,7.77 -4.88,10.11 -8.11,7.77 -6.88,3.96',
  '-4.66,-1.51 -7.89,0.84 -11.13,-1.51 -9.89,-5.32 -5.90,-5.32',
  '0,-3.30 3.14,-1.02 1.94,2.67 -1.94,2.67 -3.14,-1.02',
];

export function FootballBall({ size, variant = 'auth', glow = true }: FootballBallProps) {
  const isAuth = variant === 'auth';
  const radius = isAuth ? 9 : 8;
  const panels = isAuth ? AUTH_PANELS : DEMO_PANELS;
  const clipId = isAuth ? 'auth-football-clip' : 'demo-football-clip';

  return (
    <Svg
      {...(Platform.OS === 'web'
        ? {}
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: 'no-hide-descendants' as const,
          })}
      height={size}
      viewBox="-10 -10 20 20"
      width={size}
    >
      <Defs>
        <ClipPath id={clipId}>
          <Circle r={radius} />
        </ClipPath>
        {glow ? (
          <RadialGradient id="football-ball-glow">
            <Stop offset="0" stopColor="#cfff4a" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#cfff4a" stopOpacity="0" />
          </RadialGradient>
        ) : null}
      </Defs>
      {glow ? <Circle r={isAuth ? 12 : 11} fill="url(#football-ball-glow)" /> : null}
      {variant === 'demo' ? <EllipseShadow /> : null}
      <Circle r={radius} fill="#ffffff" />
      <G clipPath={`url(#${clipId})`} fill="#111111">
        {panels.map((points) => (
          <Polygon key={points} points={points} />
        ))}
      </G>
      {isAuth ? (
        <G stroke="#111111" strokeWidth={1.1} strokeLinecap="round">
          <Line x1={0} y1={-3.7} x2={0} y2={-5.5} />
          <Line x1={3.52} y1={-1.14} x2={5.2} y2={-1.7} />
          <Line x1={2.18} y1={2.99} x2={3.2} y2={4.4} />
          <Line x1={-2.18} y1={2.99} x2={-3.2} y2={4.4} />
          <Line x1={-3.52} y1={-1.14} x2={-5.2} y2={-1.7} />
        </G>
      ) : (
        <G stroke="#111111" strokeWidth={1} strokeLinecap="round">
          <Line x1={0} y1={-3.3} x2={0} y2={-5.6} />
          <Line x1={3.14} y1={-1.02} x2={5.33} y2={-1.73} />
          <Line x1={1.94} y1={2.67} x2={3.29} y2={4.53} />
          <Line x1={-1.94} y1={2.67} x2={-3.29} y2={4.53} />
          <Line x1={-3.14} y1={-1.02} x2={-5.33} y2={-1.73} />
        </G>
      )}
      <Circle r={radius} fill="none" stroke="#111111" strokeWidth={isAuth ? 1.3 : 1.2} />
    </Svg>
  );
}

function EllipseShadow() {
  return <Ellipse cx={1.5} cy={8.5} rx={7.5} ry={2.6} fill="#0c1210" opacity={0.35} />;
}
