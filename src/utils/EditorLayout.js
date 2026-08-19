import ScriptsPane from '../editor/ui/ScriptsPane';
import {gn, frame, scaleMultiplier} from './lib';

let bootstrapped = false;
let mounted = false;
let resizeBound = false;
let retryTimer = null;

function installStyles () {
    if (document.getElementById('webjr-editor-layout-style')) return;
    const row = 64 * scaleMultiplier;
    const style = document.createElement('style');
    style.id = 'webjr-editor-layout-style';
    style.textContent = `
html.webjr, html.webjr body { background:#000 !important; }
html.webjr-page-editor #frame { background:#fff !important; }
#blockspalette { height:${row * 2}px !important; min-height:${row * 2}px !important; overflow:visible !important; background:#fff !important; }
#blockspalette .categoryselector { display:block !important; width:100% !important; height:${row}px !important; margin:0 !important; overflow:hidden !important; background:#e9ecf0 !important; }
#blockspalette .categoryselector .catbkg { width:${2048 * scaleMultiplier}px !important; height:${128 * scaleMultiplier}px !important; background:#e9ecf0 !important; }
#blockspalette .categoryselector .catimage { display:none !important; }
#blockspalette .palette { display:block !important; width:100% !important; height:${row}px !important; margin:0 !important; overflow:hidden !important; }
#blockspalette .papercut { top:${row * 2}px !important; }
#blockspalette .controlundo { top:${7 * scaleMultiplier}px !important; right:${8 * scaleMultiplier}px !important; }
#scripts { background:#fff !important; left:0 !important; right:0 !important; overflow:hidden !important; }
`;
    document.head.appendChild(style);
}

function resizeScroll (scripts) {
    const scroll = scripts && (scripts.scroll || ScriptsPane.scroll);
    if (!scroll || !scroll.contents) return;
    const width = scripts.clientWidth;
    const height = scripts.clientHeight;
    scroll.contents.style.width = width + 'px';
    scroll.contents.style.height = height + 'px';
    if (scroll.repositionArrows) scroll.repositionArrows(height);
    if (scroll.update) scroll.update();
}

function layout () {
    const top = gn('topsection');
    const paletteBox = gn('blockspalette');
    const selectors = gn('selectors');
    const palette = gn('palette');
    const scripts = gn('scripts');
    if (!top || !paletteBox || !selectors || !palette || !scripts || !frame) return false;

    const row = Math.round(64 * scaleMultiplier);
    selectors.style.display = 'block';
    selectors.style.width = '100%';
    selectors.style.height = row + 'px';
    palette.style.display = 'block';
    palette.style.width = '100%';
    palette.style.height = row + 'px';
    paletteBox.style.height = (row * 2) + 'px';

    const scriptsTop = Math.round(top.offsetTop + top.offsetHeight + paletteBox.offsetHeight);
    const available = Math.max(1, Math.round(frame.clientHeight - scriptsTop));
    scripts.style.top = scriptsTop + 'px';
    scripts.style.height = available + 'px';
    scripts.style.bottom = 'auto';
    resizeScroll(scripts);
    return true;
}

function layoutWhenReady (attempt) {
    if (layout()) return;
    if (attempt > 180) return;
    clearTimeout(retryTimer);
    retryTimer = setTimeout(function () { layoutWhenReady(attempt + 1); }, 32);
}

function onResize () {
    layoutWhenReady(0);
}

export default class EditorLayout {
    static bootstrap () {
        if (bootstrapped) return;
        bootstrapped = true;
        installStyles();
    }

    static mount () {
        if (!bootstrapped) EditorLayout.bootstrap();
        if (!mounted) {
            mounted = true;
            layoutWhenReady(0);
        } else {
            layoutWhenReady(0);
        }
        if (!resizeBound) {
            resizeBound = true;
            window.addEventListener('resize', onResize);
            if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
        }
    }

    static relayout () { layoutWhenReady(0); }
}
