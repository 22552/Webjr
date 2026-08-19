import localforage from 'localforage';
import SoundPlayer from './SoundPlayer';
import WebUtils from './WebUtils';

const recordings = localforage.createInstance({name: 'Webjr-audio', storeName: 'recordings'});
let recorder = null;
let stream = null;
let chunks = [];
let recordSoundName = null;
let currentBlob = null;

function supportedMime () {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
    for (let i = 0; i < candidates.length; i++) {
        if (!MediaRecorder.isTypeSupported || MediaRecorder.isTypeSupported(candidates[i])) return candidates[i];
    }
    return '';
}

function extensionForMime (mime) {
    if (mime && mime.indexOf('mp4') > -1) return 'm4a';
    if (mime && mime.indexOf('ogg') > -1) return 'ogg';
    return 'webm';
}

function stopTracks () {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
    stream = null;
}

export default class RecordSound {
    static askForPermission () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        navigator.mediaDevices.getUserMedia({audio: true}).then(s => {
            s.getTracks().forEach(track => track.stop());
        }).catch(() => {}); // eslint-disable-line no-empty
    }

    static recordsound_recordstart (fcn) {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
            if (typeof fcn === 'function') fcn('-1');
            return;
        }
        navigator.mediaDevices.getUserMedia({audio: true}).then(mediaStream => {
            stream = mediaStream;
            chunks = [];
            const mime = supportedMime();
            recorder = mime ? new MediaRecorder(stream, {mimeType: mime}) : new MediaRecorder(stream);
            recordSoundName = WebUtils.timeMD5() + '.' + extensionForMime(recorder.mimeType || mime);
            recorder.ondataavailable = event => {
                if (event.data && event.data.size) chunks.push(event.data);
            };
            recorder.start();
            if (typeof fcn === 'function') fcn(recordSoundName);
        }).catch(() => {
            if (typeof fcn === 'function') fcn('-1');
        });
    }

    static recordsound_recordstop (fcn) {
        if (!recorder || recorder.state === 'inactive') {
            if (typeof fcn === 'function') fcn('-1');
            return;
        }
        recorder.onstop = () => {
            currentBlob = new Blob(chunks, {type: recorder.mimeType || 'audio/webm'});
            recordings.setItem(recordSoundName, currentBlob).then(() => {
                SoundPlayer.registerBlob(recordSoundName, currentBlob);
                stopTracks();
                if (typeof fcn === 'function') fcn('1');
            }).catch(() => {
                stopTracks();
                if (typeof fcn === 'function') fcn('-1');
            });
        };
        recorder.stop();
    }

    static recordsound_volume (fcn) {
        if (typeof fcn === 'function') fcn(10);
    }

    static recordsound_startplay (fcn) {
        if (!recordSoundName) {
            if (typeof fcn === 'function') fcn('-1');
            return;
        }
        SoundPlayer.io_playsound(recordSoundName, () => {
            if (typeof fcn === 'function') fcn('1');
        });
    }

    static recordsound_stopplay (fcn) {
        if (recordSoundName) SoundPlayer.io_stopsound(recordSoundName);
        if (typeof fcn === 'function') fcn('1');
    }

    static recordsound_recordclose (keep, fcn) {
        const shouldKeep = keep === true || keep === 'YES' || keep === '1';
        if (!shouldKeep && recordSoundName) recordings.removeItem(recordSoundName);
        stopTracks();
        recorder = null;
        chunks = [];
        currentBlob = null;
        if (typeof fcn === 'function') fcn(shouldKeep ? '1' : '-1');
    }
}
