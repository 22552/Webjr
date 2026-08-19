import WebCompiler from '../editor/engine/WebCompiler';
import {WINDOW_INNER_HEIGHT, WINDOW_INNER_WIDTH} from './lib';

const KEY = 'webjr-ui-v1';
const FIT_PAGES = ['index', 'home', 'editor', 'gettingStarted'];
let viewportBound = false;
let initialOrientation = null;
let reloadTimer = null;

function load () {
    try {
        return Object.assign({jit: true, largeTargets: true, reduceMotion: false, landscapeHint: true}, JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch (e) {
        return {jit: true, largeTargets: true, reduceMotion: false, landscapeHint: true};
    }
}

function save (settings) {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {} // eslint-disable-line no-empty
}

function pageClass () {
    return 'webjr-page-' + String(window.scratchJrPage || 'unknown').replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
}

function orientation () {
    return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
}

function style () {
    if (document.getElementById('webjr-mobile-style')) return;
    const tag = document.createElement('style');
    tag.id = 'webjr-mobile-style';
    tag.textContent = `
html.webjr, html.webjr body { margin:0 !important; width:100%; height:100%; overflow:hidden !important; overscroll-behavior:none; background:#000 !important; }
html.webjr body { position:relative; touch-action:manipulation; }
html.webjr #frame, html.webjr #libframe, html.webjr #paintframe { position:absolute !important; left:var(--webjr-stage-left,0px) !important; top:var(--webjr-stage-top,0px) !important; width:var(--webjr-stage-width,100vw) !important; height:var(--webjr-stage-height,100vh) !important; max-width:none !important; max-height:none !important; box-sizing:border-box; }
html.webjr-page-editor #frame { background:#fff; }
html.webjr #frame #topbar, html.webjr #libframe .topbar, html.webjr #paintframe .phototopbar { position:absolute !important; }
#webjr-rotate-cover { position:fixed; inset:0; z-index:40000; display:none; place-items:center; background:#000; color:#fff; font:700 15px/1.4 system-ui,-apple-system,sans-serif; }
html.webjr-rotating #webjr-rotate-cover { display:grid; }
#webjr-menu { position:fixed; right:max(12px,env(safe-area-inset-right)); bottom:max(12px,env(safe-area-inset-bottom)); z-index:24000; width:52px; height:52px; border:0; border-radius:17px; background:rgba(16,19,24,.96); color:#fff; font:700 22px system-ui; box-shadow:0 5px 20px rgba(0,0,0,.45); }
#webjr-sheet-bg { position:fixed; inset:0; z-index:23990; display:none; align-items:flex-end; justify-content:center; padding:12px 12px max(12px,env(safe-area-inset-bottom)); box-sizing:border-box; background:rgba(0,0,0,.62); }
#webjr-sheet-bg.open { display:flex; }
#webjr-sheet { width:min(520px,100%); max-height:84vh; overflow:auto; border:1px solid #303641; border-radius:22px; background:#11151c; color:#f6f7f9; padding:18px; box-sizing:border-box; font:15px/1.35 system-ui,-apple-system,sans-serif; box-shadow:0 15px 45px rgba(0,0,0,.55); }
#webjr-sheet h2 { margin:0; color:#fff; font-size:23px; }
#webjr-sheet .sub { margin:3px 0 12px; color:#9da6b4; font-size:12px; }
#webjr-fit-info { padding:9px 10px; margin:0 0 8px; border-radius:10px; background:#090c10; color:#bac3cf; font:600 12px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace; }
.webjr-row { min-height:50px; display:flex; align-items:center; justify-content:space-between; gap:16px; border-top:1px solid #2a303a; }
.webjr-row input { width:22px; height:22px; }
.webjr-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; }
.webjr-actions button { min-height:46px; border:0; border-radius:13px; font:700 15px system-ui; }
#webjr-close { background:#4488f7; color:#fff; }
#webjr-fullscreen { background:#252b35; color:#fff; }
#webjr-landscape { position:fixed; top:max(8px,env(safe-area-inset-top)); left:50%; transform:translateX(-50%); z-index:23000; display:none; max-width:calc(100vw - 24px); padding:8px 11px; border-radius:12px; background:rgba(10,12,16,.94); color:#fff; font:600 13px system-ui; pointer-events:none; }
html.webjr-mobile.webjr-portrait:not(.webjr-hide-landscape) #webjr-landscape { display:block; }
/* Never enlarge real layout boxes in portrait: the 4:3 editor is only about 24px per toolbar cell on a 390px-wide phone, so forcing 44px makes adjacent buttons overlap. */
html.webjr-large-targets:not(.webjr-portrait) .info,
html.webjr-large-targets:not(.webjr-portrait) .undobutton,
html.webjr-large-targets:not(.webjr-portrait) .redobutton,
html.webjr-large-targets:not(.webjr-portrait) .greenflag,
html.webjr-large-targets:not(.webjr-portrait) .stopbutton,
html.webjr-large-targets:not(.webjr-portrait) .home,
html.webjr-large-targets:not(.webjr-portrait) .paintbutton { min-width:44px !important; min-height:44px !important; }
html.webjr-portrait.webjr-large-targets .info,
html.webjr-portrait.webjr-large-targets .undobutton,
html.webjr-portrait.webjr-large-targets .redobutton,
html.webjr-portrait.webjr-large-targets .greenflag,
html.webjr-portrait.webjr-large-targets .stopbutton,
html.webjr-portrait.webjr-large-targets .home,
html.webjr-portrait.webjr-large-targets .paintbutton { min-width:0 !important; min-height:0 !important; }
html.webjr-reduce-motion *, html.webjr-reduce-motion *::before, html.webjr-reduce-motion *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; }
@media (pointer:fine) and (min-width:900px) { #webjr-menu { width:44px; height:44px; opacity:.58; } #webjr-menu:hover { opacity:1; } }
`;
    document.head.appendChild(tag);
}

function deviceClasses () {
    const root = document.documentElement;
    root.classList.add('webjr');
    root.classList.add(pageClass());
    root.classList.toggle('webjr-mobile', window.matchMedia('(max-width: 820px), (pointer: coarse)').matches);
    root.classList.toggle('webjr-portrait', window.innerHeight > window.innerWidth);
}

function positionStage () {
    const root = document.documentElement;
    const left = Math.max(0, (window.innerWidth - WINDOW_INNER_WIDTH) / 2);
    const top = Math.max(0, (window.innerHeight - WINDOW_INNER_HEIGHT) / 2);
    root.style.setProperty('--webjr-stage-width', WINDOW_INNER_WIDTH + 'px');
    root.style.setProperty('--webjr-stage-height', WINDOW_INNER_HEIGHT + 'px');
    root.style.setProperty('--webjr-stage-left', left + 'px');
    root.style.setProperty('--webjr-stage-top', top + 'px');
    const info = document.getElementById('webjr-fit-info');
    if (info) {
        info.textContent = Math.round(window.innerWidth) + '×' + Math.round(window.innerHeight) + ' → ' + Math.round(WINDOW_INNER_WIDTH) + '×' + Math.round(WINDOW_INNER_HEIGHT) + ' / 4:3 fit';
    }
}

function onViewportChange () {
    deviceClasses();
    const now = orientation();
    if (initialOrientation && now !== initialOrientation) {
        const root = document.documentElement;
        root.classList.add('webjr-rotating');
        clearTimeout(reloadTimer);
        reloadTimer = setTimeout(() => window.location.reload(), 250);
        return;
    }
    positionStage();
}

function apply (settings) {
    const root = document.documentElement;
    root.classList.toggle('webjr-large-targets', !!settings.largeTargets);
    root.classList.toggle('webjr-reduce-motion', !!settings.reduceMotion);
    root.classList.toggle('webjr-hide-landscape', !settings.landscapeHint);
    WebCompiler.setEnabled(settings.jit);
    save(settings);
}

function fullscreen () {
    const el = document.documentElement;
    const fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!fn) return;
    const result = fn.call(el);
    if (result && result.catch) result.catch(() => {}); // eslint-disable-line no-empty
}

export default class MobileUI {
    static initViewport () {
        if (FIT_PAGES.indexOf(window.scratchJrPage) < 0) return;
        style();
        deviceClasses();
        if (!initialOrientation) initialOrientation = orientation();
        positionStage();

        if (!document.getElementById('webjr-rotate-cover')) {
            const cover = document.createElement('div');
            cover.id = 'webjr-rotate-cover';
            cover.textContent = '画面サイズを合わせています…';
            document.body.appendChild(cover);
        }

        if (!viewportBound) {
            viewportBound = true;
            window.addEventListener('resize', onViewportChange);
            window.addEventListener('orientationchange', onViewportChange);
            if (window.visualViewport) window.visualViewport.addEventListener('resize', onViewportChange);
        }
    }

    static init () {
        MobileUI.initViewport();
        const settings = load();
        apply(settings);

        if (document.getElementById('webjr-menu')) return;
        const hint = document.createElement('div');
        hint.id = 'webjr-landscape';
        hint.textContent = '縦でも全体表示できます · 横向き推奨';
        document.body.appendChild(hint);

        const menu = document.createElement('button');
        menu.id = 'webjr-menu';
        menu.type = 'button';
        menu.textContent = '⚙';
        menu.setAttribute('aria-label', 'Webjr settings');
        document.body.appendChild(menu);

        const bg = document.createElement('div');
        bg.id = 'webjr-sheet-bg';
        bg.innerHTML = `<div id="webjr-sheet" role="dialog" aria-modal="true">
          <h2>Webjr</h2><div class="sub">ScratchJr compatible · Web optimized</div>
          <div id="webjr-fit-info"></div>
          <label class="webjr-row"><span>JSコンパイラ (JIT)</span><input id="webjr-jit" type="checkbox"></label>
          <label class="webjr-row"><span>大きいタップ領域（横画面）</span><input id="webjr-targets" type="checkbox"></label>
          <label class="webjr-row"><span>アニメーションを減らす</span><input id="webjr-motion" type="checkbox"></label>
          <label class="webjr-row"><span>縦画面で横向きヒント</span><input id="webjr-hint" type="checkbox"></label>
          <div class="webjr-actions"><button id="webjr-fullscreen" type="button">全画面</button><button id="webjr-close" type="button">閉じる</button></div>
        </div>`;
        document.body.appendChild(bg);
        positionStage();

        const jit = document.getElementById('webjr-jit');
        const targets = document.getElementById('webjr-targets');
        const motion = document.getElementById('webjr-motion');
        const hintToggle = document.getElementById('webjr-hint');
        jit.checked = settings.jit;
        targets.checked = settings.largeTargets;
        motion.checked = settings.reduceMotion;
        hintToggle.checked = settings.landscapeHint;

        const sync = () => {
            settings.jit = jit.checked;
            settings.largeTargets = targets.checked;
            settings.reduceMotion = motion.checked;
            settings.landscapeHint = hintToggle.checked;
            apply(settings);
        };
        [jit, targets, motion, hintToggle].forEach(input => input.addEventListener('change', sync));
        menu.addEventListener('click', () => bg.classList.add('open'));
        document.getElementById('webjr-close').addEventListener('click', () => bg.classList.remove('open'));
        document.getElementById('webjr-fullscreen').addEventListener('click', fullscreen);
        bg.addEventListener('click', event => { if (event.target === bg) bg.classList.remove('open'); });
    }
}
