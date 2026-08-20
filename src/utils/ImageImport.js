import ScratchJr from '../editor/ScratchJr';
import Library from '../editor/ui/Library';
import OS from '../tablet/OS';
import IO from '../tablet/IO';
import {gn} from './lib';

let bootstrapped = false;

const ACCEPT = [
    'image/*',
    '.png', '.jpg', '.jpeg', '.jfif', '.pjp', '.pjpeg',
    '.webp', '.gif', '.svg', '.avif', '.bmp', '.ico',
    '.heic', '.heif', '.tif', '.tiff'
].join(',');

function fakeEvent () {
    return {preventDefault: function () {}, stopPropagation: function () {}};
}

function spriteName (file) {
    let name = String(file && file.name ? file.name : 'Sprite').replace(/\.[^.]+$/, '');
    name = name.replace(/[\\/:*?"<>|]/g, '').trim();
    return (name || 'Sprite').slice(0, 30);
}

function thumbnail (source, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const sw = source.width || source.naturalWidth;
    const sh = source.height || source.naturalHeight;
    const scale = Math.min(width / sw, height / sh);
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const x = Math.round((width - w) / 2);
    const y = Math.round((height - h) / 2);
    canvas.getContext('2d').drawImage(source, 0, 0, sw, sh, x, y, w, h);
    return canvas;
}

function saveSource (source, file) {
    const sourceWidth = source.width || source.naturalWidth;
    const sourceHeight = source.height || source.naturalHeight;
    if (!sourceWidth || !sourceHeight) throw new Error('invalid image dimensions');

    // Keep imported raster data reasonably sharp while avoiding huge embedded PNGs in SVG media.
    const maxDimension = 512;
    // Keep newly imported sprites compact on the 480x360 stage; users can enlarge them afterwards.
    const targetDisplayMax = 64;
    const shrink = Math.min(1, maxDimension / sourceWidth, maxDimension / sourceHeight);
    const width = Math.max(1, Math.round(sourceWidth * shrink));
    const height = Math.max(1, Math.round(sourceHeight * shrink));
    const spriteScale = Math.min(1, targetDisplayMax / Math.max(width, height));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, sourceWidth, sourceHeight, 0, 0, width, height);
    const pngData = canvas.toDataURL('image/png');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMidYMid meet">' +
        '<image width="' + width + '" height="' + height + '" preserveAspectRatio="xMidYMid meet" xlink:href="' + pngData + '" href="' + pngData + '"/></svg>';
    const name = spriteName(file);

    IO.setMedia(svg, 'svg', function (md5) {
        if (!md5 || md5 === '-1') {
            window.alert('画像を保存できませんでした。');
            return;
        }
        const thumb = thumbnail(canvas, 120, 90);
        const thumbBase64 = thumb.toDataURL('image/png').split(',')[1];
        OS.setmedia(thumbBase64, 'png', function (pngmd5) {
            const json = {};
            const keys = ['scale', 'md5', 'altmd5', 'version', 'width', 'height', 'ext', 'name'];
            json.values = [String(spriteScale), md5, pngmd5, ScratchJr.version, String(width), String(height), 'svg', name];
            json.stmt = 'insert into usershapes (' + keys.toString() + ') values (?,?,?,?,?,?,?,?)';
            OS.stmt(json, function () {
                if (ScratchJr.stage && ScratchJr.stage.currentPage) {
                    ScratchJr.stage.currentPage.addSprite(spriteScale, md5, name);
                }
                if (gn('libframe') && gn('libframe').className.indexOf('appear') > -1) Library.close(fakeEvent());
            });
        });
    });
}

function decodeWithImage (file) {
    return new Promise(function (resolve, reject) {
        const reader = new FileReader();
        reader.onerror = reject;
        reader.onload = function () {
            const img = document.createElement('img');
            img.onload = function () { resolve(img); };
            img.onerror = reject;
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function decodeFile (file) {
    if (window.createImageBitmap) {
        return window.createImageBitmap(file).catch(function () {
            return decodeWithImage(file);
        });
    }
    return decodeWithImage(file);
}

function chooseFile () {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPT;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = function () {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
            window.alert('画像は25MB以下にしてください。');
            return;
        }
        decodeFile(file).then(function (source) {
            try {
                saveSource(source, file);
            } catch (e) {
                console.error(e); // eslint-disable-line no-console
                window.alert('この画像は読み込めませんでした。');
            } finally {
                if (source && source.close) source.close();
            }
        }).catch(function () {
            window.alert('この形式は現在のブラウザではデコードできません。');
        });
    };
    input.click();
}

function wireButton () {
    const button = gn('webjr-import-sprite');
    if (!button) return false;
    button.title = '画像ファイルからキャラクターを追加';
    button.onclick = function (e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        chooseFile();
    };
    return true;
}

export default class ImageImport {
    static bootstrap () {
        if (bootstrapped) return;
        bootstrapped = true;
        const originalLayout = Library.layoutHeader;
        Library.layoutHeader = function () {
            const result = originalLayout.apply(Library, arguments);
            wireButton();
            return result;
        };
        const originalOpen = Library.open;
        Library.open = function () {
            const result = originalOpen.apply(Library, arguments);
            window.setTimeout(wireButton, 0);
            return result;
        };
    }

    static wire () { return wireButton(); }
}
