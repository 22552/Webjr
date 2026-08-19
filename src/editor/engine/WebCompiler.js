import Prims from './Prims';

const METHOD_BY_BLOCK = {
    done: 'Done',
    missing: 'Ignore',
    onflag: 'Ignore',
    onmessage: 'Ignore',
    onclick: 'Ignore',
    ontouch: 'OnTouch',
    onchat: 'Ignore',
    repeat: 'Repeat',
    forward: 'Forward',
    back: 'Back',
    up: 'Up',
    down: 'Down',
    left: 'Left',
    right: 'Right',
    home: 'Home',
    setspeed: 'SetSpeed',
    message: 'Message',
    setcolor: 'SetColor',
    bigger: 'Bigger',
    smaller: 'Smaller',
    wait: 'Wait',
    caretcmd: 'Ignore',
    caretstart: 'Ignore',
    caretend: 'Ignore',
    caretrepeat: 'Ignore',
    gotopage: 'GotoPage',
    endstack: 'DoNextBlock',
    stopall: 'StopAll',
    stopmine: 'StopMine',
    forever: 'Forever',
    hop: 'Hop',
    show: 'Show',
    hide: 'Hide',
    playsnd: 'playSound',
    playusersnd: 'playSound',
    grow: 'Grow',
    shrink: 'Shrink',
    same: 'Same',
    say: 'Say'
};

const DIRECT_SOURCE = {
    missing: 't.thisblock = t.thisblock.next;',
    onflag: 't.thisblock = t.thisblock.next;',
    onmessage: 't.thisblock = t.thisblock.next;',
    onclick: 't.thisblock = t.thisblock.next;',
    onchat: 't.thisblock = t.thisblock.next;',
    caretcmd: 't.thisblock = t.thisblock.next;',
    caretstart: 't.thisblock = t.thisblock.next;',
    caretend: 't.thisblock = t.thisblock.next;',
    caretrepeat: 't.thisblock = t.thisblock.next;',
    setspeed: 't.spr.speed = Math.pow(2, Number(t.thisblock.getArgValue())); t.waitTimer = 1; t.thisblock = t.thisblock.next;',
    home: 't.spr.goHome(); t.waitTimer = 1; t.thisblock = t.thisblock.next;',
    wait: 't.waitTimer = Math.round(Number(t.thisblock.getArgValue()) * 3.125); t.time = Date.now(); t.thisblock = t.thisblock.next;'
};

let enabled = true;
let cspAllowsDynamicFunctions = true;
const compiledBlocks = new WeakMap();
const compiledScripts = new WeakSet();

function makeExecutor (blocktype) {
    const direct = DIRECT_SOURCE[blocktype];
    const method = METHOD_BY_BLOCK[blocktype];
    if (!direct && !method) return null;

    if (cspAllowsDynamicFunctions) {
        try {
            const source = direct || ('P.' + method + '(t);');
            return new Function('P', 't', '"use strict"; ' + source); // eslint-disable-line no-new-func
        } catch (e) {
            cspAllowsDynamicFunctions = false;
        }
    }

    if (direct) {
        switch (blocktype) {
        case 'setspeed':
            return (P, t) => {
                t.spr.speed = Math.pow(2, Number(t.thisblock.getArgValue()));
                t.waitTimer = 1;
                t.thisblock = t.thisblock.next;
            };
        case 'home':
            return (P, t) => {
                t.spr.goHome();
                t.waitTimer = 1;
                t.thisblock = t.thisblock.next;
            };
        case 'wait':
            return (P, t) => {
                t.waitTimer = Math.round(Number(t.thisblock.getArgValue()) * 3.125);
                t.time = Date.now();
                t.thisblock = t.thisblock.next;
            };
        default:
            return (P, t) => { t.thisblock = t.thisblock.next; };
        }
    }
    return (P, t) => P[method](t);
}

function compileBlock (block) {
    if (!block) return null;
    if (compiledBlocks.has(block)) return compiledBlocks.get(block);
    const executor = makeExecutor(block.blocktype);
    compiledBlocks.set(block, executor);
    return executor;
}

function compileGraph (block, seen) {
    let current = block;
    while (current && !seen.has(current)) {
        seen.add(current);
        compileBlock(current);
        if (current.inside) compileGraph(current.inside, seen);
        current = current.next;
    }
}

export default class WebCompiler {
    static get enabled () { return enabled; }

    static setEnabled (value) {
        enabled = !!value;
        try { localStorage.setItem('webjr-jit-enabled', enabled ? '1' : '0'); } catch (e) {} // eslint-disable-line no-empty
    }

    static loadPreference () {
        try {
            const saved = localStorage.getItem('webjr-jit-enabled');
            if (saved != null) enabled = saved !== '0';
        } catch (e) {} // eslint-disable-line no-empty
    }

    static compileScript (firstBlock) {
        if (!firstBlock || compiledScripts.has(firstBlock)) return;
        const seen = new WeakSet();
        compileGraph(firstBlock, seen);
        compiledScripts.add(firstBlock);
    }

    static run (thread) {
        if (!enabled || !thread || !thread.thisblock) return false;
        WebCompiler.compileScript(thread.firstBlock);
        const executor = compileBlock(thread.thisblock);
        if (!executor) return false;
        executor(Prims, thread);
        return true;
    }
}

WebCompiler.loadPreference();
