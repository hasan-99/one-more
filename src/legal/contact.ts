// Publisher details shown on the legal pages. Set them for every release build:
//   EXPO_PUBLIC_SUPPORT_EMAIL     monitored support / privacy mailbox (required by both stores)
//   EXPO_PUBLIC_DEVELOPER_NAME    legal name of the person or company that publishes the app
//   EXPO_PUBLIC_DEVELOPER_ADDRESS postal address (required by Apple for apps with accounts in some regions)
export const supportEmail = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() || null;
export const developerName = process.env.EXPO_PUBLIC_DEVELOPER_NAME?.trim() || 'ONE MORE';
export const developerAddress = process.env.EXPO_PUBLIC_DEVELOPER_ADDRESS?.trim() || null;
export const legalUpdated = '2026-11-18';
