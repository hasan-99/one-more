import { View } from 'react-native';
import { ClipPath, Defs, G, Path, Rect, Svg, Text as SvgText } from 'react-native-svg';

import type {
  TeamCrestColor,
  TeamCrestEmblem,
  TeamCrestPattern,
  TeamCrestShape,
} from './team-service';

export const crestPaths: Record<TeamCrestShape, string> = {
  shield: 'M50 4 L92 18 V54 C92 82 72 98 50 106 C28 98 8 82 8 54 V18 Z',
  round: 'M50 9 A46 46 0 1 1 49.9 9 Z',
  hex: 'M50 5 L92 29 V81 L50 105 L8 81 V29 Z',
};

export const ink = '#0c1210';

export type CrestLook = {
  shape: TeamCrestShape;
  color: TeamCrestColor;
  pattern: TeamCrestPattern;
  emblem: TeamCrestEmblem;
};

/** Simple solid icons on a 24-unit grid, drawn instead of the initials. */
export const emblemPaths: Record<Exclude<TeamCrestEmblem, 'initials'>, string> = {
  ball: 'M12 2.5a9.5 9.5 0 1 0 .01 0ZM12 7.2l4 2.9-1.5 4.7h-5L8 10.1ZM12 2.5v4.7M20.6 9.3 16 10.1M17.4 19.2l-2.9-4.4M6.6 19.2l2.9-4.4M3.4 9.3l4.6.8',
  bolt: 'M13.5 2 4.5 13.5h6L9.5 22l10-12.5h-6.3Z',
  star: 'M12 2l3.1 6.6 7 .9-5.2 4.9 1.4 7L12 17.9 5.7 21.4l1.4-7L1.9 9.5l7-.9Z',
  crown: 'M2.5 8l4.8 4.2L12 4.5l4.7 7.7L21.5 8l-2 12h-15Z',
};

export const emblems: TeamCrestEmblem[] = ['initials', 'ball', 'bolt', 'star', 'crown'];

export const defaultLook: CrestLook = {
  shape: 'shield',
  color: '#cfff4a',
  pattern: 'plain',
  emblem: 'initials',
};
/** Style score: every choice that moves away from the plain default adds points (40 to 100). */
export function scoreOf(look: CrestLook) {
  return (
    40 +
    (look.shape !== defaultLook.shape ? 10 : 0) +
    (look.color !== defaultLook.color ? 10 : 0) +
    (look.pattern !== defaultLook.pattern ? 20 : 0) +
    (look.emblem !== defaultLook.emblem ? 20 : 0)
  );
}
export const scoreTiers = [
  { from: 100, label: 'teamWizardTierLegend' },
  { from: 80, label: 'teamWizardTierPro' },
  { from: 60, label: 'teamWizardTierClub' },
  { from: 0, label: 'teamWizardTierRookie' },
] as const;

export type CrestDesign = {
  color: TeamCrestColor;
  pattern: TeamCrestPattern;
  shape: TeamCrestShape;
  emblem?: TeamCrestEmblem;
  initials: string;
};

export function Crest({
  color,
  pattern,
  shape,
  emblem = 'initials',
  initials,
  size,
  label,
}: CrestDesign & { size: number; label?: string }) {
  const clipId = `team-crest-${size}-${shape}`;
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? 'image' : undefined}
      accessibilityLabel={label}
      style={{ width: size, height: size * 1.1 }}
    >
      <Svg width={size} height={size * 1.1} viewBox="0 0 100 110">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={crestPaths[shape]} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${clipId})`}>
          <Rect x="0" y="0" width="100" height="110" fill={color} />
          {pattern === 'stripes'
            ? [10, 28, 46, 64, 82].map((x) => (
                <Rect key={x} x={x} y="0" width="9" height="110" fill={ink} opacity={0.24} />
              ))
            : null}
          {pattern === 'half' ? (
            <Rect x="50" y="0" width="50" height="110" fill={ink} opacity={0.28} />
          ) : null}
          <Rect width="100" height="40" fill="#ffffff" opacity={0.16} />
        </G>
        <Path d={crestPaths[shape]} fill="none" stroke={ink} strokeWidth={3} />
        {emblem === 'initials' ? (
          <>
            <SvgText
              x="50"
              y="68"
              textAnchor="middle"
              fontSize="36"
              fontWeight="800"
              fontFamily="BarlowCondensed_800ExtraBold"
              stroke={color}
              strokeWidth={5}
              strokeLinejoin="round"
              fill={color}
            >
              {initials}
            </SvgText>
            <SvgText
              x="50"
              y="68"
              textAnchor="middle"
              fontSize="36"
              fontWeight="800"
              fontFamily="BarlowCondensed_800ExtraBold"
              fill={ink}
            >
              {initials}
            </SvgText>
          </>
        ) : (
          <G transform="translate(28 33) scale(1.85)">
            <Path
              d={emblemPaths[emblem]}
              fill={ink}
              stroke={color}
              strokeWidth={0.9}
              strokeLinejoin="round"
            />
          </G>
        )}
      </Svg>
    </View>
  );
}
