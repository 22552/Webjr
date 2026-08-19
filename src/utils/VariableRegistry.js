import ScratchJr from '../editor/ScratchJr';
import BlockSpecs from '../editor/blocks/BlockSpecs';
import Prims from '../editor/engine/Prims';
import Project from '../editor/ui/Project';
import Palette from '../editor/ui/Palette';

const VARIABLE_CATEGORY_INDEX = 7;
const variables = [];
const blockInfo = {};
let blockOrder = [];
let bootstrapped = false;
let idCounter = 0;

function safeId (value) {
    const base = String(value || 'variable').toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'variable';
    let candidate;
    do {
        idCounter++;
        candidate = base + '-' + idCounter.toString(36);
    } while (variables.some(item => item.id === candidate));
    return candidate;
}

function escapeXml (value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function svgIcon (label, on, size) {
    const px = size || 48;
    const text = String(label || 'V').slice(0, 3);
    const fill = on ? '#f39a36' : '#ead7bf';
    const stroke = on ? '#c87821' : '#a68f73';
    const color = on ? '#ffffff' : '#665642';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px + '" viewBox="0 0 48 48">' +
        '<rect x="4" y="4" width="40" height="40" rx="12" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3"/>' +
        '<text x="24" y="29" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" font-weight="700" fill="' + color + '">' + escapeXml(text) + '</text>' +
        '</svg>';
    const img = document.createElement('img');
    img.width = px;
    img.height = px;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    return img;
}

function categoryIcon (on) {
    return svgIcon('V', on, 52);
}

function normalizeValue (value) {
    if (typeof value === 'number') return value;
    const text = String(value == null ? '' : value);
    const trimmed = text.trim();
    if (trimmed !== '' && /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return Number(trimmed);
    return text;
}

function findVariable (idOrName) {
    return variables.find(item => item.id === idOrName || item.name === idOrName);
}

function ensureMonitorRoot () {
    const stage = document.getElementById('stageframe');
    if (!stage) return null;
    let root = document.getElementById('webjr-variable-monitors');
    if (!root) {
        root = document.createElement('div');
        root.id = 'webjr-variable-monitors';
        root.style.position = 'absolute';
        root.style.left = '8px';
        root.style.top = '8px';
        root.style.zIndex = '9000';
        root.style.display = 'flex';
        root.style.flexDirection = 'column';
        root.style.gap = '4px';
        root.style.pointerEvents = 'none';
        stage.appendChild(root);
    }
    return root;
}

function refreshMonitors () {
    const root = ensureMonitorRoot();
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    variables.filter(v => v.visible).forEach(variable => {
        const row = document.createElement('div');
        row.style.padding = '4px 8px';
        row.style.borderRadius = '8px';
        row.style.background = '#f39a36';
        row.style.color = '#fff';
        row.style.font = '700 12px Roboto,Arial,sans-serif';
        row.style.boxShadow = '0 1px 3px rgba(0,0,0,.25)';
        row.textContent = variable.name + ': ' + String(variable.value);
        root.appendChild(row);
    });
}

function blockTheme () {
    return [BlockSpecs.orangeCmd, BlockSpecs.orangeCmdH, BlockSpecs.cmdS];
}

function makeSpec (info) {
    const theme = blockTheme();
    return [
        info.opcode,
        svgIcon(info.icon, true, 42),
        theme[0],
        info.argType,
        info.defaultValue,
        theme[1],
        info.min,
        info.max,
        theme[2]
    ];
}

function primitive (info) {
    return function (strip) {
        const variable = findVariable(info.variableId);
        if (!variable) {
            strip.thisblock = strip.thisblock.next;
            return;
        }
        const arg = strip.thisblock.getArgValue();
        if (info.action === 'set') {
            variable.value = normalizeValue(arg);
            ScratchJr.changed = true;
            refreshMonitors();
        } else if (info.action === 'change') {
            const current = Number(variable.value);
            const delta = Number(arg);
            variable.value = (isNaN(current) ? 0 : current) + (isNaN(delta) ? 0 : delta);
            ScratchJr.changed = true;
            refreshMonitors();
        } else if (info.action === 'show') {
            variable.visible = true;
            ScratchJr.changed = true;
            refreshMonitors();
        } else if (info.action === 'hide') {
            variable.visible = false;
            ScratchJr.changed = true;
            refreshMonitors();
        }
        strip.thisblock = strip.thisblock.next;
    };
}

function addBlock (variable, action, label, iconLabel, argType, defaultValue, min, max) {
    const opcode = 'webjr_var_' + variable.id + '_' + action;
    const info = {
        opcode: opcode,
        variableId: variable.id,
        action: action,
        label: label,
        icon: iconLabel,
        argType: argType,
        defaultValue: defaultValue,
        min: min,
        max: max
    };
    blockInfo[opcode] = info;
    blockOrder.push(opcode);
    if (BlockSpecs.defs) BlockSpecs.defs[opcode] = makeSpec(info);
    if (Prims.table) Prims.table[opcode] = primitive(info);
}

function installVariable (variable) {
    const prefix = variable.name.length > 4 ? variable.name.slice(0, 4) : variable.name;
    addBlock(variable, 'set', variable.name + ' を', prefix + '=', 't', String(variable.value == null ? '' : variable.value), null, null);
    addBlock(variable, 'change', variable.name + ' を増やす', prefix + '+', 'n', 1, -9999, 9999);
    addBlock(variable, 'show', variable.name + ' を表示', prefix + '◉', null, null, null, null);
    addBlock(variable, 'hide', variable.name + ' を隠す', prefix + '×', null, null, null, null);
}

function syncPalette () {
    if (!BlockSpecs.palettes) return;
    if (!BlockSpecs.palettes[VARIABLE_CATEGORY_INDEX]) BlockSpecs.palettes[VARIABLE_CATEGORY_INDEX] = [];
    BlockSpecs.palettes[VARIABLE_CATEGORY_INDEX] = blockOrder.concat();
}

function clearRuntime () {
    blockOrder.forEach(opcode => {
        if (BlockSpecs.defs) delete BlockSpecs.defs[opcode];
        if (Prims.table) delete Prims.table[opcode];
        delete blockInfo[opcode];
    });
    blockOrder = [];
    variables.splice(0, variables.length);
}

function loadVariables (data) {
    clearRuntime();
    const list = Array.isArray(data) ? data : [];
    list.forEach(raw => {
        const variable = {
            id: String(raw.id || safeId(raw.name)),
            name: String(raw.name || 'variable').slice(0, 24),
            value: raw.value == null ? 0 : raw.value,
            visible: !!raw.visible
        };
        variables.push(variable);
        installVariable(variable);
    });
    syncPalette();
    setTimeout(refreshMonitors, 0);
}

function createVariable (name, initialValue) {
    const cleanName = String(name || '').trim().slice(0, 24);
    if (!cleanName) throw new Error('変数名が必要です');
    if (findVariable(cleanName)) throw new Error('同じ名前の変数があります');
    const variable = {
        id: safeId(cleanName),
        name: cleanName,
        value: normalizeValue(initialValue == null ? 0 : initialValue),
        visible: false
    };
    variables.push(variable);
    installVariable(variable);
    syncPalette();
    ScratchJr.changed = true;
    document.dispatchEvent(new CustomEvent('webjr-variable-change', {detail: {id: variable.id}}));
    return variable;
}

function patchProject () {
    const originalGetProject = Project.getProject;
    Project.getProject = function (pageid) {
        const data = originalGetProject.call(Project, pageid);
        data.webjrVariables = variables.map(v => ({id: v.id, name: v.name, value: v.value, visible: !!v.visible}));
        return data;
    };

    const originalRecreate = Project.recreate;
    Project.recreate = function (data) {
        loadVariables(data && data.webjrVariables);
        return originalRecreate.call(Project, data);
    };
}

function patchBlockSpecs () {
    const originalPalettes = BlockSpecs.setupPalettesDef;
    BlockSpecs.setupPalettesDef = function () {
        const palettes = originalPalettes.call(BlockSpecs);
        palettes.push(blockOrder.concat());
        return palettes;
    };

    const originalCategories = BlockSpecs.setupCategories;
    BlockSpecs.setupCategories = function () {
        const categories = originalCategories.call(BlockSpecs);
        categories.push([categoryIcon(true), categoryIcon(false), '#f39a36']);
        return categories;
    };

    const originalDefs = BlockSpecs.setupBlocksSpecs;
    BlockSpecs.setupBlocksSpecs = function () {
        const defs = originalDefs.call(BlockSpecs);
        blockOrder.forEach(opcode => {
            if (blockInfo[opcode]) defs[opcode] = makeSpec(blockInfo[opcode]);
        });
        return defs;
    };

    const originalDesc = BlockSpecs.blockDesc;
    BlockSpecs.blockDesc = function (block, sprite) {
        const result = originalDesc.call(BlockSpecs, block, sprite) || {};
        const info = blockInfo[block.blocktype];
        if (info) result[block.blocktype] = info.label;
        return result;
    };
}

function patchPrims () {
    const originalInit = Prims.init;
    Prims.init = function () {
        originalInit.call(Prims);
        blockOrder.forEach(opcode => {
            if (blockInfo[opcode]) Prims.table[opcode] = primitive(blockInfo[opcode]);
        });
    };
}

function openManager () {
    const old = document.getElementById('webjr-variable-modal');
    if (old) old.remove();
    const modal = document.createElement('div');
    modal.id = 'webjr-variable-modal';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '35000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.background = 'rgba(55,68,78,.34)';

    const card = document.createElement('div');
    card.style.width = 'min(480px,92vw)';
    card.style.maxHeight = '82vh';
    card.style.overflow = 'auto';
    card.style.border = '2px solid #c68a4d';
    card.style.borderRadius = '18px';
    card.style.background = '#f7f7f2';
    card.style.boxShadow = '0 10px 30px rgba(30,60,80,.28)';

    const head = document.createElement('div');
    head.style.display = 'flex';
    head.style.alignItems = 'center';
    head.style.padding = '12px 14px';
    head.style.background = '#f39a36';
    head.style.color = '#fff';
    const title = document.createElement('strong');
    title.textContent = '変数';
    title.style.flex = '1';
    title.style.font = '700 20px Roboto,Arial,sans-serif';
    const close = document.createElement('button');
    close.textContent = '×';
    close.style.width = '36px';
    close.style.height = '36px';
    close.style.border = '2px solid rgba(255,255,255,.8)';
    close.style.borderRadius = '50%';
    close.style.background = 'transparent';
    close.style.color = '#fff';
    close.style.fontSize = '20px';
    close.onclick = function () { modal.remove(); };
    head.appendChild(title);
    head.appendChild(close);

    const body = document.createElement('div');
    body.style.padding = '14px';
    const form = document.createElement('div');
    form.style.display = 'grid';
    form.style.gridTemplateColumns = '1fr 110px auto';
    form.style.gap = '8px';
    const name = document.createElement('input');
    name.placeholder = '変数名';
    name.maxLength = 24;
    const value = document.createElement('input');
    value.placeholder = '初期値';
    const add = document.createElement('button');
    add.textContent = '＋';
    add.style.border = '0';
    add.style.borderRadius = '10px';
    add.style.background = '#f39a36';
    add.style.color = '#fff';
    add.style.fontWeight = '700';
    [name, value].forEach(input => {
        input.style.minHeight = '42px';
        input.style.boxSizing = 'border-box';
        input.style.border = '1px solid #cfd8de';
        input.style.borderRadius = '10px';
        input.style.padding = '0 10px';
        input.style.font = '15px Roboto,Arial,sans-serif';
    });
    const list = document.createElement('div');
    list.style.marginTop = '12px';

    function renderList () {
        while (list.firstChild) list.removeChild(list.firstChild);
        variables.forEach(variable => {
            const row = document.createElement('div');
            row.style.padding = '9px 10px';
            row.style.marginTop = '6px';
            row.style.border = '1px solid #e0d4c6';
            row.style.borderRadius = '10px';
            row.style.background = '#fff';
            row.textContent = variable.name + ' = ' + String(variable.value);
            list.appendChild(row);
        });
        if (!variables.length) {
            const empty = document.createElement('div');
            empty.style.padding = '14px';
            empty.style.textAlign = 'center';
            empty.style.color = '#7c878d';
            empty.textContent = 'まだ変数はありません';
            list.appendChild(empty);
        }
    }

    add.onclick = function () {
        try {
            createVariable(name.value, value.value);
            name.value = '';
            value.value = '';
            renderList();
            if (Palette.numcat === VARIABLE_CATEGORY_INDEX) Palette.selectCategory(VARIABLE_CATEGORY_INDEX);
        } catch (e) {
            window.alert(e.message);
        }
    };
    form.appendChild(name);
    form.appendChild(value);
    form.appendChild(add);
    body.appendChild(form);
    body.appendChild(list);
    card.appendChild(head);
    card.appendChild(body);
    modal.appendChild(card);
    document.body.appendChild(modal);
    modal.onclick = function (e) { if (e.target === modal) modal.remove(); };
    renderList();
}

export default class VariableRegistry {
    static get categoryIndex () { return VARIABLE_CATEGORY_INDEX; }

    static bootstrap () {
        if (bootstrapped) return;
        bootstrapped = true;
        patchBlockSpecs();
        patchPrims();
        patchProject();
        window.WebjrVariables = {
            create: createVariable,
            list: () => variables.map(v => ({id: v.id, name: v.name, value: v.value, visible: !!v.visible})),
            get: idOrName => {
                const v = findVariable(idOrName);
                return v ? v.value : undefined;
            },
            set: (idOrName, value) => {
                const v = findVariable(idOrName);
                if (!v) return false;
                v.value = normalizeValue(value);
                ScratchJr.changed = true;
                refreshMonitors();
                return true;
            },
            change: (idOrName, amount) => {
                const v = findVariable(idOrName);
                if (!v) return false;
                const current = Number(v.value);
                const delta = Number(amount);
                v.value = (isNaN(current) ? 0 : current) + (isNaN(delta) ? 0 : delta);
                ScratchJr.changed = true;
                refreshMonitors();
                return v.value;
            }
        };
    }

    static openManager () { openManager(); }
    static refreshMonitors () { refreshMonitors(); }
}
