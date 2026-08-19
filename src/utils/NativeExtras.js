import ScratchJr from '../editor/ScratchJr';
import Palette from '../editor/ui/Palette';
import Library from '../editor/ui/Library';
import OS from '../tablet/OS';
import IO from '../tablet/IO';
import ExtensionRegistry from './ExtensionRegistry';
import VariableRegistry from './VariableRegistry';
import {gn, newHTML, scaleMultiplier} from './lib';

let bootstrapped = false;
let mounted = false;
let libraryType = null;
let openGuard = 0;

function stopEvent (e) {
    if (!e) return;
    if (e.preventDefault) e.preventDefault();
    if (e.stopPropagation) e.stopPropagation();
}

function fakeEvent () {
    return {preventDefault: function () {}, stopPropagation: function () {}};
}

function installStyles () {
    if (document.getElementById('webjr-native-extras-style')) return;
    const style = document.createElement('style');
    style.id = 'webjr-native-extras-style';
    const rowHeight = 64 * scaleMultiplier;
    style.textContent = `
html.webjr, html.webjr body { background:#000 !important; min-height:100dvh !important; }
html.webjr-page-editor #frame { background:#000 !important; }
#webjr-menu { display:none !important; }
#webjr-landscape { background:rgba(70,130,181,.94) !important; border:1px solid rgba(255,255,255,.45); }
#webjr-sheet-bg { background:rgba(60,68,76,.35) !important; }
#webjr-sheet { background:#f7f7f2 !important; color:#4c4d4f !important; border:2px solid #b8c6cf !important; box-shadow:0 8px 25px rgba(30,60,80,.28) !important; }
#webjr-sheet h2 { color:#4682b5 !important; }
#webjr-sheet .sub { color:#7c868d !important; }
#webjr-fit-info { background:#e7eef2 !important; color:#586872 !important; }
.webjr-row { border-top:1px solid #d8dee2 !important; }
#webjr-fullscreen { background:#e8edf0 !important; color:#4c4d4f !important; }

/* Three rows: category types -> blocks -> code workspace. */
#blockspalette { height:${rowHeight * 2}px !important; min-height:${rowHeight * 2}px !important; overflow:visible !important; }
#blockspalette .categoryselector { display:block !important; width:100% !important; height:${rowHeight}px !important; overflow:hidden !important; background:#e9ecf0 !important; }
#blockspalette .categoryselector .catbkg { width:${2048 * scaleMultiplier}px !important; height:${128 * scaleMultiplier}px !important; background:#e9ecf0 !important; }
#blockspalette .categoryselector .catimage { display:none !important; }
#blockspalette .palette { display:block !important; width:100% !important; height:${rowHeight}px !important; margin:0 !important; overflow:hidden !important; }
#blockspalette .papercut { top:${rowHeight * 2}px !important; }
#blockspalette .controlundo { top:${rowHeight + 7 * scaleMultiplier}px !important; }
#scripts { background:#fff !important; }

.webjr-importicon { background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect x='8' y='11' width='48' height='42' rx='8' fill='%23fff' stroke='%234682b5' stroke-width='4'/%3E%3Cpath d='M15 44l11-12 8 8 7-7 9 11' fill='none' stroke='%234682b5' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='22' cy='23' r='4' fill='%23f9a737'/%3E%3Cpath d='M44 8v18m-7-7 7 7 7-7' fill='none' stroke='%23f9a737' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important; background-size:100% 100% !important; background-repeat:no-repeat !important; }
#webjr-extension-modal { position:fixed; inset:0; z-index:35000; display:flex; align-items:center; justify-content:center; padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left)); box-sizing:border-box; background:rgba(55,68,78,.34); font-family:Roboto,Arial,sans-serif; }
#webjr-extension-card { width:min(520px,94vw); max-height:min(620px,88vh); overflow:auto; background:#f7f7f2; color:#4c4d4f; border:2px solid #a8bbc6; border-radius:18px; box-shadow:0 10px 30px rgba(30,60,80,.28); }
#webjr-extension-head { display:flex; align-items:center; gap:10px; min-height:58px; padding:0 16px; background:#4682b5; color:#fff; border-radius:15px 15px 0 0; }
#webjr-extension-head h2 { flex:1; margin:0; color:#fff; font:700 20px/1.2 Roboto,Arial,sans-serif; }
.webjr-native-round { width:38px; height:38px; border:2px solid rgba(255,255,255,.75); border-radius:50%; background:rgba(255,255,255,.16); color:#fff; font:700 18px Arial,sans-serif; }
#webjr-extension-body { padding:14px 16px 18px; }
.webjr-native-callout { margin-bottom:12px; padding:10px 12px; border-radius:12px; background:#e7eef2; color:#5b6971; font-size:13px; line-height:1.35; }
.webjr-native-action { width:100%; min-height:48px; margin:4px 0 12px; border:0; border-radius:13px; background:#f9a737; color:#fff; font:700 16px Roboto,Arial,sans-serif; box-shadow:inset 0 -2px 0 rgba(0,0,0,.12); }
.webjr-ext-list { display:flex; flex-direction:column; gap:8px; }
.webjr-ext-item { display:flex; align-items:center; gap:10px; min-height:48px; padding:8px 10px; border:1px solid #d4dde2; border-radius:12px; background:#fff; }
.webjr-ext-icon { width:34px; height:34px; display:grid; place-items:center; flex:0 0 auto; border-radius:10px; background:#8f56e3; color:#fff; font:700 18px Arial,sans-serif; }
.webjr-ext-meta { min-width:0; flex:1; }
.webjr-ext-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:700; }
.webjr-ext-sub { color:#7c878d; font-size:12px; }
.webjr-ext-empty { padding:18px 8px; text-align:center; color:#7c878d; }
.webjr-cat-plus { position:absolute; right:0; bottom:1px; z-index:30; display:grid; place-items:center; width:18px; height:18px; border:2px solid #fff; border-radius:50%; background:#f9a737; color:#fff; font:700 15px/14px Arial,sans-serif; box-shadow:0 1px 3px rgba(0,0,0,.24); }
`;
    document.head.appendChild(style);
}

function spriteName (file) {
    let name = String(file && file.name ? file.name : 'Sprite').replace(/\.[^.]+$/, '');
    name = name.replace(/[\\/:*?"<>|]/g, '').trim();
    return (name || 'Sprite').slice(0, 30);
}

function containThumbnail (img, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const scale = Math.min(width / img.width, height / img.height);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const x = Math.round((width - w) / 2);
    const y = Math.round((height - h) / 2);
    ctx.drawImage(img, 0, 0, img.width, img.height, x, y, w, h);
    return canvas;
}

function saveImportedSprite (img, file) {
    const maxDimension = 360;
    const targetDisplayMax = 140;
    const shrink = Math.min(1, maxDimension / img.naturalWidth, maxDimension / img.naturalHeight);
    const width = Math.max(1, Math.round(img.naturalWidth * shrink));
    const height = Math.max(1, Math.round(img.naturalHeight * shrink));
    const spriteScale = Math.min(1, targetDisplayMax / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const pngData = canvas.toDataURL('image/png');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
        '<image width="' + width + '" height="' + height + '" preserveAspectRatio="xMidYMid meet" xlink:href="' + pngData + '" href="' + pngData + '"/></svg>';
    const name = spriteName(file);

    IO.setMedia(svg, 'svg', function (md5) {
        if (!md5 || md5 === '-1') return;
        const thumb = containThumbnail(canvas, 120, 90);
        const thumbBase64 = thumb.toDataURL('image/png').split(',')[1];
        OS.setmedia(thumbBase64, 'png', function (pngmd5) {
            const json = {};
            const keylist = ['scale', 'md5', 'altmd5', 'version', 'width', 'height', 'ext', 'name'];
            json.values = [String(spriteScale), md5, pngmd5, ScratchJr.version, String(width), String(height), 'svg', name];
            json.stmt = 'insert into usershapes (' + keylist.toString() + ') values (?,?,?,?,?,?,?,?)';
            OS.stmt(json, function () {
                if (ScratchJr.stage && ScratchJr.stage.currentPage) {
                    ScratchJr.stage.currentPage.addSprite(spriteScale, md5, name);
                }
                if (gn('libframe') && gn('libframe').className.indexOf('appear') > -1) Library.close(fakeEvent());
            });
        });
    });
}

function readSpriteFile (file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
        window.alert('画像は10MB以下にしてください。');
        return;
    }
    if (file.type && file.type.indexOf('image/') !== 0) {
        window.alert('画像ファイルを選んでください。');
        return;
    }
    const reader = new FileReader();
    reader.onload = function () {
        const img = document.createElement('img');
        img.onload = function () {
            if (!img.naturalWidth || !img.naturalHeight) {
                window.alert('この画像は読み込めませんでした。');
                return;
            }
            try {
                saveImportedSprite(img, file);
            } catch (e) {
                console.error(e); // eslint-disable-line no-console
                window.alert('この画像は読み込めませんでした。');
            }
        };
        img.onerror = function () { window.alert('この画像は読み込めませんでした。'); };
        img.src = reader.result;
    };
    reader.onerror = function () { window.alert('ファイルを読み込めませんでした。'); };
    reader.readAsDataURL(file);
}

function chooseSpriteFile () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = function () {
        const file = input.files && input.files[0];
        input.remove();
        if (file) readSpriteFile(file);
    };
    input.click();
}

function installLibraryImportButton () {
    const actions = gn('libactions');
    if (!actions || gn('webjr-import-sprite')) return;
    const buttons = actions.querySelector('.bkgbuttons');
    if (!buttons) return;
    buttons.style.width = (307 * scaleMultiplier) + 'px';
    const button = newHTML('div', 'painticon webjr-importicon', buttons);
    button.id = 'webjr-import-sprite';
    button.title = 'ファイルからキャラクターを追加';
    button.onclick = function (e) {
        stopEvent(e);
        if (libraryType !== 'costumes') return;
        chooseSpriteFile();
    };
}

function patchLibrary () {
    const originalLayout = Library.layoutHeader;
    Library.layoutHeader = function () {
        originalLayout.call(Library);
        installLibraryImportButton();
    };
    const originalOpen = Library.open;
    Library.open = function (libType) {
        libraryType = libType;
        const result = originalOpen.call(Library, libType);
        const button = gn('webjr-import-sprite');
        if (button) button.style.display = libType === 'costumes' ? 'inline-block' : 'none';
        return result;
    };
}

function readExtensionFile (file) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
        window.alert('拡張機能ファイルは1MB以下にしてください。');
        return;
    }
    const reader = new FileReader();
    reader.onload = function () {
        try {
            ExtensionRegistry.installSource(String(reader.result || ''), file.name);
            refreshManagerList();
            Palette.selectCategory(ExtensionRegistry.categoryIndex);
        } catch (e) {
            console.error(e); // eslint-disable-line no-console
            window.alert('拡張機能を読み込めませんでした: ' + e.message);
        }
    };
    reader.readAsText(file);
}

function chooseExtensionFile () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.js,text/javascript,application/javascript';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = function () {
        const file = input.files && input.files[0];
        input.remove();
        if (file) readExtensionFile(file);
    };
    input.click();
}

function refreshManagerList () {
    const list = document.getElementById('webjr-ext-list');
    if (!list) return;
    const extensions = ExtensionRegistry.list();
    while (list.firstChild) list.removeChild(list.firstChild);
    if (extensions.length < 1) {
        const empty = document.createElement('div');
        empty.className = 'webjr-ext-empty';
        empty.textContent = 'まだ拡張機能はありません';
        list.appendChild(empty);
        return;
    }
    extensions.forEach(ext => {
        const row = document.createElement('div');
        row.className = 'webjr-ext-item';
        const icon = document.createElement('div');
        icon.className = 'webjr-ext-icon';
        icon.textContent = '＋';
        const meta = document.createElement('div');
        meta.className = 'webjr-ext-meta';
        const name = document.createElement('div');
        name.className = 'webjr-ext-name';
        name.textContent = ext.name;
        const sub = document.createElement('div');
        sub.className = 'webjr-ext-sub';
        sub.textContent = 'v' + ext.version + ' · ' + ext.blocks + ' blocks';
        meta.appendChild(name);
        meta.appendChild(sub);
        row.appendChild(icon);
        row.appendChild(meta);
        list.appendChild(row);
    });
}

function openSettings () {
    const modal = document.getElementById('webjr-extension-modal');
    if (modal) modal.remove();
    const sheet = document.getElementById('webjr-sheet-bg');
    if (sheet) sheet.classList.add('open');
}

function openExtensionManager (e) {
    stopEvent(e);
    const now = Date.now();
    if (now - openGuard < 300) return;
    openGuard = now;
    if (document.getElementById('webjr-extension-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'webjr-extension-modal';
    const card = document.createElement('div');
    card.id = 'webjr-extension-card';
    const head = document.createElement('div');
    head.id = 'webjr-extension-head';
    const title = document.createElement('h2');
    title.textContent = '拡張機能';
    const settings = document.createElement('button');
    settings.className = 'webjr-native-round';
    settings.textContent = '⚙';
    settings.title = 'Webjr設定';
    settings.onclick = openSettings;
    const close = document.createElement('button');
    close.className = 'webjr-native-round';
    close.textContent = '×';
    close.onclick = function () { modal.remove(); };
    head.appendChild(title);
    head.appendChild(settings);
    head.appendChild(close);

    const body = document.createElement('div');
    body.id = 'webjr-extension-body';
    const note = document.createElement('div');
    note.className = 'webjr-native-callout';
    note.textContent = 'Webjr用の .js 拡張を追加できます。number / text 引数に対応しています。選んだJSはWebjr内で実行されます。';
    const add = document.createElement('button');
    add.className = 'webjr-native-action';
    add.textContent = '＋ ファイルから拡張機能を追加';
    add.onclick = chooseExtensionFile;
    const list = document.createElement('div');
    list.id = 'webjr-ext-list';
    list.className = 'webjr-ext-list';
    body.appendChild(note);
    body.appendChild(add);
    body.appendChild(list);
    card.appendChild(head);
    card.appendChild(body);
    modal.appendChild(card);
    document.body.appendChild(modal);
    modal.onclick = function (event) { if (event.target === modal) modal.remove(); };
    refreshManagerList();
}

function addCategoryBadge (index, text, title, handler) {
    const selectors = gn('selectors');
    if (!selectors) return false;
    const selector = selectors.childNodes[index + 1];
    if (!selector) return false;
    const id = 'webjr-cat-badge-' + index;
    if (document.getElementById(id)) return true;
    const badge = document.createElement('div');
    badge.id = id;
    badge.className = 'webjr-cat-plus';
    badge.textContent = text;
    badge.title = title;
    badge.ontouchstart = handler;
    badge.onmousedown = handler;
    selector.appendChild(badge);
    return true;
}

function fitNativeCategories () {
    const selectors = gn('selectors');
    const palette = gn('palette');
    if (!selectors || !palette) return false;
    selectors.style.width = '100%';
    palette.style.width = '100%';
    addCategoryBadge(ExtensionRegistry.categoryIndex, '+', '拡張機能を追加', openExtensionManager);
    addCategoryBadge(VariableRegistry.categoryIndex, '+', '変数を作る', function (e) {
        stopEvent(e);
        VariableRegistry.openManager();
    });
    return true;
}

function mountWhenReady (attempt) {
    if (fitNativeCategories()) return;
    if (attempt > 120) return;
    window.setTimeout(function () { mountWhenReady(attempt + 1); }, 32);
}

export default class NativeExtras {
    static bootstrap () {
        if (bootstrapped) return;
        bootstrapped = true;
        installStyles();
        patchLibrary();
    }

    static mountEditor () {
        if (mounted) return;
        mounted = true;
        mountWhenReady(0);
        document.addEventListener('webjr-extension-change', function () {
            fitNativeCategories();
            if (Palette.numcat === ExtensionRegistry.categoryIndex) Palette.selectCategory(ExtensionRegistry.categoryIndex);
        });
        document.addEventListener('webjr-variable-change', function () {
            fitNativeCategories();
            if (Palette.numcat === VariableRegistry.categoryIndex) Palette.selectCategory(VariableRegistry.categoryIndex);
        });
    }
}
