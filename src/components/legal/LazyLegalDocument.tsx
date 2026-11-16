import { lazy, Suspense } from 'react';
import { View } from 'react-native';

import type { LegalKind } from '@/legal/legal-content';

// The legal texts are long; they load only when one of these pages is opened.
const LegalDocument = lazy(() =>
  import('./LegalDocument').then((module) => ({ default: module.LegalDocument })),
);

export function LazyLegalDocument({ kind }: { kind: LegalKind }) {
  return (
    <Suspense fallback={<View accessibilityRole="progressbar" />}>
      <LegalDocument kind={kind} />
    </Suspense>
  );
}
