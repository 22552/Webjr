import Database from './Database';
import SoundPlayer from './SoundPlayer';
import RecordSound from './RecordSound';
import WebUtils from './WebUtils';

let cameraStream = null;
let cameraView = 'front';
let cameraContainer = null;
let cameraVideo = null;
let cameraMask = null;
let cameraData = null;

function callNamedCallback (callback, value) {
    if (typeof callback === 'function') {
        callback(value);
        return;
    }
    if (typeof callback !== 'string') return;
    const path = callback.split('.');
    let target = window;
    for (let i = 0; i < path.length; i++) target = target && target[path[i]];
    if (typeof target === 'function') target(value);
}

function stopCameraStream () {
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
}

function removeCameraUI () {
    stopCameraStream();
    if (cameraContainer && cameraContainer.parentNode) cameraContainer.parentNode.removeChild(cameraContainer);
    cameraContainer = null;
    cameraVideo = null;
    cameraMask = null;
}

function startCameraStream () {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !cameraVideo) return Promise.reject(new Error('camera unavailable'));
    stopCameraStream();
    const constraints = {
        video: {facingMode: cameraView === 'back' ? {ideal: 'environment'} : {ideal: 'user'}},
        audio: false
    };
    return navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        cameraStream = stream;
        cameraVideo.srcObject = stream;
        return cameraVideo.play();
    });
}

export default class Web {
    static init () {
        Database.open('Guest');
        SoundPlayer.init();
    }

    static database_stmt (json, fcn) {
        Database.stmt(json, fcn);
    }

    static database_query (json, fcn) {
        Database.query(json, fcn);
    }

    static io_cleanassets (fileType, fcn) {
        Database.cleanassets(fileType, fcn);
    }

    static io_getsettings () {
        return 'Documents,0,YES,YES';
    }

    static io_getmedia (file, fcn) {
        Database.getmedia(file, fcn);
    }

    static io_setmedia (contents, ext, fcn) {
        Database.setmedia(contents, ext, fcn);
    }

    static io_setmedianame (contents, key, ext, fcn) {
        Database.setmedianame(contents, key, ext, fcn);
    }

    static io_getmd5 (str) {
        return WebUtils.io_getmd5(str);
    }

    static io_remove (filename, fcn) {
        Database.removeFile(filename, fcn);
    }

    static io_getfile (filename, fcn) {
        Database.getfile(filename, fcn);
    }

    static io_setfile (filename, base64Content, fcn) {
        Database.setfile(filename, base64Content, fcn);
    }

    static io_registersound (dir, name, fcn) {
        SoundPlayer.io_registersound(dir, name, fcn);
    }

    static io_playsound (name, fcn) {
        SoundPlayer.io_playsound(name, fcn);
    }

    static io_stopsound (name, fcn) {
        SoundPlayer.io_stopsound(name);
        if (typeof fcn === 'function') fcn(name);
    }

    static recordsound_recordstart (fcn) { RecordSound.recordsound_recordstart(fcn); }
    static recordsound_recordstop (fcn) { RecordSound.recordsound_recordstop(fcn); }
    static recordsound_volume (fcn) { RecordSound.recordsound_volume(fcn); }
    static recordsound_startplay (fcn) { RecordSound.recordsound_startplay(fcn); }
    static recordsound_stopplay (fcn) { RecordSound.recordsound_stopplay(fcn); }
    static recordsound_recordclose (keep, fcn) { RecordSound.recordsound_recordclose(keep, fcn); }
    static askForPermission () { RecordSound.askForPermission(); }

    static scratchjr_cameracheck () {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    static scratchjr_startfeed (dataString) {
        try {
            cameraData = typeof dataString === 'string' ? JSON.parse(dataString) : dataString;
            removeCameraUI();
            cameraContainer = document.createElement('div');
            cameraContainer.id = 'webjr-camera-feed';
            cameraContainer.style.position = 'absolute';
            cameraContainer.style.left = Math.round(cameraData.mx || cameraData.x || 0) + 'px';
            cameraContainer.style.top = Math.round(cameraData.my || cameraData.y || 0) + 'px';
            cameraContainer.style.width = Math.round((cameraData.mw || cameraData.width || 320) * (cameraData.scale || 1)) + 'px';
            cameraContainer.style.height = Math.round((cameraData.mh || cameraData.height || 240) * (cameraData.scale || 1)) + 'px';
            cameraContainer.style.overflow = 'hidden';
            cameraContainer.style.pointerEvents = 'none';
            cameraContainer.style.zIndex = '4';

            cameraVideo = document.createElement('video');
            cameraVideo.setAttribute('playsinline', '');
            cameraVideo.muted = true;
            cameraVideo.autoplay = true;
            cameraVideo.style.width = '100%';
            cameraVideo.style.height = '100%';
            cameraVideo.style.objectFit = 'cover';
            if (cameraView === 'front') cameraVideo.style.transform = 'scaleX(-1)';
            cameraContainer.appendChild(cameraVideo);

            if (cameraData.image) {
                cameraMask = document.createElement('img');
                cameraMask.src = cameraData.image;
                cameraMask.style.position = 'absolute';
                cameraMask.style.inset = '0';
                cameraMask.style.width = '100%';
                cameraMask.style.height = '100%';
                cameraMask.style.pointerEvents = 'none';
                cameraContainer.appendChild(cameraMask);
            }
            document.body.appendChild(cameraContainer);
            startCameraStream().catch(() => removeCameraUI());
            return '1';
        } catch (e) {
            WebUtils.log(e);
            removeCameraUI();
            return '-1';
        }
    }

    static scratchjr_stopfeed () {
        removeCameraUI();
        return '1';
    }

    static scratchjr_choosecamera (mode) {
        cameraView = mode === 'back' ? 'back' : 'front';
        if (cameraVideo) {
            cameraVideo.style.transform = cameraView === 'front' ? 'scaleX(-1)' : '';
            startCameraStream().catch(() => {}); // eslint-disable-line no-empty
        }
        return cameraView;
    }

    static scratchjr_captureimage (callback) {
        if (!cameraVideo || !cameraVideo.videoWidth) {
            callNamedCallback(callback, 'error getting a still');
            return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = cameraVideo.videoWidth;
        canvas.height = cameraVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        if (cameraView === 'front') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(cameraVideo, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/png').split(',')[1];
        callNamedCallback(callback, base64);
    }

    static hideSplash () {}

    static sendSjrUsingShareDialog (fileName, emailSubject, emailBody, shareType, b64data) {
        if (!b64data) return;
        const binary = atob(b64data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const name = /\.sjr$/i.test(fileName || '') ? fileName : (fileName || 'project') + '.sjr';
        const blob = new Blob([bytes], {type: 'application/octet-stream'});
        const file = typeof File !== 'undefined' ? new File([blob], name, {type: blob.type}) : null;
        if (file && navigator.share && navigator.canShare && navigator.canShare({files: [file]})) {
            navigator.share({files: [file], title: emailSubject || name, text: emailBody || ''}).catch(() => {}); // eslint-disable-line no-empty
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    static deviceName () { return 'Webjr'; }
    static analyticsEvent () {}
    static setAnalyticsPlacePref () {}
    static setAnalyticsPref () {}
}
