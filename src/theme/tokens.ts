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
  pitch: string;
  pitchLine: string;
  pitchText: string;
  pitchMarkerBorder: string;
};

export const themeTokens: Record<ThemeMode, ThemeColors> = {
  dark: {
    background: '#0C1210',
    surface: '#16241C',
    surfaceRaised: '#1C2A21',
    textPrimary: '#F2F5EC',
    textSecondary: '#B9C4B4',
    textMuted: '#9EAA9E',
    border: '#2A3D31',
    primaryButton: '#CFFF4A',
    primaryButtonText: '#0C1210',
    accentText: '#CFFF4A',
    focusRing: '#CFFF4A',
    success: '#173D2A',
    successText: '#9BE7B4',
    warning: '#493A16',
    warningText: '#FFD980',
    error: '#4A2020',
    errorText: '#FFB4A9',
    info: '#1D3548',
    infoText: '#A9D7FF',
    pitch: '#27402F',
    pitchLine: '#6F9A7C',
    pitchText: '#F2F5EC',
    pitchMarkerBorder: '#0C1210',
  },
  light: {
    background: '#F7F9F2',
    surface: '#FFFFFF',
    surfaceRaised: '#EDF2E6',
    textPrimary: '#101510',
    textSecondary: '#4C584C',
    textMuted: '#4C584C',
    border: '#CBD5C6',
    primaryButton: '#CFFF4A',
    primaryButtonText: '#0C1210',
    accentText: '#3D5A00',
    focusRing: '#3D5A00',
    success: '#E2F4E8',
    successText: '#1D6637',
    warning: '#FFF2D2',
    warningText: '#6F4A00',
    error: '#FCE7E4',
    errorText: '#9D2921',
    info: '#E5F1FA',
    infoText: '#245B82',
    pitch: '#E4F0DF',
    pitchLine: '#718A70',
    pitchText: '#263D28',
    pitchMarkerBorder: '#263D28',
  },
};
