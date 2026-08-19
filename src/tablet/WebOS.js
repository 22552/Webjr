import Web from './Web';

export default class WebOS {
    static init () { Web.init(); }
    static stmt (json, fcn) { Web.database_stmt(JSON.stringify(json), fcn); }
    static query (json, fcn) { Web.database_query(JSON.stringify(json), fcn); }
    static cleanassets (ft, fcn) { Web.io_cleanassets(ft, fcn); }
    static getsettings (fcn) { if (fcn) fcn(Web.io_getsettings()); }
    static getmedia (file, fcn) { Web.io_getmedia(file, fcn); }
    static setmedia (str, ext, fcn) { Web.io_setmedia(str, ext, fcn); }
    static setmedianame (str, name, ext, fcn) { Web.io_setmedianame(str, name, ext, fcn); }
    static getmd5 (str, fcn) { if (fcn) fcn(Web.io_getmd5(str)); }
    static remove (str, fcn) { Web.io_remove(str, fcn); }
    static getfile (str, fcn) { Web.io_getfile(str, fcn); }
    static setfile (name, str, fcn) { Web.io_setfile(name, btoa(str), fcn); }
    static registerSound (dir, name, fcn) { Web.io_registersound(dir, name, fcn); }
    static playSound (name, fcn) { Web.io_playsound(name, fcn); }
    static stopSound (name, fcn) { Web.io_stopsound(name, fcn); }
    static sndrecord (fcn) { Web.recordsound_recordstart(fcn); }
    static recordstop (fcn) { Web.recordsound_recordstop(fcn); }
    static volume (fcn) { Web.recordsound_volume(fcn); }
    static startplay (fcn) { Web.recordsound_startplay(fcn); }
    static stopplay (fcn) { Web.recordsound_stopplay(fcn); }
    static recorddisappear (keep, fcn) { Web.recordsound_recordclose(keep, fcn); }
    static askpermission () { Web.askForPermission(); }
    static hascamera () { return Web.scratchjr_cameracheck(); }
    static startfeed (data, fcn) { const result = Web.scratchjr_startfeed(JSON.stringify(data)); if (fcn) fcn(result); }
    static stopfeed (fcn) { const result = Web.scratchjr_stopfeed(); if (fcn) fcn(result); }
    static choosecamera (mode, fcn) { const result = Web.scratchjr_choosecamera(mode); if (fcn) fcn(result); }
    static captureimage (fcn) { Web.scratchjr_captureimage(fcn); }
    static hidesplash (fcn) { Web.hideSplash(); if (fcn) fcn(); }
    static sendSjrToShareDialog (fileName, emailSubject, emailBody, shareType, b64data) {
        Web.sendSjrUsingShareDialog(fileName, emailSubject, emailBody, shareType, b64data);
    }
    static deviceName (fcn) { if (fcn) fcn(Web.deviceName()); }
    static analyticsEvent (category, action, label) { Web.analyticsEvent(category, action, label); }
    static setAnalyticsPlacePref (value) { Web.setAnalyticsPlacePref(value); }
    static setAnalyticsPref (key, value) { Web.setAnalyticsPref(key, value); }
}
