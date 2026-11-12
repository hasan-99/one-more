import { describe, expect, it } from 'vitest';

import { themeTokens, type ThemeColors } from './tokens';

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((part) => parseInt(part, 16) / 255);
  const linear = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function assertPair(
  colors: ThemeColors,
  foreground: keyof ThemeColors,
  background: keyof ThemeColors,
  minimum = 4.5,
) {
  expect(contrast(colors[foreground], colors[background])).toBeGreaterThanOrEqual(minimum);
}

describe('semantic theme contrast', () => {
  for (const [mode, colors] of Object.entries(themeTokens)) {
    it(`${mode} theme meets WCAG AA for core text, actions and status labels`, () => {
      assertPair(colors, 'textPrimary', 'background');
      assertPair(colors, 'textSecondary', 'background');
      assertPair(colors, 'textMuted', 'background');
      assertPair(colors, 'textPrimary', 'surface');
      assertPair(colors, 'textPrimary', 'surfaceRaised');
      assertPair(colors, 'primaryButtonText', 'primaryButton');
      assertPair(colors, 'accentText', 'background');
      assertPair(colors, 'successText', 'success');
      assertPair(colors, 'warningText', 'warning');
      assertPair(colors, 'errorText', 'error');
      assertPair(colors, 'infoText', 'info');
    });
  }
});
