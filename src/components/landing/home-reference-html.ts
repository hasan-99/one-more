import { HOME_FONT_FACES } from './home-reference-fonts';

const HOME_REFERENCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>OneMore</title>
<style>${HOME_FONT_FACES}

body{margin:0;background:#0c1210}
.om-root{font-family:'Barlow',system-ui,sans-serif;color:#f2f5ec}
.om-display{font-family:'Barlow Condensed','Arial Narrow',sans-serif}

/* ---------- load choreography ---------- */
.om-pop{animation:om-pop .8s cubic-bezier(.2,1.3,.3,1) both}
@keyframes om-pop{0%{transform:scale(.3) rotate(-25deg);opacity:0}100%{transform:scale(1) rotate(0);opacity:1}}
.om-linewrap{display:flex;white-space:nowrap;overflow:hidden;padding:.06em 0 .12em}
.om-ch{display:inline-block;transform:translateY(120%) rotate(12deg);opacity:0;animation:om-letter .7s cubic-bezier(.2,1.25,.3,1) forwards}
@keyframes om-letter{to{transform:translateY(0) rotate(0);opacity:1}}
.om-glow{animation:om-glow 3.2s ease-in-out 2.6s infinite}
@keyframes om-glow{0%,100%{text-shadow:0 0 0 rgba(207,255,74,0)}50%{text-shadow:0 0 26px rgba(207,255,74,.5)}}
.om-fade{opacity:0;transform:translateY(16px);animation:om-in .9s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes om-in{to{opacity:1;transform:translateY(0)}}

/* ---------- hero backdrop: pitch lines draw themselves ---------- */
.om-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:om-drawline 2.6s cubic-bezier(.5,0,.2,1) .2s forwards}
.om-draw.d2{animation-delay:.7s}
@keyframes om-drawline{to{stroke-dashoffset:0}}
.om-breathe{transform-box:fill-box;transform-origin:center;animation:om-breathe 7s ease-in-out 3s infinite}
@keyframes om-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}

/* ---------- buttons ---------- */
.om-cta{position:relative;overflow:hidden;transition:transform .15s ease, box-shadow .25s ease}
.om-cta::after{content:"";position:absolute;inset:0;background:linear-gradient(105deg,transparent 35%,rgba(255,255,255,.6) 50%,transparent 65%);transform:translateX(-130%);animation:om-shine 3.8s ease-in-out 2s infinite}
@keyframes om-shine{0%{transform:translateX(-130%)}35%,100%{transform:translateX(130%)}}
.om-cta:hover{box-shadow:0 0 0 6px rgba(207,255,74,.2),0 10px 30px rgba(207,255,74,.25)}
.om-cta:active{transform:scale(.96)}
.om-arrow{animation:om-nudge 1.4s ease-in-out infinite}
@keyframes om-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(6px)}}
.om-ghost{transition:background .2s ease, border-color .2s ease, transform .15s ease}
.om-ghost:hover{background:#16241c;border-color:#cfff4a}
.om-ghost:active{transform:scale(.97)}
.om-icon{transition:background .2s ease, transform .5s cubic-bezier(.2,.8,.2,1)}
.om-icon:hover{background:#1c2a21;transform:rotate(90deg)}
.om-cta:focus-visible,.om-icon:focus-visible,.om-pill:focus-visible,.om-ghost:focus-visible{outline:3px solid #f2f5ec;outline-offset:3px}

/* ---------- ticker ---------- */
.om-track{display:flex;width:max-content;animation:om-marquee 18s linear infinite}
@keyframes om-marquee{to{transform:translateX(-50%)}}

/* ---------- live pitch: one choreographed 10s play ---------- */
.om-slot{transform-box:fill-box;transform-origin:center;animation:om-pulse 1.8s ease-out infinite}
.om-slot.s2{animation-delay:.9s}
@keyframes om-pulse{0%{transform:scale(.75);opacity:1}100%{transform:scale(2);opacity:0}}
.om-live{animation:om-blink 1.6s ease-in-out infinite}
@keyframes om-blink{0%,100%{opacity:1}50%{opacity:.25}}
.om-t{animation-duration:10s;animation-iteration-count:infinite;animation-timing-function:ease-in-out}
.om-hide{opacity:0}
.om-fb{transform-box:fill-box;transform-origin:center}
.om-ball0{transform:translate(38px,112px);animation-timing-function:cubic-bezier(.15,.6,.3,1)}

/* ball: pass, pass, dribble, through ball, shot */
@keyframes om-ball{
0%,14%{transform:translate(38px,112px);opacity:1}
22%,26%{transform:translate(90px,68px);opacity:1}
36%,40%{transform:translate(160px,112px);opacity:1;animation-timing-function:linear}
48%{transform:translate(186px,106px);opacity:1}
58%{transform:translate(270px,98px);opacity:1}
62%{transform:translate(270px,98px);opacity:1;animation-timing-function:cubic-bezier(.5,0,.9,.7)}
68%{transform:translate(336px,106px);opacity:1}
70%{transform:translate(338px,106px);opacity:0}
95%{transform:translate(38px,112px);opacity:0}
98%,100%{transform:translate(38px,112px);opacity:1}}
@keyframes om-spin{
0%,14%{transform:rotate(0deg) scale(1)}
18%{transform:rotate(200deg) scale(1.35)}
22%,26%{transform:rotate(360deg) scale(1)}
36%,40%{transform:rotate(720deg) scale(1)}
48%{transform:rotate(900deg) scale(1)}
53%{transform:rotate(1200deg) scale(1.4)}
58%,62%{transform:rotate(1440deg) scale(1)}
68%,100%{transform:rotate(2200deg) scale(1)}}

/* players */
@keyframes om-gk{0%,12%{transform:translate(0,0)}15%{transform:translate(5px,0)}20%{transform:translate(0,0)}55%{transform:translate(8px,-4px)}100%{transform:translate(0,0)}}
@keyframes om-d1{0%,22%{transform:translate(0,0)}25%{transform:translate(4px,2px)}60%,80%{transform:translate(30px,6px)}100%{transform:translate(0,0)}}
@keyframes om-d2{0%,20%{transform:translate(0,0)}60%,80%{transform:translate(40px,-14px)}100%{transform:translate(0,0)}}
@keyframes om-mid{0%,38%{transform:translate(0,0)}48%{transform:translate(26px,-6px)}70%{transform:translate(34px,-8px)}88%,100%{transform:translate(0,0)}}
@keyframes om-st{0%{transform:translate(0,0)}30%{transform:translate(-5px,6px)}46%{transform:translate(-2px,4px)}58%,62%{transform:translate(56px,8px)}65%{transform:translate(60px,9px)}72%{transform:translate(60px,-3px)}76%{transform:translate(60px,9px)}80%{transform:translate(60px,1px)}84%{transform:translate(60px,9px)}96%,100%{transform:translate(0,0)}}
@keyframes om-ogk{0%{transform:translate(0,0)}30%{transform:translate(0,6px)}60%{transform:translate(0,0)}68%,82%{transform:translate(-2px,-22px)}94%,100%{transform:translate(0,0)}}
@keyframes om-od1{0%{transform:translate(0,0)}30%{transform:translate(-10px,6px)}48%{transform:translate(-6px,14px)}58%,76%{transform:translate(6px,20px)}94%,100%{transform:translate(0,0)}}
@keyframes om-od2{0%{transform:translate(0,0)}40%{transform:translate(-14px,-10px)}58%,76%{transform:translate(-2px,-26px)}94%,100%{transform:translate(0,0)}}
@keyframes om-om{0%,14%{transform:translate(0,0)}26%{transform:translate(-18px,2px)}36%{transform:translate(-30px,10px)}48%{transform:translate(-26px,14px)}58%,76%{transform:translate(4px,6px)}94%,100%{transform:translate(0,0)}}

/* a ring where each pass is received */
@keyframes om-r1{0%,21%{opacity:0;transform:scale(.6)}22%{opacity:.9;transform:scale(.8)}31%,100%{opacity:0;transform:scale(2.6)}}
@keyframes om-r2{0%,35%{opacity:0;transform:scale(.6)}36%{opacity:.9;transform:scale(.8)}45%,100%{opacity:0;transform:scale(2.6)}}
@keyframes om-r3{0%,57%{opacity:0;transform:scale(.6)}58%{opacity:.9;transform:scale(.8)}67%,100%{opacity:0;transform:scale(2.6)}}

/* pass lines draw just ahead of the ball */
.om-pl{stroke-dasharray:1;stroke-dashoffset:1}
@keyframes om-l1{0%,11%{stroke-dashoffset:1;opacity:0}12%{stroke-dashoffset:1;opacity:.7}20%{stroke-dashoffset:0;opacity:.7}26%,100%{stroke-dashoffset:0;opacity:0}}
@keyframes om-l2{0%,23%{stroke-dashoffset:1;opacity:0}24%{stroke-dashoffset:1;opacity:.7}34%{stroke-dashoffset:0;opacity:.7}40%,100%{stroke-dashoffset:0;opacity:0}}
@keyframes om-l3{0%,45%{stroke-dashoffset:1;opacity:0}46%{stroke-dashoffset:1;opacity:.7}56%{stroke-dashoffset:0;opacity:.7}62%,100%{stroke-dashoffset:0;opacity:0}}
@keyframes om-l4{0%,60%{stroke-dashoffset:1;opacity:0}61%{stroke-dashoffset:1;opacity:.9}66%{stroke-dashoffset:0;opacity:.9}71%,100%{stroke-dashoffset:0;opacity:0}}

/* goal */
@keyframes om-net{0%,67%{fill:rgba(207,255,74,0)}69%{fill:rgba(207,255,74,.95)}79%,100%{fill:rgba(207,255,74,0)}}
@keyframes om-goal{0%,68%{opacity:0;transform:translateY(8px) scale(.6)}71%{opacity:1;transform:translateY(0) scale(1.2)}74%{opacity:1;transform:translateY(-2px) scale(1)}83%,100%{opacity:0;transform:translateY(-14px) scale(1)}}

/* a new player takes the open midfield place */
@keyframes om-open{0%,9%{opacity:1}11%,93%{opacity:0}97%,100%{opacity:1}}
@keyframes om-filled{0%,10%{opacity:0;transform:scale(0)}13%{opacity:1;transform:scale(1.3)}16%,90%{opacity:1;transform:scale(1)}95%,100%{opacity:0;transform:scale(.4)}}
@keyframes om-burst{0%,9%{opacity:0;transform:scale(.6)}10%{opacity:.95;transform:scale(.8)}20%,100%{opacity:0;transform:scale(3.4)}}
.om-cursor{transform-box:fill-box;transform-origin:left top}
@keyframes om-cursor{0%,1%{opacity:0;transform:translate(90px,70px) scale(1)}3%{opacity:1;transform:translate(90px,70px) scale(1)}9%{opacity:1;transform:translate(0,0) scale(1)}10%{opacity:1;transform:translate(0,1px) scale(.78)}12%{opacity:1;transform:translate(0,0) scale(1)}16%,100%{opacity:0;transform:translate(10px,14px) scale(1)}}
.om-cb{animation:om-bob 2.4s ease-in-out infinite}
@keyframes om-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
.om-chipa,.om-chipb{grid-area:1/1;white-space:nowrap;justify-self:start}
@keyframes om-chipa{0%,9%{opacity:1;transform:scale(1)}11%,93%{opacity:0;transform:scale(.7)}97%,100%{opacity:1;transform:scale(1)}}
@keyframes om-chipb{0%,11%{opacity:0;transform:scale(.7)}14%{opacity:1;transform:scale(1.08)}16%,22%{opacity:1;transform:scale(1)}26%,100%{opacity:0;transform:scale(.7)}}
.om-countbox{display:grid}
.om-cnta,.om-cntb{grid-area:1/1;white-space:nowrap;text-align:right}
@keyframes om-cnta{0%,10%{opacity:1;transform:translateY(0)}12%,93%{opacity:0;transform:translateY(-10px)}97%,100%{opacity:1;transform:translateY(0)}}
@keyframes om-cntb{0%,11%{opacity:0;transform:translateY(10px)}14%,91%{opacity:1;transform:translateY(0)}94%,100%{opacity:0;transform:translateY(10px)}}

/* ---------- steps reveal as they scroll into view ---------- */
@supports (animation-timeline: view()){
  .om-step{animation:om-step linear both;animation-timeline:view();animation-range:entry 0% entry 70%}
  @keyframes om-step{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:translateX(0)}}
}

@media (prefers-reduced-motion: reduce){
  .om-ch,.om-fade,.om-pop{animation:none;opacity:1;transform:none}
  .om-draw{animation:none;stroke-dashoffset:0}
  .om-track,.om-slot,.om-live,.om-glow,.om-arrow,.om-cta::after,.om-cb,.om-breathe,.om-step{animation:none}
  .om-t{animation:none !important}
}
</style>
</head>
<body>
<div class="om-root" style="position:relative;width:100%;max-width:480px;margin:0 auto;box-sizing:border-box;height:100vh;height:100dvh;min-height:600px;padding:14px 18px 16px;background:radial-gradient(circle at 85% 18%, #16251c 0, #0c1210 55%);display:flex;flex-direction:column;gap:14px;overflow:hidden">

  <svg aria-hidden="true" viewBox="0 0 400 400" width="400" height="400" style="position:absolute;top:70px;right:-150px;pointer-events:none;z-index:0">
    <g fill="none" stroke="#243a2d" stroke-width="2">
      <circle class="om-draw om-breathe" cx="200" cy="200" r="150" pathLength="1"></circle>
      <line class="om-draw d2" x1="200" y1="0" x2="200" y2="400" pathLength="1"></line>
      <circle class="om-draw d2" cx="200" cy="200" r="6" pathLength="1"></circle>
    </g>
  </svg>

  <header style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:12px">
    <img class="om-pop" src="onemore-logo.png" alt="OneMore" width="60" height="60" style="width:60px;height:60px;border-radius:15px;display:block;object-fit:cover">
    <div class="om-fade" style="display:flex;align-items:center;gap:10px;animation-delay:.4s">
      <button class="om-pill" type="button" aria-label="Language: English" style="min-width:48px;height:44px;padding:0 14px;border-radius:12px;border:0;background:#cfff4a;color:#0c1210;font-family:'Barlow',sans-serif;font-weight:600;font-size:15px;cursor:pointer">EN</button>
    </div>
  </header>

  <section style="position:relative;z-index:1;display:flex;flex-direction:column;gap:10px;padding-top:0">
    <div class="om-fade" style="display:flex;align-items:center;gap:10px;font-size:12px;font-weight:600;letter-spacing:3px;color:#b9c4b4;animation-delay:.35s"><span aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#cfff4a;display:inline-block"></span>FOOTBALL, YOUR WAY</div>
    <h1 class="om-display" aria-label="Your game starts here." style="margin:0;font-weight:800;font-size:48px;line-height:.95;letter-spacing:-.5px">
      <span class="om-linewrap" aria-hidden="true">
        <span class="om-ch" style="animation-delay:0.45s">Y</span><span class="om-ch" style="animation-delay:0.49s">o</span><span class="om-ch" style="animation-delay:0.53s">u</span><span class="om-ch" style="animation-delay:0.57s">r</span><span class="om-ch" style="animation-delay:0.61s">&nbsp;</span><span class="om-ch" style="animation-delay:0.65s">g</span><span class="om-ch" style="animation-delay:0.69s">a</span><span class="om-ch" style="animation-delay:0.73s">m</span><span class="om-ch" style="animation-delay:0.77s">e</span>
      </span>
      <span class="om-linewrap om-glow" aria-hidden="true" style="color:#cfff4a">
        <span class="om-ch" style="animation-delay:0.85s">s</span><span class="om-ch" style="animation-delay:0.89s">t</span><span class="om-ch" style="animation-delay:0.93s">a</span><span class="om-ch" style="animation-delay:0.97s">r</span><span class="om-ch" style="animation-delay:1.01s">t</span><span class="om-ch" style="animation-delay:1.05s">s</span><span class="om-ch" style="animation-delay:1.09s">&nbsp;</span><span class="om-ch" style="animation-delay:1.13s">h</span><span class="om-ch" style="animation-delay:1.17s">e</span><span class="om-ch" style="animation-delay:1.21s">r</span><span class="om-ch" style="animation-delay:1.25s">e</span><span class="om-ch" style="animation-delay:1.29s">.</span>
      </span>
    </h1>
    <p class="om-fade" style="margin:0;max-width:36ch;font-size:16px;line-height:1.4;color:#b9c4b4;animation-delay:1.3s">Find a local game, fill the last few places, or bring your team together.</p>
    <div class="om-fade" style="display:flex;flex-direction:column;gap:8px;padding-top:2px;animation-delay:1.5s">
      <a class="om-cta" href="signin.html" style="text-decoration:none;box-sizing:border-box;height:46px;flex:none;align-self:flex-start;padding:0 20px;border:0;border-radius:14px;background:#cfff4a;color:#0c1210;font-family:'Barlow',sans-serif;font-weight:600;font-size:16px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer">
        Sign in or create account
        <svg class="om-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>
      </a>

    </div>
  </section>

  <div class="om-fade" style="position:relative;z-index:1;flex:0 1 auto;min-height:0;margin-top:18px;display:flex;flex-direction:column;perspective:900px;animation-delay:1.9s">
    <section aria-label="Example game" id="om-tilt" style="transition:transform .18s ease-out;border-radius:28px;border:1.5px solid #2a3d31;background:linear-gradient(180deg,#16241c,#101a15);flex:0 1 auto;min-height:0;box-sizing:border-box;padding:12px;display:flex;flex-direction:column;gap:10px;box-shadow:0 24px 60px rgba(0,0,0,.45)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:#cfff4a">
          <span class="om-live" aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#cfff4a;display:inline-block"></span>
          Example game
        </div>
        <span style="padding:5px 12px;border-radius:999px;background:#cfff4a;color:#0c1210;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;line-height:1.1">5v5</span>
      </div>

      <div style="position:relative;flex:0 1 auto;aspect-ratio:340/220;min-height:110px;border-radius:18px;overflow:hidden;background:#27402f">
        <svg viewBox="0 0 340 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Animated 5 a side pitch: a new midfielder takes the open place, then the team passes from the goalkeeper through midfield to the striker, who scores" style="position:absolute;inset:0;width:100%;height:100%;display:block">
          <rect x="0" y="0" width="340" height="220" fill="#27402f"></rect>
                    <g fill="none" stroke="#6f9a7c" stroke-width="1.5" opacity=".75">
            <rect x="8" y="8" width="324" height="204" rx="6"></rect>
            <line x1="170" y1="8" x2="170" y2="212"></line>
            <circle cx="170" cy="110" r="30"></circle>
            <rect x="8" y="64" width="38" height="92"></rect>
            <rect x="294" y="64" width="38" height="92"></rect>
          </g>
          <circle cx="170" cy="110" r="3" fill="#6f9a7c"></circle>
          <rect class="om-t" style="animation-name:om-net" x="330" y="86" width="10" height="48" rx="2" fill="rgba(207,255,74,0)" stroke="#f2f5ec" stroke-width="1.5"></rect>

          <g fill="none" stroke-width="2" stroke-linecap="round">
            <line class="om-pl om-hide om-t" style="animation-name:om-l1" x1="38" y1="112" x2="90" y2="68" pathLength="1" stroke="#cfff4a"></line>
            <line class="om-pl om-hide om-t" style="animation-name:om-l2" x1="90" y1="68" x2="160" y2="112" pathLength="1" stroke="#cfff4a"></line>
            <line class="om-pl om-hide om-t" style="animation-name:om-l3" x1="186" y1="106" x2="270" y2="98" pathLength="1" stroke="#cfff4a"></line>
            <line class="om-pl om-hide om-t" style="animation-name:om-l4" x1="270" y1="98" x2="336" y2="106" pathLength="1" stroke="#ffffff"></line>
          </g>

          <circle class="om-fb om-hide om-t" style="animation-name:om-r1" cx="80" cy="66" r="12" fill="none" stroke="#cfff4a" stroke-width="2.5"></circle>
          <circle class="om-fb om-hide om-t" style="animation-name:om-r2" cx="150" cy="110" r="12" fill="none" stroke="#cfff4a" stroke-width="2.5"></circle>
          <circle class="om-fb om-hide om-t" style="animation-name:om-r3" cx="261" cy="96" r="12" fill="none" stroke="#cfff4a" stroke-width="2.5"></circle>

          <g class="om-t" style="animation-name:om-gk"><circle cx="28" cy="110" r="10" fill="#cfff4a"></circle><text x="28" y="113" text-anchor="middle" font-size="8" font-weight="700" fill="#0c1210" style="font-family:'Barlow',sans-serif">GK</text></g>
          <g class="om-t" style="animation-name:om-d1"><circle cx="80" cy="66" r="10" fill="#cfff4a"></circle><text x="80" y="69" text-anchor="middle" font-size="8" font-weight="700" fill="#0c1210" style="font-family:'Barlow',sans-serif">DF</text></g>
          <g class="om-t" style="animation-name:om-d2"><circle cx="80" cy="154" r="10" fill="#cfff4a"></circle><text x="80" y="157" text-anchor="middle" font-size="8" font-weight="700" fill="#0c1210" style="font-family:'Barlow',sans-serif">DF</text></g>
          <g class="om-t" style="animation-name:om-st"><circle cx="205" cy="88" r="10" fill="#cfff4a"></circle><text x="205" y="91" text-anchor="middle" font-size="8" font-weight="700" fill="#0c1210" style="font-family:'Barlow',sans-serif">ST</text></g>

          <g class="om-t" style="animation-name:om-ogk"><circle cx="312" cy="110" r="10" fill="#f2f5ec"></circle><text x="312" y="113" text-anchor="middle" font-size="8" font-weight="700" fill="#0c1210" style="font-family:'Barlow',sans-serif">GK</text></g>
          <g class="om-t" style="animation-name:om-od1"><circle cx="262" cy="66" r="10" fill="#f2f5ec"></circle><text x="262" y="69" text-anchor="middle" font-size="8" font-weight="700" fill="#0c1210" style="font-family:'Barlow',sans-serif">DF</text></g>
          <g class="om-t" style="animation-name:om-od2"><circle cx="262" cy="154" r="10" fill="#f2f5ec"></circle><text x="262" y="157" text-anchor="middle" font-size="8" font-weight="700" fill="#0c1210" style="font-family:'Barlow',sans-serif">DF</text></g>
          <g class="om-t" style="animation-name:om-om"><circle cx="222" cy="112" r="10" fill="#f2f5ec"></circle><text x="222" y="115" text-anchor="middle" font-size="8" font-weight="700" fill="#0c1210" style="font-family:'Barlow',sans-serif">MF</text></g>

          <g class="om-t" style="animation-name:om-open">
            <circle class="om-slot" cx="150" cy="110" r="10" fill="none" stroke="#cfff4a" stroke-width="2"></circle>
            <circle cx="150" cy="110" r="10" fill="#0c1210" stroke="#cfff4a" stroke-width="2" stroke-dasharray="4 3"></circle>
            <text x="150" y="113.5" text-anchor="middle" font-size="12" font-weight="700" fill="#cfff4a" style="font-family:'Barlow',sans-serif">+</text>
          </g>
          <circle class="om-fb om-hide om-t" style="animation-name:om-burst" cx="150" cy="110" r="12" fill="none" stroke="#cfff4a" stroke-width="3"></circle>
          <g class="om-t" style="animation-name:om-mid">
            <g class="om-fb om-hide om-t" style="animation-name:om-filled"><circle cx="150" cy="110" r="10" fill="#cfff4a" stroke="#ffffff" stroke-width="2"></circle><text x="150" y="113" text-anchor="middle" font-size="8" font-weight="700" fill="#0c1210" style="font-family:'Barlow',sans-serif">MF</text></g>
          </g>

          <circle class="om-slot s2" cx="196" cy="156" r="10" fill="none" stroke="#f2f5ec" stroke-width="2"></circle>
          <circle cx="196" cy="156" r="10" fill="#0c1210" stroke="#f2f5ec" stroke-width="2" stroke-dasharray="4 3"></circle>
          <text x="196" y="159.5" text-anchor="middle" font-size="12" font-weight="700" fill="#f2f5ec" style="font-family:'Barlow',sans-serif">+</text>

          <g class="om-ball0 om-t" style="animation-name:om-ball;animation-delay:.14s"><circle r="5" fill="#ffffff" fill-opacity=".2"></circle></g>
          <g class="om-ball0 om-t" style="animation-name:om-ball;animation-delay:.07s"><circle r="6.5" fill="#ffffff" fill-opacity=".4"></circle></g>
          <g class="om-ball0 om-t" style="animation-name:om-ball">
            <ellipse cx="1.5" cy="8.5" rx="7.5" ry="2.6" fill="#0c1210" opacity=".35"></ellipse>
            <g class="om-t" style="animation-name:om-spin;animation-timing-function:linear">
              <clipPath id="om-bc"><circle r="8"></circle></clipPath>
              <circle r="8" fill="#ffffff"></circle>
              <g clip-path="url(#om-bc)" fill="#111111"><polygon points="0.00,-4.90 -3.23,-7.25 -2.00,-11.05 2.00,-11.05 3.23,-7.25"></polygon><polygon points="4.66,-1.51 5.90,-5.32 9.89,-5.32 11.13,-1.51 7.89,0.84"></polygon><polygon points="2.88,3.96 6.88,3.96 8.11,7.77 4.88,10.11 1.65,7.77"></polygon><polygon points="-2.88,3.96 -1.65,7.77 -4.88,10.11 -8.11,7.77 -6.88,3.96"></polygon><polygon points="-4.66,-1.51 -7.89,0.84 -11.13,-1.51 -9.89,-5.32 -5.90,-5.32"></polygon><polygon points="0.00,-3.30 3.14,-1.02 1.94,2.67 -1.94,2.67 -3.14,-1.02"></polygon></g>
              <g stroke="#111111" stroke-width="1" stroke-linecap="round"><line x1="0.00" y1="-3.30" x2="0.00" y2="-5.60"></line><line x1="3.14" y1="-1.02" x2="5.33" y2="-1.73"></line><line x1="1.94" y1="2.67" x2="3.29" y2="4.53"></line><line x1="-1.94" y1="2.67" x2="-3.29" y2="4.53"></line><line x1="-3.14" y1="-1.02" x2="-5.33" y2="-1.73"></line></g>
              <circle r="8" fill="none" stroke="#111111" stroke-width="1.2"></circle>
            </g>
          </g>

          <text class="om-fb om-hide om-t" x="262" y="48" text-anchor="middle" fill="#cfff4a" font-size="30" font-weight="800" style="animation-name:om-goal;font-family:'Barlow Condensed',sans-serif">Goal!</text>

          <g class="om-cb">
            <g class="om-fb om-t" style="animation-name:om-chipa">
              <rect x="96" y="40" width="82" height="24" rx="12" fill="#cfff4a"></rect>
              <circle cx="108" cy="52" r="3.5" fill="#0c1210"></circle>
              <text x="116" y="56" font-size="11.5" font-weight="600" fill="#0c1210" style="font-family:'Barlow',sans-serif">Midfielder</text>
            </g>
            <g class="om-fb om-hide om-t" style="animation-name:om-chipb">
              <rect x="96" y="40" width="88" height="24" rx="12" fill="#f2f5ec"></rect>
              <path d="M104.5 52.5l3 3 5.5-6" fill="none" stroke="#0c1210" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              <text x="117" y="56" font-size="11.5" font-weight="600" fill="#0c1210" style="font-family:'Barlow',sans-serif">Place taken</text>
            </g>
          </g>

          <path class="om-cursor om-hide om-t" style="animation-name:om-cursor" d="M154,114 L154,132 L159,127.5 L163,136 L166,134.6 L162,126.5 L168.5,126.5 Z" fill="#ffffff" stroke="#0c1210" stroke-width="1.4" stroke-linejoin="round"></path>
        </svg>
      </div>

      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
        <div style="display:flex;flex-direction:column;gap:2px;min-width:0">
          <div class="om-display" style="font-weight:800;font-size:24px;line-height:1.05">A game near you</div>
          <div style="font-size:14px;color:#b9c4b4">Nicosia, this week, evening</div>
        </div>
        <span style="display:flex;align-items:center;gap:8px;color:#cfff4a;font-weight:600;font-size:14px;flex:none">
          <span class="om-live" aria-hidden="true" style="width:8px;height:8px;border-radius:50%;background:#cfff4a;display:inline-block"></span>
          <span class="om-countbox"><span class="om-cnta om-t" style="animation-name:om-cnta">2 places open</span><span class="om-cntb om-hide om-t" style="animation-name:om-cntb">1 place open</span></span>
        </span>
      </div>
    </section>
  </div>

  <p class="om-fade" style="position:relative;z-index:1;flex:none;margin:0;text-align:center;font-size:13px;line-height:1.4;color:#b9c4b4;animation-delay:2.2s">Somewhere tonight, a team is one short. <span style="color:#cfff4a;font-weight:600">Be the one more.</span></p>

</div>
<script>
// 3D tilt on the example game card
(function () {
  var card = document.getElementById('om-tilt');
  if (!card) return;
  card.addEventListener('pointermove', function (e) {
    var r = card.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = 'rotateX(' + (-py * 8).toFixed(2) + 'deg) rotateY(' + (px * 10).toFixed(2) + 'deg)';
  });
  card.addEventListener('pointerleave', function () { card.style.transform = ''; });
})();
</script>
</body>
</html>
`;

export type HomeReferenceCopy = {
  eyebrow: string;
  heroLineOne: string;
  heroLineTwo: string;
  intro: string;
  landingGetStarted: string;
  demoExampleGame: string;
  demoTitle: string;
  demoSubtitle: string;
  demoAvailability: string;
  demoOnePlaceOpen: string;
  landingFooterLead: string;
  landingFooterEmphasis: string;
  languageSwitchLabel: string;
  languageCode: 'EN' | 'EL';
};

export function buildHomeReferenceHtml(
  copy: HomeReferenceCopy,
  safeArea: { top: number; bottom: number } = { top: 0, bottom: 0 },
) {
  let html = HOME_REFERENCE_HTML;
  const replace = (source: string, target: string) => {
    html = html.replace(source, target);
  };

  replace(
    'padding:14px 18px 16px',
    `padding:${14 + Math.max(0, safeArea.top)}px 18px ${16 + Math.max(0, safeArea.bottom)}px`,
  );
  replace(
    'margin-top:8px;display:flex;flex-direction:column;perspective:900px',
    'margin-top:18px;display:flex;flex-direction:column;perspective:900px',
  );
  replace('src="onemore-logo.png" alt="OneMore"', 'src="" alt="" aria-hidden="true"');
  replace('object-fit:cover">', 'object-fit:cover;visibility:hidden">');
  replace('href="signin.html"', 'href="#" id="home-signin"');
  replace('aria-label="Language: English"', `aria-label="${escapeHtml(copy.languageSwitchLabel)}"`);
  replace('>EN</button>', `>${copy.languageCode}</button>`);
  replace('FOOTBALL, YOUR WAY', escapeHtml(copy.eyebrow));
  replace(
    'Find a local game, fill the last few places, or bring your team together.',
    escapeHtml(copy.intro),
  );
  replace('Sign in or create account', escapeHtml(copy.landingGetStarted));
  replace('Example game', escapeHtml(copy.demoExampleGame));
  replace('A game near you', escapeHtml(copy.demoTitle));
  replace('Nicosia, this week, evening', escapeHtml(copy.demoSubtitle));
  replace('2 places open', escapeHtml(copy.demoAvailability));
  replace('1 place open', escapeHtml(copy.demoOnePlaceOpen));

  const heading = `<h1 class="om-display" aria-label="${escapeHtml(`${copy.heroLineOne} ${copy.heroLineTwo}`)}" style="margin:0;font-weight:800;font-size:48px;line-height:.95;letter-spacing:-.5px">
      ${animatedLine(copy.heroLineOne, 0.45, false)}
      ${animatedLine(copy.heroLineTwo, 0.85, true)}
    </h1>`;
  html = html.replace(/<h1 class="om-display"[\s\S]*?<\/h1>/, heading);

  const footer = `<p class="om-fade" style="position:relative;z-index:1;flex:none;margin:0;text-align:center;font-size:13px;line-height:1.4;color:#b9c4b4;animation-delay:2.2s">${escapeHtml(copy.landingFooterLead)} <span style="color:#cfff4a;font-weight:600">${escapeHtml(copy.landingFooterEmphasis)}</span></p>`;
  html = html.replace(
    /<p class="om-fade" style="position:relative;z-index:1;flex:none;margin:0;text-align:center;font-size:13px;line-height:1\.4;color:#b9c4b4;animation-delay:2\.2s">[\s\S]*?<\/p>/,
    footer,
  );

  const bridgeScript = `<script>
    document.getElementById('home-signin').addEventListener('click', function (event) {
      event.preventDefault();
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('sign-in');
    });
    document.querySelector('.om-pill').addEventListener('click', function () {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('switch-language');
    });
  </script>`;
  html = html.replace('</body>', `${bridgeScript}</body>`);
  return html;
}

function animatedLine(text: string, firstDelay: number, accent: boolean) {
  const glyphs = Array.from(text)
    .map((character, index) => {
      const delay = (firstDelay + index * 0.04).toFixed(2);
      const glyph = character === ' ' ? '&nbsp;' : escapeHtml(character);
      return `<span class="om-ch" style="animation-delay:${delay}s">${glyph}</span>`;
    })
    .join('');
  const accentClass = accent ? ' om-glow' : '';
  const accentStyle = accent ? ' style="color:#cfff4a"' : '';
  return `<span class="om-linewrap${accentClass}" aria-hidden="true"${accentStyle}>${glyphs}</span>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return character;
    }
  });
}
