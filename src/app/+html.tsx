import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const responsiveStyles = `
  @media (max-width: 759px) {
    #page-shell { padding-right: 20px !important; padding-left: 20px !important; }
    #landing-hero {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 44px !important;
      min-height: 0 !important;
      padding-top: 58px !important;
      padding-bottom: 48px !important;
    }
    #hero-title { font-size: 72px !important; line-height: 70px !important; }
    #hero-line { font-size: 44px !important; line-height: 46px !important; }
    #section-title { font-size: 38px !important; line-height: 42px !important; }
    #steps { flex-direction: column !important; }
    #steps > div { border-right-width: 0 !important; border-bottom: 1px solid var(--app-border, #283328) !important; }
  }
  @media (max-width: 599px) {
    #design-review-shell { padding-right: 16px !important; padding-left: 16px !important; }
  }
  #app-tablet-nav, #app-mobile-nav { display: none; }
  @media (max-width: 1023px) {
    #app-sidebar { display: none !important; }
    #app-tablet-nav { display: flex !important; }
  }
  @media (max-width: 599px) {
    #app-tablet-nav { display: none !important; }
    #app-mobile-nav { position: fixed !important; z-index: 20; right: 0; bottom: 0; left: 0; display: flex !important; padding-bottom: max(env(safe-area-inset-bottom), 8px); }
  }
`;

export default function RootHtml({ children }: PropsWithChildren) {
  const { headNodes, bodyNodes, htmlAttributes, bodyAttributes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <ScrollViewStyleReset />
        <style>{responsiveStyles}</style>
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
