import WebStore from './WebStore';
import WebUtils from './WebUtils';
import {getSQLData, isEmptyOrSpaces} from './WebSQLMatch';
import {ExecWebForageSQL} from './WebForageSQL';

export default class WebForage {
    constructor (userName) {
        this.userName = userName;
        this.tableDes = {
            projects: {PRIMARY: 'id', ISGIFT: {DEFAULT: 0}},
            usershapes: {PRIMARY: 'id'},
            userbkgs: {PRIMARY: 'id'},
            userfiles: {PRIMARY: 'name'},
            test: {PRIMARY: 'id'}
        };
    }

    getTablePrimary (tableName) {
        const desc = this.tableDes[tableName];
        return desc && desc.PRIMARY;
    }

    initTableDefault (tableName, key, obj) {
        const desc = this.tableDes[tableName] || {};
        const primary = desc.PRIMARY;
        if (primary && obj[primary] == null && !isEmptyOrSpaces(String(key))) obj[primary] = key;
        Object.keys(desc).forEach(name => {
            const rule = desc[name];
            if (name !== 'PRIMARY' && rule && rule.DEFAULT != null && obj[name.toLowerCase()] == null) {
                obj[name.toLowerCase()] = rule.DEFAULT;
            }
        });
    }

    setItem (tableName, key, obj, fcn) {
        if (!this.tableDes[tableName]) return fcn(-1, null);
        this.initTableDefault(tableName, key, obj);
        WebStore.set(tableName, key, obj).then(value => fcn(0, value)).catch(err => {
            WebUtils.log(err);
            fcn(-2, null);
        });
    }

    updateItem (tableName, key, patch, fcn) {
        this.getItem(tableName, key, (code, oldObj) => {
            if (code !== 0) return fcn(code, null);
            const next = Object.assign({}, oldObj || {}, patch);
            this.setItem(tableName, key, next, fcn);
        });
    }

    getItem (tableName, key, fcn) {
        if (!this.tableDes[tableName]) return fcn(-1, null);
        WebStore.get(tableName, key).then(value => fcn(0, value)).catch(err => {
            WebUtils.log(err);
            fcn(-2, null);
        });
    }

    deleteItem (tableName, key, fcn) {
        if (!this.tableDes[tableName]) return fcn(-1, null);
        WebStore.remove(tableName, key).then(() => fcn(0, null)).catch(err => {
            WebUtils.log(err);
            fcn(-2, null);
        });
    }

    getAllItems (tableName, fcn) {
        if (!this.tableDes[tableName]) return fcn(-1, null);
        WebStore.all(tableName).then(items => fcn(0, items)).catch(err => {
            WebUtils.log(err);
            fcn(-2, null);
        });
    }

    deleteAllItems (tableName, fcn) {
        if (!this.tableDes[tableName]) return fcn(-1, null);
        WebStore.clear(tableName).then(() => fcn(0, null)).catch(err => {
            WebUtils.log(err);
            fcn(-2, null);
        });
    }

    exec (body, fcn) {
        const json = typeof body === 'string' ? JSON.parse(body) : body;
        const sqlData = getSQLData(json.stmt, json.values || []);
        ExecWebForageSQL(sqlData, this, fcn);
    }

    stmt (body, fcn) {
        this.exec(body, (code, value) => fcn(code === 0 ? (typeof value === 'string' ? value : true) : null));
    }

    query (body, fcn) {
        this.exec(body, (code, list) => fcn(code === 0 ? list : null));
    }
}
