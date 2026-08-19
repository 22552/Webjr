import {Base64} from 'js-base64';

const md5 = require('md5');

export default class WebUtils {
    static log (str) {
        console.log(str); // eslint-disable-line no-console
    }

    static _fcnF (fcn, value, data = null) {
        if (typeof fcn !== 'function') return;
        if (data == null) fcn(value);
        else fcn(data);
    }

    static dateNow () {
        return Date.now();
    }

    static timeMD5 () {
        return WebUtils.io_getmd5(String(Date.now()));
    }

    static io_getmd5 (str) {
        return md5(str);
    }

    static encodeBase64 (str) {
        return Base64.encode(str);
    }

    static decodeBase64 (str) {
        return Base64.decode(str);
    }
}
