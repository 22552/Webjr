import {isiOS, isAndroid, gn} from '../utils/lib';
import IO from './IO';
import iOS from './iOS';
import Android from './Android';
import WebOS from './WebOS';
import Lobby from '../lobby/Lobby';
import Alert from '../editor/ui/Alert';
import ScratchAudio from '../utils/ScratchAudio';

let path;
let camera;
let database = 'projects';
let tabletInterface = null;

function runningInPlainBrowser () {
    return typeof AndroidInterface === 'undefined' && typeof window.tablet !== 'object';
}

export default class OS {
    static get path () { return path; }
    static set path (newPath) { path = newPath; }
    static get camera () { return camera; }
    static set camera (newCamera) { camera = newCamera; }
    static get database () { return database; }

    static waitForInterface (fcn) {
        if (tabletInterface != null) {
            if (fcn) fcn();
            return;
        }

        if (runningInPlainBrowser()) {
            tabletInterface = WebOS;
            tabletInterface.init();
            if (fcn) fcn();
            return;
        }

        if ((isAndroid && typeof AndroidInterface === 'undefined') || (isiOS && typeof window.tablet !== 'object')) {
            setTimeout(function () { OS.waitForInterface(fcn); }, 100);
            return;
        }

        tabletInterface = isiOS ? iOS : Android;
        if (fcn) fcn();
    }

    static stmt (json, fcn) { tabletInterface.stmt(json, fcn); }
    static query (json, fcn) { tabletInterface.query(json, fcn); }

    static setfield (db, id, fieldname, val, fcn) {
        const json = {};
        const keylist = [fieldname + ' = ?', 'mtime = ?'];
        json.values = [val, (new Date()).getTime().toString()];
        json.stmt = 'update ' + db + ' set ' + keylist.toString() + ' where id = ' + id;
        OS.stmt(json, fcn);
    }

    static cleanassets (ft, fcn) { tabletInterface.cleanassets(ft, fcn); }
    static getsettings (fcn) { tabletInterface.getsettings(fcn); }
    static getmedia (file, fcn) { tabletInterface.getmedia(file, fcn); }
    static setmedia (str, ext, fcn) { tabletInterface.setmedia(str, ext, fcn); }
    static setmedianame (str, name, ext, fcn) { tabletInterface.setmedianame(str, name, ext, fcn); }
    static getmd5 (str, fcn) { tabletInterface.getmd5(str, fcn); }
    static remove (str, fcn) { tabletInterface.remove(str, fcn); }
    static getfile (str, fcn) { tabletInterface.getfile(str, fcn); }
    static setfile (name, str, fcn) { tabletInterface.setfile(name, str, fcn); }

    static registerSound (dir, name, fcn) { tabletInterface.registerSound(dir, name, fcn); }
    static playSound (name, fcn) { tabletInterface.playSound(name, fcn); }
    static stopSound (name, fcn) { tabletInterface.stopSound(name, fcn); }
    static soundDone (name) { ScratchAudio.soundDone(name); }
    static sndrecord (fcn) { tabletInterface.sndrecord(fcn); }
    static recordstop (fcn) { tabletInterface.recordstop(fcn); }
    static volume (fcn) { tabletInterface.volume(fcn); }
    static startplay (fcn) { tabletInterface.startplay(fcn); }
    static stopplay (fcn) { tabletInterface.stopplay(fcn); }
    static recorddisappear (b, fcn) { tabletInterface.recorddisappear(b, fcn); }
    static askpermission () { if (tabletInterface && tabletInterface.askpermission) tabletInterface.askpermission(); }

    static hascamera () {
        const result = tabletInterface.hascamera();
        if (result !== undefined) camera = result;
        return camera;
    }
    static startfeed (data, fcn) { tabletInterface.startfeed(data, fcn); }
    static stopfeed (fcn) { tabletInterface.stopfeed(fcn); }
    static choosecamera (mode, fcn) { tabletInterface.choosecamera(mode, fcn); }
    static captureimage (fcn) { tabletInterface.captureimage(fcn); }
    static hidesplash (fcn) {
        if (tabletInterface && tabletInterface.hidesplash) tabletInterface.hidesplash();
        if (fcn) fcn();
    }

    static trace (str) { console.log(str); } // eslint-disable-line no-console
    static parse (str) { console.log(JSON.parse(str)); } // eslint-disable-line no-console
    static tracemedia (str) { console.log(atob(str)); } // eslint-disable-line no-console
    ignore () {}

    static createZipForProject (projectData, metadata, name, fcn) {
        if (tabletInterface && tabletInterface.createZipForProject) {
            tabletInterface.createZipForProject(projectData, metadata, name, fcn);
        } else if (fcn) {
            fcn(null);
        }
    }

    static sendSjrToShareDialog (fileName, emailSubject, emailBody, shareType, b64data) {
        tabletInterface.sendSjrToShareDialog(fileName, emailSubject, emailBody, shareType, b64data);
    }

    static loadProjectFromSjr (b64data) {
        try {
            IO.loadProjectFromSjr(b64data);
        } catch (err) {
            const errorMessage = 'Couldn\'t load share -- project data corrupted. ' + err.message;
            Alert.open(gn('frame'), gn('frame'), errorMessage, '#ff0000');
            console.log(err); // eslint-disable-line no-console
            return 0;
        }
        return 1;
    }

    static deviceName (fcn) { tabletInterface.deviceName(fcn); }
    static analyticsEvent (category, action, label) { tabletInterface.analyticsEvent(category, action, label); }
    static setAnalyticsPlacePref (preferredPlace) { tabletInterface.setAnalyticsPlacePref(preferredPlace); }
    static setAnalyticsPref (key, value) {
        if (tabletInterface.setAnalyticsPref) tabletInterface.setAnalyticsPref(key, value);
    }

    static pageError (desc) {
        console.log('WEBJR ERROR:', desc); // eslint-disable-line no-console
        if (window.location.href.indexOf('home.html') > -1 && Lobby.errorTimer) Lobby.errorLoading(desc);
    }
}

window.OS = OS;
