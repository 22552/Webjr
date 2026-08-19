import WebForage from './WebForage';
import WebUtils from './WebUtils';

let database = null;

export default class Database {
    static open (userName) {
        if (!database) database = new WebForage(userName || 'Guest');
        return '0';
    }

    static stmt (body, fcn) {
        database.stmt(body, result => {
            if (typeof fcn === 'function') fcn(result);
        });
    }

    static query (body, fcn) {
        database.query(body, result => {
            if (typeof fcn === 'function') fcn(result == null ? null : JSON.stringify(result));
        });
    }

    static _getAllFiles (fcn) {
        database.getAllItems('userfiles', (code, list) => {
            if (code !== 0) return fcn([]);
            fcn((list || []).map(item => item.name));
        });
    }

    static _hasFile (filename, fcn) {
        database.getItem('userfiles', filename, (code, item) => fcn(code === 0 && item != null));
    }

    static _writeToURL (name, contents, fcn) {
        database.setItem('userfiles', name, {name: name, context: contents}, code => {
            if (typeof fcn === 'function') fcn(code === 0 ? name : '-1');
        });
    }

    static _readURL (name, fcn) {
        database.getItem('userfiles', name, (code, item) => {
            if (typeof fcn === 'function') fcn(code === 0 && item ? item.context : null);
        });
    }

    static cleanassets (fileType, fcn) {
        if (typeof fcn === 'function') fcn('1');
    }

    static setmedia (contents, ext, fcn) {
        const name = WebUtils.io_getmd5(contents) + '.' + ext;
        Database._writeToURL(name, contents, fcn);
    }

    static setmedianame (contents, key, ext, fcn) {
        Database._writeToURL(key + '.' + ext, contents, fcn);
    }

    static getmedia (filename, fcn) {
        Database._readURL(filename, fcn);
    }

    static removeFile (filename, fcn) {
        database.deleteItem('userfiles', filename, code => {
            if (typeof fcn === 'function') fcn(code === 0 ? '1' : '-1');
        });
    }

    static setfile (filename, base64Contents, fcn) {
        Database._writeToURL(filename, WebUtils.decodeBase64(base64Contents), fcn);
    }

    static getfile (filename, fcn) {
        Database._readURL(filename, data => {
            if (typeof fcn === 'function') fcn(data == null ? null : WebUtils.encodeBase64(data));
        });
    }
}
