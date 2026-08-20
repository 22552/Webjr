import ScratchJr from '../editor/ScratchJr';
import Block from '../editor/blocks/Block';
import Project from '../editor/ui/Project';
import VariableRegistry from './VariableRegistry';

let bootstrapped = false;
let encodingProject = 0;
let pendingVariable = null;

function api () {
    return window.WebjrVariables;
}

function variableByNameOrId (name) {
    const variables = api() && api().list ? api().list() : [];
    return variables.find(function (item) {
        return item.id === name || item.name === name;
    });
}

function parseExactReference (value) {
    if (typeof value !== 'string') return null;
    let match = /^\$\{([^}]+)\}$/.exec(value);
    if (match) return match[1];
    match = /^\$([^{}]+)$/.exec(value);
    return match ? match[1] : null;
}

function resolveValue (value) {
    if (typeof value !== 'string' || !api()) return value;

    const exact = parseExactReference(value);
    if (exact) {
        const variable = variableByNameOrId(exact);
        if (variable) return api().get(variable.id);
    }

    return value.replace(/\$\{([^}]+)\}/g, function (whole, name) {
        const variable = variableByNameOrId(name);
        return variable ? String(api().get(variable.id)) : whole;
    });
}

function referenceFor (variable) {
    return '${' + variable.name + '}';
}

function installRuntimeResolution () {
    const originalGetArgValue = Block.prototype.getArgValue;
    Block.prototype.getArgValue = function () {
        const raw = originalGetArgValue.call(this);
        return encodingProject > 0 ? raw : resolveValue(raw);
    };

    const originalEncodeStrip = Project.encodeStrip;
    Project.encodeStrip = function (block) {
        encodingProject++;
        try {
            return originalEncodeStrip.call(Project, block);
        } finally {
            encodingProject--;
        }
    };
}

function insertPendingVariable (event, target) {
    if (!pendingVariable || !target || !target.owner) return false;
    const blockArg = target.owner;
    if (blockArg.type !== 'blockarg' || !blockArg.setValue) return false;

    if (event && event.preventDefault) event.preventDefault();
    if (event && event.stopPropagation) event.stopPropagation();
    const reference = referenceFor(pendingVariable);
    blockArg.argValue = reference;
    blockArg.setValue(reference);
    ScratchJr.changed = true;
    ScratchJr.storyStart('VariableUX.insertVariable');
    pendingVariable = null;
    return true;
}

function installArgumentPicker () {
    const originalEditArg = ScratchJr.editArg;
    ScratchJr.editArg = function (event, target) {
        if (insertPendingVariable(event, target)) return;
        return originalEditArg.call(ScratchJr, event, target);
    };

    const originalNumEditDone = ScratchJr.numEditDone;
    ScratchJr.numEditDone = function () {
        const focus = ScratchJr.activeFocus;
        if (focus && focus.input) {
            const raw = String(focus.input.textContent || '');
            if (parseExactReference(raw) && variableByNameOrId(parseExactReference(raw))) {
                focus.argValue = raw;
                focus.setValue(raw);
                return;
            }
        }
        return originalNumEditDone.call(ScratchJr);
    };
}

function installModalFocusGuard () {
    const originalUnfocus = ScratchJr.unfocus;
    ScratchJr.unfocus = function (event) {
        const target = event && event.target;
        if (target && target.closest && target.closest('#webjr-variable-modal')) return;
        return originalUnfocus.call(ScratchJr, event);
    };
}

function stopBubble (event) {
    if (event && event.stopPropagation) event.stopPropagation();
}

function decorateManager () {
    const modal = document.getElementById('webjr-variable-modal');
    if (!modal || modal.getAttribute('data-webjr-variable-ux') === '1') return;
    modal.setAttribute('data-webjr-variable-ux', '1');

    // Do not treat a keyboard resize / synthetic backdrop click as a request to close.
    // The explicit × button remains the close action.
    modal.onclick = stopBubble;
    modal.onmousedown = stopBubble;
    modal.ontouchstart = stopBubble;

    const card = modal.firstElementChild;
    if (card) {
        card.addEventListener('click', stopBubble);
        card.addEventListener('mousedown', stopBubble);
        card.addEventListener('touchstart', stopBubble, {passive: true});
    }

    const body = card && card.children[1];
    if (!body) return;
    const form = body.firstElementChild;
    const list = body.lastElementChild;
    if (!form || !list) return;

    form.style.gridTemplateColumns = 'minmax(0,1fr) minmax(76px,110px) 48px';

    const note = document.createElement('div');
    note.style.marginTop = '10px';
    note.style.padding = '9px 10px';
    note.style.borderRadius = '10px';
    note.style.background = '#fff3e4';
    note.style.color = '#715436';
    note.style.font = '600 12px/1.4 Roboto,Arial,sans-serif';
    note.textContent = '変数は数値・文字ブロックで ${変数名} として使えます。「入力に使う」を押してから、使いたいブロックの入力欄をタップしても挿入できます。';
    body.insertBefore(note, list);

    function decorateRows () {
        const variables = api() && api().list ? api().list() : [];
        const rows = Array.prototype.slice.call(list.children);
        rows.forEach(function (row, index) {
            const variable = variables[index];
            if (!variable || row.getAttribute('data-webjr-variable-row') === '1') return;
            row.setAttribute('data-webjr-variable-row', '1');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';

            const label = document.createElement('span');
            label.style.flex = '1';
            label.style.minWidth = '0';
            label.textContent = row.textContent;
            row.textContent = '';
            row.appendChild(label);

            const use = document.createElement('button');
            use.type = 'button';
            use.textContent = '入力に使う';
            use.style.minHeight = '34px';
            use.style.border = '0';
            use.style.borderRadius = '9px';
            use.style.padding = '0 10px';
            use.style.background = '#f39a36';
            use.style.color = '#fff';
            use.style.font = '700 12px Roboto,Arial,sans-serif';
            use.onclick = function (event) {
                if (event) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                pendingVariable = variable;
                modal.remove();
            };
            row.appendChild(use);
        });
    }

    decorateRows();
    const observer = new MutationObserver(function () {
        decorateRows();
    });
    observer.observe(list, {childList: true});
}

function installManagerPatch () {
    const originalOpenManager = VariableRegistry.openManager;
    VariableRegistry.openManager = function () {
        const result = originalOpenManager.call(VariableRegistry);
        decorateManager();
        return result;
    };
}

export default class VariableUX {
    static bootstrap () {
        if (bootstrapped) return;
        bootstrapped = true;
        installRuntimeResolution();
        installArgumentPicker();
        installModalFocusGuard();
        installManagerPatch();
    }
}
