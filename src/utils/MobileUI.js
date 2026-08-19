import WebCompiler from '../editor/engine/WebCompiler';

const KEY = 'webjr-ui-v1';

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

function style () {
    if (document.getElementById('webjr-mobile-style')) return;
    const tag = document.createElement('style');
    tag.id = 'webjr-mobile-style';
    tag.textContent = `
html.webjr, html.webjr body { margin:0; width:100%; height:100%; overflow:hidden; overscroll-behavior:none; }
#webjr-menu { position:fixed; right:max(12px,env(safe-area-inset-right)); bottom:max(12px,env(safe-area-inset-bottom)); z-index:24000; width:52px; height:52px; border:0; border-radius:17px; background:rgba(30,34,42,.94); color:#fff; font:700 22px system-ui; box-shadow:0 5px 20px rgba(0,0,0,.3); }
#webjr-sheet-bg { position:fixed; inset:0; z-index:23990; display:none; align-items:flex-end; justify-content:center; padding:12px 12px max(12px,env(safe-area-inset-bottom)); box-sizing:border-box; background:rgba(0,0,0,.35); }
#webjr-sheet-bg.open { display:flex; }
#webjr-sheet { width:min(520px,100%); max-height:84vh; overflow:auto; border-radius:22px; background:#fff; color:#20242b; padding:18px; box-sizing:border-box; font:15px/1.35 system-ui,-apple-system,sans-serif; box-shadow:0 15px 45px rgba(0,0,0,.35); }
#webjr-sheet h2 { margin:0; font-size:23px; }
#webjr-sheet .sub { margin:3px 0 12px; color:#70757d; font-size:12px; }
.webjr-row { min-height:50px; display:flex; align-items:center; justify-content:space-between; gap:16px; border-top:1px solid #eceef2; }
.webjr-row input { width:22px; height:22px; }
.webjr-actions { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:14px; }
.webjr-actions button { min-height:46px; border:0; border-radius:13px; font:700 15px system-ui; }
#webjr-close { background:#4488f7; color:#fff; }
#webjr-fullscreen { background:#edf0f5; color:#222; }
#webjr-landscape { position:fixed; top:max(8px,env(safe-area-inset-top)); left:50%; transform:translateX(-50%); z-index:23000; display:none; max-width:calc(100vw - 24px); padding:8px 11px; border-radius:12px; background:rgba(30,34,42,.92); color:#fff; font:600 13px system-ui; pointer-events:none; }
html.webjr-mobile.webjr-portrait:not(.webjr-hide-landscape) #webjr-landscape { display:block; }
html.webjr-large-targets .info, html.webjr-large-targets .undobutton, html.webjr-large-targets .redobutton, html.webjr-large-targets .greenflag, html.webjr-large-targets .stopbutton, html.webjr-large-targets .home, html.webjr-large-targets .paintbutton { min-width:44px !important; min-height:44px !important; }
html.webjr-reduce-motion *, html.webjr-reduce-motion *::before, html.webjr-reduce-motion *::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; }
@media (pointer:fine) and (min-width:900px) { #webjr-menu { width:44px; height:44px; opacity:.58; } #webjr-menu:hover { opacity:1; } }
`;
    document.head.appendChild(tag);
}

function deviceClasses () {
    const root = document.documentElement;
    root.classList.add('webjr');
    root.classList.toggle('webjr-mobile', window.matchMedia('(max-width: 820px), (pointer: coarse)').matches);
    root.classList.toggle('webjr-portrait', window.innerHeight > window.innerWidth);
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
    static init () {
        style();
        deviceClasses();
        const settings = load();
        apply(settings);
        window.addEventListener('resize', deviceClasses);
        window.addEventListener('orientationchange', deviceClasses);

        if (document.getElementById('webjr-menu')) return;
        const hint = document.createElement('div');
        hint.id = 'webjr-landscape';
        hint.textContent = 'Webjr: 横向きにすると編集しやすくなります';
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
          <label class="webjr-row"><span>JSコンパイラ (JIT)</span><input id="webjr-jit" type="checkbox"></label>
          <label class="webjr-row"><span>大きいタップ領域</span><input id="webjr-targets" type="checkbox"></label>
          <label class="webjr-row"><span>アニメーションを減らす</span><input id="webjr-motion" type="checkbox"></label>
          <label class="webjr-row"><span>縦画面で横向きヒント</span><input id="webjr-hint" type="checkbox"></label>
          <div class="webjr-actions"><button id="webjr-fullscreen" type="button">全画面</button><button id="webjr-close" type="button">閉じる</button></div>
        </div>`;
        document.body.appendChild(bg);

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
