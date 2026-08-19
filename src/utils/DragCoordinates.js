import ScratchJr from '../editor/ScratchJr';
import Palette from '../editor/ui/Palette';
import ScriptsPane from '../editor/ui/ScriptsPane';
import Scripts from '../editor/ui/Scripts';
import OS from '../tablet/OS';
import Undo from '../editor/ui/Undo';
import Events from './Events';
import Rectangle from '../geom/Rectangle';
import {frame, globalx, globaly, localx, localy} from './lib';

let bootstrapped = false;

function dragRoot () {
    return Events.dragDiv || frame;
}

function dragOrigin () {
    const root = dragRoot();
    return {
        x: root ? globalx(root) : 0,
        y: root ? globaly(root) : 0
    };
}

function transformPosition (el) {
    if (!el) return {x: 0, y: 0};
    if (typeof el.left === 'number' && typeof el.top === 'number') {
        return {x: el.left, y: el.top};
    }
    const matrix = new WebKitCSSMatrix(window.getComputedStyle(el).webkitTransform);
    return {x: matrix.m41 || 0, y: matrix.m42 || 0};
}

function dragGlobalPosition (el, scale) {
    const origin = dragOrigin();
    const pos = transformPosition(el);
    const factor = typeof scale === 'number' && scale !== 0 ? scale : 1;
    return {
        x: origin.x + pos.x / factor,
        y: origin.y + pos.y / factor
    };
}

function dragBox (el, scale) {
    const factor = typeof scale === 'number' && scale !== 0 ? scale : 1;
    const pt = dragGlobalPosition(el, factor);
    return new Rectangle(pt.x, pt.y, el.offsetWidth / factor, el.offsetHeight / factor);
}

function scriptPoint (sc, el) {
    const pt = dragGlobalPosition(el, 1);
    return {
        x: localx(sc, pt.x),
        y: localy(sc, pt.y)
    };
}

function patchLandingPlace () {
    Palette.getLandingPlace = function (el, e, scale) {
        scale = typeof scale !== 'undefined' ? scale : 1;
        const sc = ScratchJr.getActiveScript().owner;
        let pt = e ? Events.getTargetPoint(e) : null;
        if (pt && (typeof pt.x !== 'number' || typeof pt.y !== 'number')) pt = null;

        const box = dragBox(el, scale);
        const palette = document.getElementById('palette');
        const box2 = new Rectangle(globalx(palette), globaly(palette), palette.offsetWidth, palette.offsetHeight);

        if ((sc.flowCaret != null) && ((sc.flowCaret.prev != null) ||
            (sc.flowCaret.next != null) || (sc.flowCaret.inside != null))) {
            return 'scripts';
        }
        if (box2.overlapElemBy(box, 0.4) && box2.hitRect({x: box.x, y: box.y})) {
            return 'palette';
        }
        if (pt && box2.hitRect(pt)) return 'palette';
        if (Palette.overlapsWith(document.getElementById('scripts'), box)) return 'scripts';
        if (Palette.overlapsWith(palette, box)) return 'palette';
        if (Palette.overlapsWith(document.getElementById('library'), box)) return 'library';
        if (Palette.overlapsWith(document.getElementById('pages'), box)) return 'pages';
        return null;
    };
}

function patchThumbHitTest () {
    Palette.getHittedThumb = function (el, div, scale) {
        scale = typeof scale !== 'undefined' ? scale : 1;
        const box1 = dragBox(el, scale);
        let area = 0;
        let res = null;
        const dh = div.parentNode.scrollTop;
        for (let i = 0; i < div.childElementCount; i++) {
            const node = div.childNodes[i];
            if (node.nodeName === 'FORM') continue;
            const box2 = new Rectangle(globalx(node), globaly(node) - dh, node.offsetWidth, node.offsetHeight);
            const boxi = box1.intersection(box2);
            const a = boxi.width * boxi.height;
            if (a > area) {
                area = a;
                res = node;
            }
        }
        return res;
    };
}

function patchPaletteDrop () {
    const original = Palette.dropBlockFromPalette;
    Palette.dropBlockFromPalette = function (e, element) {
        if (Palette.getLandingPlace(element, e) !== 'scripts') {
            return original.call(Palette, e, element);
        }

        e.preventDefault();
        OS.analyticsEvent('editor', 'new_block_' + element.owner.blocktype);
        const sc = ScratchJr.getActiveScript();
        const pt = scriptPoint(sc, element);
        ScriptsPane.blockDropped(sc, pt.x, pt.y);
        const spr = ScratchJr.getActiveScript().owner.spr;
        Undo.record({
            action: 'scripts',
            where: spr.div.parentNode.owner.id,
            who: spr.id
        });
        ScratchJr.storyStart('Palette.dropBlockFromPalette');
        ScratchJr.getActiveScript().owner.dragList = [];
    };
}

function patchScriptsDrop () {
    const original = ScriptsPane.dropBlock;
    ScriptsPane.dropBlock = function (e, el) {
        if (Palette.getLandingPlace(el, e) !== 'scripts') {
            return original.call(ScriptsPane, e, el);
        }

        e.preventDefault();
        const sc = ScratchJr.getActiveScript();
        const spr = sc.owner.spr.id;
        const page = ScratchJr.stage.currentPage;
        const pt = scriptPoint(sc, el);
        ScriptsPane.blockDropped(sc, pt.x, pt.y);
        Undo.record({
            action: 'scripts',
            where: page.id,
            who: spr
        });
        ScratchJr.getActiveScript().owner.dragList = [];
    };
}

function patchCaretCoordinates () {
    Scripts.prototype.insertCaret = function (x, y) {
        if (this.flowCaret == null) return;
        const sc = ScratchJr.getActiveScript();
        const origin = dragOrigin();
        const dx = localx(sc, origin.x + x);
        const dy = localy(sc, origin.y + y) + this.adjustCheight(this.dragList[0]);
        this.flowCaret.moveBlock(dx, dy);
        this.snapToPlace([this.flowCaret]);
        if (this.flowCaret.div.style.visibility === 'visible') this.layout(this.flowCaret);
    };
}

export default class DragCoordinates {
    static bootstrap () {
        if (bootstrapped) return;
        bootstrapped = true;
        patchLandingPlace();
        patchThumbHitTest();
        patchPaletteDrop();
        patchScriptsDrop();
        patchCaretCoordinates();
    }
}
