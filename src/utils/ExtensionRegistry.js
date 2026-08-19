import ScratchJr from '../editor/ScratchJr';
import BlockSpecs from '../editor/blocks/BlockSpecs';
import Prims from '../editor/engine/Prims';

const STORAGE_KEY = 'webjr-extension-sources-v1';
const EXTENSION_CATEGORY_INDEX = 6;
const extensions = {};
const blocks = {};
let blockOrder = [];
let bootstrapped = false;
let currentSourceIds = null;

function safeId (value, fallback) {
    const id = String(value || fallback || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
    return id.replace(/^-|-$/g, '').slice(0, 48);
}

function escapeXml (value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function svgImage (label, fill, stroke, textColor, size) {
    const px = size || 48;
    const text = String(label || '＋').slice(0, 2);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 48 48">' +
        '<rect x="4" y="4" width="40" height="40" rx="12" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"/>' +
        '<text x="24" y="30" text-anchor="middle" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="' + textColor + '">' + escapeXml(text) + '</text>' +
        '</svg>';
    const img = document.createElement('img');
    img.width = px;
    img.height = px;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return img;
}

function categoryIcon (on) {
    const fill = on ? '#8f56e3' : '#d9d4e8';
    const stroke = on ? '#6d3fc7' : '#8b8398';
    const text = on ? '#ffffff' : '#5d5768';
    return svgImage('＋', fill, stroke, text, 52);
}

function loadSources () {
    try {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(value) ? value : [];
    } catch (e) {
        return [];
    }
}

function saveSources (list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {} // eslint-disable-line no-empty
}

function blockTheme (name) {
    switch (String(name || '').toLowerCase()) {
    case 'motion':
    case 'blue':
        return [BlockSpecs.blueCmd, BlockSpecs.blueCmdH, BlockSpecs.cmdS];
    case 'sound':
    case 'green':
    case 'lime':
        return [BlockSpecs.limeCmd, BlockSpecs.limeCmdH, BlockSpecs.cmdS];
    case 'flow':
    case 'orange':
        return [BlockSpecs.orangeCmd, BlockSpecs.orangeCmdH, BlockSpecs.cmdS];
    case 'events':
    case 'yellow':
        return [BlockSpecs.yellowCmd, BlockSpecs.yellowCmdH, BlockSpecs.cmdS];
    case 'looks':
    case 'pink':
    case 'purple':
    default:
        return [BlockSpecs.pinkCmd, BlockSpecs.pinkCmdH, BlockSpecs.cmdS];
    }
}

function normalizeArg (arg) {
    if (!arg) return {type: null, initial: null, min: null, max: null};
    if (typeof arg === 'string') arg = {type: arg};
    const type = String(arg.type || '').toLowerCase();
    if (type === 'text' || type === 'string' || type === 't') {
        return {type: 't', initial: arg.default == null ? '' : String(arg.default), min: null, max: null};
    }
    if (type === 'number' || type === 'n') {
        const value = Number(arg.default == null ? 0 : arg.default);
        return {
            type: 'n',
            initial: isNaN(value) ? 0 : value,
            min: arg.min == null ? -9999 : Number(arg.min),
            max: arg.max == null ? 9999 : Number(arg.max)
        };
    }
    return {type: null, initial: null, min: null, max: null};
}

function makeBlockSpec (info) {
    const theme = blockTheme(info.theme);
    const arg = normalizeArg(info.arg);
    const icon = svgImage(info.icon || info.label || '＋', '#ffffff', '#ffffff', '#5b4b67', 42);
    return [info.fullOpcode, icon, theme[0], arg.type, arg.initial, theme[1], arg.min, arg.max, theme[2]];
}

function removeExtensionRuntime (id) {
    const old = extensions[id];
    if (!old) return;
    old.blocks.forEach(info => {
        delete blocks[info.fullOpcode];
        blockOrder = blockOrder.filter(op => op !== info.fullOpcode);
        if (BlockSpecs.defs) delete BlockSpecs.defs[info.fullOpcode];
        if (Prims.table) delete Prims.table[info.fullOpcode];
    });
    if (BlockSpecs.palettes && BlockSpecs.palettes[EXTENSION_CATEGORY_INDEX]) {
        BlockSpecs.palettes[EXTENSION_CATEGORY_INDEX] = blockOrder.concat();
    }
}

function extensionContext (strip, info) {
    const block = strip.thisblock;
    return {
        arg: block.getArgValue(),
        value: block.getArgValue(),
        sprite: strip.spr,
        stage: ScratchJr.stage,
        block: block,
        thread: strip,
        ScratchJr: ScratchJr,
        extension: extensions[info.extensionId]
    };
}

function primitiveFor (info) {
    return function (strip) {
        const block = strip.thisblock;
        const stateKey = '__webjrExtensionState';
        const state = strip[stateKey];
        if (state && state.block === block) {
            if (!state.done) {
                strip.waitTimer = 1;
                return;
            }
            delete strip[stateKey];
            strip.thisblock = block.next;
            if (ScratchJr.runtime) ScratchJr.runtime.yield = true;
            return;
        }

        let result;
        try {
            result = info.run(extensionContext(strip, info));
        } catch (e) {
            console.error('Webjr extension block failed:', info.fullOpcode, e); // eslint-disable-line no-console
            strip.thisblock = block.next;
            return;
        }

        if (result && typeof result.then === 'function') {
            const asyncState = {block: block, done: false};
            strip[stateKey] = asyncState;
            Promise.resolve(result).then(function () {
                asyncState.done = true;
            }).catch(function (e) {
                console.error('Webjr async extension block failed:', info.fullOpcode, e); // eslint-disable-line no-console
                asyncState.done = true;
            });
            strip.waitTimer = 1;
            return;
        }

        strip.thisblock = block.next;
    };
}

function installBlockRuntime (info) {
    if (BlockSpecs.defs) BlockSpecs.defs[info.fullOpcode] = makeBlockSpec(info);
    if (Prims.table) Prims.table[info.fullOpcode] = primitiveFor(info);
}

function syncPalette () {
    if (!BlockSpecs.palettes) return;
    if (!BlockSpecs.palettes[EXTENSION_CATEGORY_INDEX]) BlockSpecs.palettes[EXTENSION_CATEGORY_INDEX] = [];
    BlockSpecs.palettes[EXTENSION_CATEGORY_INDEX] = blockOrder.concat();
}

function register (descriptor) {
    if (!descriptor || typeof descriptor !== 'object') throw new Error('extension descriptor is required');
    const id = safeId(descriptor.id, descriptor.name);
    if (!id) throw new Error('extension id is required');
    const sourceBlocks = Array.isArray(descriptor.blocks) ? descriptor.blocks : [];
    if (sourceBlocks.length > 64) throw new Error('an extension can contain at most 64 blocks');

    removeExtensionRuntime(id);
    const normalized = {
        id: id,
        name: String(descriptor.name || id),
        version: String(descriptor.version || '1.0.0'),
        description: String(descriptor.description || ''),
        blocks: []
    };

    sourceBlocks.forEach((item, index) => {
        if (!item || typeof item !== 'object') return;
        const opcode = safeId(item.opcode, 'block-' + index);
        if (!opcode) return;
        const fullOpcode = 'webjr_' + id + '_' + opcode;
        const runner = item.run || item.handler;
        if (typeof runner !== 'function') return;
        const info = {
            extensionId: id,
            opcode: opcode,
            fullOpcode: fullOpcode,
            label: String(item.label || opcode),
            description: String(item.description || item.label || opcode),
            icon: String(item.icon || item.label || '+').slice(0, 2),
            theme: item.theme || descriptor.theme || 'purple',
            arg: item.arg || null,
            run: runner
        };
        normalized.blocks.push(info);
        blocks[fullOpcode] = info;
        blockOrder.push(fullOpcode);
        installBlockRuntime(info);
    });

    extensions[id] = normalized;
    if (currentSourceIds && currentSourceIds.indexOf(id) < 0) currentSourceIds.push(id);
    syncPalette();
    document.dispatchEvent(new CustomEvent('webjr-extension-change', {detail: {id: id}}));
    return normalized;
}

function evaluateSource (source, sourceName) {
    currentSourceIds = [];
    try {
        const run = new Function('window', 'WebjrExtensions', String(source) + '\n//# sourceURL=' + String(sourceName || 'webjr-extension.js').replace(/\s/g, '_')); // eslint-disable-line no-new-func
        run(window, window.WebjrExtensions);
        return currentSourceIds.concat();
    } finally {
        currentSourceIds = null;
    }
}

function installSource (source, sourceName) {
    const ids = evaluateSource(source, sourceName);
    if (ids.length < 1) throw new Error('WebjrExtensions.register(...) が呼ばれていません');
    let list = loadSources();
    list = list.filter(item => !item.ids || !item.ids.some(id => ids.indexOf(id) > -1));
    list.push({
        key: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
        name: String(sourceName || ids[0] + '.js'),
        source: String(source),
        ids: ids
    });
    saveSources(list);
    return ids;
}

function restoreSources () {
    loadSources().forEach(item => {
        try {
            evaluateSource(item.source, item.name);
        } catch (e) {
            console.error('Could not load Webjr extension:', item.name, e); // eslint-disable-line no-console
        }
    });
}

function patchBlockSpecs () {
    const originalDefs = BlockSpecs.setupBlocksSpecs;
    BlockSpecs.setupBlocksSpecs = function () {
        const defs = originalDefs.call(BlockSpecs);
        blockOrder.forEach(op => {
            if (blocks[op]) defs[op] = makeBlockSpec(blocks[op]);
        });
        return defs;
    };

    const originalPalettes = BlockSpecs.setupPalettesDef;
    BlockSpecs.setupPalettesDef = function () {
        const palettes = originalPalettes.call(BlockSpecs);
        palettes.push(blockOrder.concat());
        return palettes;
    };

    const originalCategories = BlockSpecs.setupCategories;
    BlockSpecs.setupCategories = function () {
        const categories = originalCategories.call(BlockSpecs);
        categories.push([categoryIcon(true), categoryIcon(false), '#8f56e3']);
        return categories;
    };

    const originalDesc = BlockSpecs.blockDesc;
    BlockSpecs.blockDesc = function (block, sprite) {
        const result = originalDesc.call(BlockSpecs, block, sprite) || {};
        const info = blocks[block.blocktype];
        if (info) result[block.blocktype] = info.description;
        return result;
    };
}

function patchPrims () {
    const originalInit = Prims.init;
    Prims.init = function () {
        originalInit.call(Prims);
        blockOrder.forEach(op => {
            if (blocks[op]) Prims.table[op] = primitiveFor(blocks[op]);
        });
    };
}

export default class ExtensionRegistry {
    static get categoryIndex () { return EXTENSION_CATEGORY_INDEX; }

    static bootstrap () {
        if (bootstrapped) return;
        bootstrapped = true;
        window.WebjrExtensions = {
            version: 1,
            register: register,
            installSource: installSource,
            list: () => ExtensionRegistry.list()
        };
        patchBlockSpecs();
        patchPrims();
        restoreSources();
    }

    static installSource (source, sourceName) {
        return installSource(source, sourceName);
    }

    static list () {
        return Object.keys(extensions).map(id => {
            const ext = extensions[id];
            return {id: ext.id, name: ext.name, version: ext.version, description: ext.description, blocks: ext.blocks.length};
        });
    }

    static sources () {
        return loadSources().map(item => ({key: item.key, name: item.name, ids: item.ids || []}));
    }
}
