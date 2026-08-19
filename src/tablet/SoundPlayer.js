import ScratchAudio from '../utils/ScratchAudio';
import localforage from 'localforage';

const recordings = localforage.createInstance({name: 'Webjr-audio', storeName: 'recordings'});
const sounds = {};

export default class SoundPlayer {
    static init (fcn) {
        if (typeof fcn === 'function') fcn(0);
    }

    static _createSound (name, url) {
        if (sounds[name] && sounds[name]._webjrObjectURL) {
            URL.revokeObjectURL(sounds[name]._webjrObjectURL);
        }
        const audio = new Audio(url);
        audio.preload = 'auto';
        if (url.indexOf('blob:') === 0) audio._webjrObjectURL = url;
        sounds[name] = audio;
        return name + ',1.0';
    }

    static registerBlob (name, blob) {
        const url = URL.createObjectURL(blob);
        return SoundPlayer._createSound(name, url);
    }

    static io_registersound (dir, name, fcn) {
        if (dir === 'Documents') {
            recordings.getItem(name).then(blob => {
                const result = blob ? SoundPlayer.registerBlob(name, blob) : 'error';
                if (typeof fcn === 'function') fcn(result);
            }).catch(() => {
                if (typeof fcn === 'function') fcn('error');
            });
            return;
        }
        const url = (dir + name).replace('HTML5/', '');
        const result = SoundPlayer._createSound(name, url);
        if (typeof fcn === 'function') fcn(result);
    }

    static io_playsound (name, fcn) {
        const audio = sounds[name];
        if (!audio) {
            if (typeof fcn === 'function') fcn(name);
            else ScratchAudio.soundDone(name);
            return;
        }
        audio.pause();
        try { audio.currentTime = 0; } catch (e) {} // eslint-disable-line no-empty
        audio.onended = () => {
            if (typeof fcn === 'function') fcn(name);
            else ScratchAudio.soundDone(name);
        };
        const result = audio.play();
        if (result && typeof result.catch === 'function') {
            result.catch(() => {
                if (typeof fcn === 'function') fcn(name);
                else ScratchAudio.soundDone(name);
            });
        }
    }

    static io_stopsound (name) {
        const audio = sounds[name];
        if (!audio) return;
        audio.pause();
        try { audio.currentTime = 0; } catch (e) {} // eslint-disable-line no-empty
    }
}
