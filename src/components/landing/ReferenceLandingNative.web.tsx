// The native landing screen renders an embedded HTML page in a WebView. The web build has its own
// landing (see `src/app/index.tsx`), so this empty stand-in keeps that HTML and the WebView
// wrapper out of the web bundle.
export function ReferenceLandingNative() {
  return null;
}
