export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  primaryButton: string;
  primaryButtonText: string;
  accentText: string;
  focusRing: string;
  success: string;
  successText: string;
  warning: string;
  warningText: string;
  error: string;
  errorText: string;
  info: string;
  infoText: string;
};

export const themeTokens: Record<ThemeMode, ThemeColors> = {
  dark: {
    background: '#101510',
    surface: '#192119',
    surfaceRaised: '#222D22',
    textPrimary: '#FFFFFF',
    textSecondary: '#C3CDC0',
    textMuted: '#A9B6A7',
    border: '#405040',
    primaryButton: '#C7FF28',
    primaryButtonText: '#101510',
    accentText: '#C7FF28',
    focusRing: '#C7FF28',
    success: '#173D2A',
    successText: '#9BE7B4',
    warning: '#493A16',
    warningText: '#FFD980',
    error: '#4A2020',
    errorText: '#FFB4A9',
    info: '#1D3548',
    infoText: '#A9D7FF',
  },
  light: {
    background: '#F7F9F2',
    surface: '#FFFFFF',
    surfaceRaised: '#EDF2E6',
    textPrimary: '#101510',
    textSecondary: '#4C584C',
    textMuted: '#4C584C',
    border: '#CBD5C6',
    primaryButton: '#C7FF28',
    primaryButtonText: '#101510',
    accentText: '#547100',
    focusRing: '#516B00',
    success: '#E2F4E8',
    successText: '#1D6637',
    warning: '#FFF2D2',
    warningText: '#6F4A00',
    error: '#FCE7E4',
    errorText: '#9D2921',
    info: '#E5F1FA',
    infoText: '#245B82',
  },
};
