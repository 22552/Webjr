import ScratchJr from '../ScratchJr';
import Project from '../ui/Project';
import Prims from './Prims';
import Thread from './Thread';
import WebCompiler from './WebCompiler';

export default class Runtime {
    constructor () {
        this.threadsRunning = [];
        this.thread = undefined;
        this.intervalId = undefined;
        this.usingAnimationFrame = false;
        this.lastTick = 0;
        this.yield = false;
    }

    beginTimer () {
        if (this.intervalId != null) {
            if (this.usingAnimationFrame && window.cancelAnimationFrame) window.cancelAnimationFrame(this.intervalId);
            else window.clearInterval(this.intervalId);
        }

        const rt = this;
        const tickLength = 32;
        if (window.requestAnimationFrame) {
            this.usingAnimationFrame = true;
            this.lastTick = window.performance && performance.now ? performance.now() : Date.now();
            const frame = function (now) {
                let elapsed = now - rt.lastTick;
                if (elapsed > tickLength * 4) {
                    rt.lastTick = now - tickLength;
                    elapsed = tickLength;
                }
                let count = 0;
                while (elapsed >= tickLength && count < 4) {
                    rt.tickTask();
                    rt.lastTick += tickLength;
                    elapsed -= tickLength;
                    count++;
                }
                rt.intervalId = window.requestAnimationFrame(frame);
            };
            this.intervalId = window.requestAnimationFrame(frame);
        } else {
            this.usingAnimationFrame = false;
            this.intervalId = window.setInterval(function () { rt.tickTask(); }, tickLength);
        }

        Project.saving = false;
        this.threadsRunning = [];
    }

    tickTask () {
        ScratchJr.updateRunStopButtons();
        if (this.threadsRunning.length < 1) return;
        const activeThreads = [];
        for (let i = 0; i < this.threadsRunning.length; i++) {
            if (this.threadsRunning[i].isRunning) activeThreads.push(this.threadsRunning[i]);
        }
        this.threadsRunning = activeThreads;
        for (let j = 0; j < this.threadsRunning.length; j++) this.step(j);
    }

    inactive () {
        if (this.threadsRunning.length < 1) return true;
        let inactive = true;
        for (let i = 0; i < this.threadsRunning.length; i++) {
            const t = this.threadsRunning[i];
            if (!t) continue;
            if (t.isRunning && (t.firstBlock.blocktype != 'ontouch')) inactive = false;
            if ((t.firstBlock.blocktype == 'ontouch') && (t.thisblock != null) && (t.thisblock.blocktype != 'ontouch')) inactive = false;
        }
        return inactive;
    }

    step (n) {
        this.yield = false;
        this.thread = this.threadsRunning[n];
        while (true) { // eslint-disable-line no-constant-condition
            if (!this.thread.isRunning) return;
            if (this.thread.waitTimer > 0) {
                this.thread.waitTimer += -1;
                return;
            }
            if (this.yield) return;
            if (this.thread.thisblock == null) {
                this.endCase();
                this.yield = true;
            } else {
                this.runPrim();
            }
        }
    }

    addRunScript (spr, b) { this.restartThread(spr, b); }

    stopThreads () {
        for (const i in this.threadsRunning) this.threadsRunning[i].stop();
        this.threadsRunning = [];
    }

    stopThreadBlock (b) {
        for (const i in this.threadsRunning) {
            if (this.threadsRunning[i].firstBlock == b) this.threadsRunning[i].stop();
        }
    }

    stopThreadSprite (spr) {
        for (const i in this.threadsRunning) {
            if (this.threadsRunning[i].spr == spr) this.threadsRunning[i].stop();
        }
    }

    removeRunScript (spr) {
        const res = [];
        for (const i in this.threadsRunning) {
            if (this.threadsRunning[i].spr == spr) {
                if (this.threadsRunning[i].isRunning) {
                    if (this.threadsRunning[i].thisblock != null) this.threadsRunning[i].endPrim();
                    res.push(this.threadsRunning[i].duplicate());
                }
                this.threadsRunning[i].isRunning = false;
                if (this.threadsRunning[i].oldblock != null) this.threadsRunning[i].oldblock.unhighlight();
            }
        }
        return res;
    }

    runPrim () {
        if (this.thread.oldblock != null) this.thread.oldblock.unhighlight();
        this.thread.oldblock = null;
        const blocktype = this.thread.thisblock.blocktype;
        const noHighlight = ['repeat', 'gotopage'];
        if (noHighlight.indexOf(blocktype) < 0) {
            this.thread.thisblock.highlight();
            this.thread.oldblock = this.thread.thisblock;
        }
        Prims.time = (new Date() - 0);

        if (WebCompiler.run(this.thread)) return;

        let token = Prims.table[blocktype];
        if (token == null) token = Prims.table.missing;
        token(this.thread);
    }

    endCase () {
        if (this.thread.oldblock != null) this.thread.oldblock.unhighlight();
        if (this.thread.stack.length == 0) {
            Prims.Done(this.thread);
        } else {
            const thing = (this.thread.stack).pop();
            this.thread.thisblock = thing;
            this.runPrim();
        }
    }

    restartThread (spr, b, active) {
        let newThread = new Thread(spr, b);
        let wasRunning = false;
        WebCompiler.compileScript(newThread.firstBlock);
        for (let i = 0; i < this.threadsRunning.length; i++) {
            if (this.threadsRunning[i].firstBlock == b) {
                wasRunning = true;
                if (b.blocktype != 'ontouch') {
                    if (this.threadsRunning[i].oldblock != null) this.threadsRunning[i].oldblock.unhighlight();
                    this.threadsRunning[i].stopping(active);
                    newThread = this.threadsRunning[i];
                }
            }
        }
        if (!wasRunning) this.threadsRunning.push(newThread);
        return newThread;
    }
}
