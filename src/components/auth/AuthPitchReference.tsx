import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const REFERENCE_BACKGROUND = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>
body{margin:0;background:#0c1210}
a{color:#cfff4a}a:hover{color:#e4ff8f}
.si-root{font-family:'Barlow',system-ui,sans-serif;color:#f2f5ec}
.si-display{font-family:'Barlow Condensed','Arial Narrow',sans-serif}

/* entrance */
.si-card{opacity:0;transform:translateY(28px) scale(.97);animation:si-card .9s cubic-bezier(.2,.9,.2,1) .5s forwards}
@keyframes si-card{to{opacity:1;transform:translateY(0) scale(1)}}
.si-fade{opacity:0;transform:translateY(12px);animation:si-in .7s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes si-in{to{opacity:1;transform:translateY(0)}}
.si-pop{animation:si-pop .8s cubic-bezier(.2,1.3,.3,1) .7s both}
@keyframes si-pop{0%{transform:scale(.3) rotate(-25deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}

/* fields and buttons */
.si-in{transition:border-color .2s ease, box-shadow .2s ease, background .2s ease}
.si-in:focus{outline:none;border-color:#cfff4a;box-shadow:0 0 0 4px rgba(207,255,74,.2);background:#0c1210}
.si-cta{position:relative;overflow:hidden;transition:transform .15s ease, box-shadow .25s ease}
.si-cta::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.6) 50%,transparent 65%);transform:translateX(-130%);animation:si-shine 3.8s ease-in-out 2.4s infinite}
@keyframes si-shine{0%{transform:translateX(-130%)}35%,100%{transform:translateX(130%)}}
.si-cta:hover{box-shadow:0 0 0 6px rgba(207,255,74,.2),0 10px 30px rgba(207,255,74,.25)}
.si-cta:active{transform:scale(.97)}
.si-cta:focus-visible,.si-pill:focus-visible,.si-link:focus-visible{outline:3px solid #f2f5ec;outline-offset:3px}

/* background: night pitch, floodlights, floating light, one long ball */
.bg-all{opacity:0;animation:bg-show 1.4s ease .1s forwards}
@keyframes bg-show{to{opacity:1}}
.bg-floor{animation:bg-floor 7s linear infinite}
@keyframes bg-floor{to{background-position:0 480px,0 480px,0 480px}}
.bg-beam{transform-origin:50% 0}
.bg-beam.l{animation:bg-swayl 8s ease-in-out infinite alternate}
.bg-beam.r{animation:bg-swayr 10s ease-in-out infinite alternate}
@keyframes bg-swayl{from{transform:rotate(-20deg)}to{transform:rotate(-36deg)}}
@keyframes bg-swayr{from{transform:rotate(36deg)}to{transform:rotate(20deg)}}
.bg-lamp{animation:bg-lamp 2.6s ease-in-out infinite alternate}
@keyframes bg-lamp{from{opacity:.65;transform:scale(.9)}to{opacity:1;transform:scale(1.15)}}
.bg-dot{position:absolute;bottom:-20px;border-radius:50%;opacity:0;animation:bg-rise var(--d,12s) linear var(--dl,0s) infinite}
@keyframes bg-rise{0%{transform:translate(0,0);opacity:0}12%{opacity:.85}80%{opacity:.5}100%{transform:translate(var(--sx,20px),-105vh);opacity:0}}
.bg-bx{animation:bg-bx 9s linear 2s infinite backwards}
.bg-by{animation:bg-by 9s linear 2s infinite backwards}
.bg-bs{animation:bg-bs 9s linear 2s infinite backwards}
@keyframes bg-bx{0%{transform:translateX(-60px)}55%,100%{transform:translateX(540px)}}
@keyframes bg-by{0%{transform:translateY(0);animation-timing-function:cubic-bezier(.2,.6,.4,1)}27.5%{transform:translateY(-80vh);animation-timing-function:cubic-bezier(.6,0,.8,.4)}55%,100%{transform:translateY(0)}}
@keyframes bg-bs{0%{transform:rotate(0deg)}55%,100%{transform:rotate(900deg)}}
.si-glow{animation:si-glow 9s ease-in-out infinite alternate}
@keyframes si-glow{from{transform:translate(-30px,-20px) scale(1)}to{transform:translate(40px,50px) scale(1.25)}}

@media (prefers-reduced-motion: reduce){
  .si-card,.si-fade,.si-pop{animation:none;opacity:1;transform:none}
  .bg-all{animation:none;opacity:1}
  .bg-floor,.bg-beam,.bg-lamp,.si-glow,.si-cta::after{animation:none}
  .bg-dot,.bg-bx{display:none}
}
</style></head><body><div class="si-root" style="position:relative;width:100%;max-width:480px;margin:0 auto;box-sizing:border-box;height:100vh;height:100dvh;min-height:600px;padding:18px;background:#0c1210;display:flex;align-items:center;justify-content:center;overflow:hidden"><div id="auth-bg-all" class="bg-all" aria-hidden="true" style="position:absolute;inset:0;overflow:hidden;pointer-events:none;background:linear-gradient(180deg,#070b09 0%,#0c1511 45%,#101c15 100%)">

    <div style="position:absolute;left:0;right:0;bottom:0;height:62%;perspective:420px;perspective-origin:50% 0%;overflow:hidden;-webkit-mask-image:linear-gradient(to bottom,transparent 0%,#000 55%);mask-image:linear-gradient(to bottom,transparent 0%,#000 55%)">
      <div class="bg-floor" style="position:absolute;left:-70%;right:-70%;bottom:-30px;height:960px;transform-origin:50% 100%;transform:rotateX(66deg);background-image:linear-gradient(90deg,transparent 0 24%,rgba(242,245,236,.3) 24% 24.5%,transparent 24.5% 75.5%,rgba(242,245,236,.3) 75.5% 76%,transparent 76%),repeating-linear-gradient(to bottom,transparent 0 474px,rgba(242,245,236,.32) 474px 480px),repeating-linear-gradient(to bottom,#13231a 0 60px,#1c3626 60px 120px);background-position:0 0,0 0,0 0"></div>
    </div>

    <div class="bg-beam l" style="position:absolute;left:-110px;top:-30px;width:260px;height:125%;background:linear-gradient(to bottom,rgba(222,255,150,.26),rgba(222,255,150,0) 72%);clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);filter:blur(5px);transform:rotate(-20deg)"></div>
    <div class="bg-beam r" style="position:absolute;right:-110px;top:-30px;width:260px;height:125%;background:linear-gradient(to bottom,rgba(222,255,150,.22),rgba(222,255,150,0) 72%);clip-path:polygon(46% 0,54% 0,100% 100%,0 100%);filter:blur(5px);transform:rotate(36deg)"></div>
    <span class="bg-lamp" style="position:absolute;left:12px;top:10px;width:10px;height:10px;border-radius:50%;background:#f4ffd0;box-shadow:0 0 24px 10px rgba(222,255,150,.55)"></span>
    <span class="bg-lamp" style="position:absolute;right:12px;top:10px;width:10px;height:10px;border-radius:50%;background:#f4ffd0;box-shadow:0 0 24px 10px rgba(222,255,150,.55);animation-delay:1.3s"></span>

    <div class="si-glow" style="position:absolute;left:10%;top:18%;width:280px;height:280px;border-radius:50%;background:radial-gradient(circle,rgba(207,255,74,.13),rgba(207,255,74,0) 70%)"></div>

    <span class="bg-dot" style="left:8%;width:5px;height:5px;background:#f2f5ec;box-shadow:0 0 10px rgba(242,245,236,.6);--d:13s;--dl:0s;--sx:18px"></span>
    <span class="bg-dot" style="left:22%;width:3px;height:3px;background:#cfff4a;box-shadow:0 0 6px rgba(207,255,74,.7);--d:10s;--dl:3s;--sx:-14px"></span>
    <span class="bg-dot" style="left:37%;width:6px;height:6px;background:#cfff4a;box-shadow:0 0 12px rgba(207,255,74,.7);--d:15s;--dl:6s;--sx:22px"></span>
    <span class="bg-dot" style="left:52%;width:3px;height:3px;background:#f2f5ec;box-shadow:0 0 6px rgba(242,245,236,.6);--d:11s;--dl:1.5s;--sx:-10px"></span>
    <span class="bg-dot" style="left:66%;width:5px;height:5px;background:#cfff4a;box-shadow:0 0 10px rgba(207,255,74,.7);--d:14s;--dl:8s;--sx:16px"></span>
    <span class="bg-dot" style="left:80%;width:4px;height:4px;background:#cfff4a;box-shadow:0 0 8px rgba(207,255,74,.7);--d:12s;--dl:4s;--sx:-20px"></span>
    <span class="bg-dot" style="left:92%;width:6px;height:6px;background:#f2f5ec;box-shadow:0 0 12px rgba(242,245,236,.6);--d:16s;--dl:9.5s;--sx:-12px"></span>
    <span class="bg-dot" style="left:14%;width:4px;height:4px;background:#cfff4a;box-shadow:0 0 8px rgba(207,255,74,.7);--d:17s;--dl:11s;--sx:12px"></span>
    <span class="bg-dot" style="left:60%;width:3px;height:3px;background:#cfff4a;box-shadow:0 0 6px rgba(207,255,74,.7);--d:9s;--dl:5s;--sx:8px"></span>
    <span class="bg-dot" style="left:74%;width:5px;height:5px;background:#f2f5ec;box-shadow:0 0 10px rgba(242,245,236,.6);--d:18s;--dl:13s;--sx:-16px"></span>

    <div class="bg-bx" style="position:absolute;left:0;bottom:10vh;animation-delay:2.16s"><div class="bg-by" style="animation-delay:2.16s"><div style="width:18px;height:18px;margin:8px;border-radius:50%;background:rgba(207,255,74,0.25);filter:blur(2px)"></div></div></div>
    <div class="bg-bx" style="position:absolute;left:0;bottom:10vh;animation-delay:2.08s"><div class="bg-by" style="animation-delay:2.08s"><div style="width:24px;height:24px;margin:5px;border-radius:50%;background:rgba(207,255,74,0.4);filter:blur(2px)"></div></div></div>
    <div class="bg-bx" style="position:absolute;left:0;bottom:10vh">
      <div class="bg-by">
        <div class="bg-bs" style="width:34px;height:34px;filter:drop-shadow(0 0 10px rgba(207,255,74,.55))">
            <svg width="34" height="34" viewBox="-10 -10 20 20" style="display:block">
              <clipPath id="si-bc"><circle r="9"></circle></clipPath>
              <circle r="9" fill="#ffffff"></circle>
              <g clip-path="url(#si-bc)" fill="#111111">
                <polygon points="0,-5.5 3.6,-8.1 2.2,-12.4 -2.2,-12.4 -3.6,-8.1"></polygon>
                <polygon points="5.2,-1.7 8.8,0.9 12.5,-1.7 11.1,-6 6.6,-6"></polygon>
                <polygon points="3.2,4.4 1.8,8.7 5.5,11.4 9.1,8.7 7.7,4.4"></polygon>
                <polygon points="-3.2,4.4 -7.7,4.4 -9.1,8.7 -5.5,11.4 -1.8,8.7"></polygon>
                <polygon points="-5.2,-1.7 -6.6,-6 -11.1,-6 -12.5,-1.7 -8.8,0.9"></polygon>
                <polygon points="0,-3.7 3.52,-1.14 2.18,2.99 -2.18,2.99 -3.52,-1.14"></polygon>
              </g>
              <g stroke="#111111" stroke-width="1.1" stroke-linecap="round"><line x1="0" y1="-3.7" x2="0" y2="-5.5"></line><line x1="3.52" y1="-1.14" x2="5.2" y2="-1.7"></line><line x1="2.18" y1="2.99" x2="3.2" y2="4.4"></line><line x1="-2.18" y1="2.99" x2="-3.2" y2="4.4"></line><line x1="-3.52" y1="-1.14" x2="-5.2" y2="-1.7"></line></g>
              <circle r="9" fill="none" stroke="#111111" stroke-width="1.3"></circle>
            </svg>
        </div>
      </div>
    </div>

    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,rgba(7,11,9,0) 35%,rgba(7,11,9,.55) 100%)"></div>
  </div></div></body></html>`;

export function AuthPitchReference() {
  return (
    <WebView
      accessibilityElementsHidden
      allowsBackForwardNavigationGestures={false}
      bounces={false}
      importantForAccessibility="no-hide-descendants"
      originWhitelist={['*']}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      source={{ html: REFERENCE_BACKGROUND }}
      style={styles.background}
    />
  );
}

const styles = StyleSheet.create({
  background: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' },
});
