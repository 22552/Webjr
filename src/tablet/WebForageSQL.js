import {uuidv4} from './WebSQLMatch';

function matchesWhere (obj, where) {
    if (!where) return true;
    if (!obj) return false;
    return Object.keys(where).every(key => obj[key] == where[key]); // eslint-disable-line eqeqeq
}

function getObjects (sqlData, db, fcn) {
    const table = sqlData.TABLE;
    const primary = db.getTablePrimary(table);
    const where = sqlData.WHERE;
    if (where && primary && where[primary] != null) {
        db.getItem(table, where[primary], (code, obj) => {
            if (code !== 0) return fcn(code, null);
            fcn(0, obj && matchesWhere(obj, where) ? [obj] : []);
        });
        return;
    }
    db.getAllItems(table, (code, list) => {
        if (code !== 0) return fcn(code, null);
        let result = (list || []).filter(item => matchesWhere(item, where));
        if (sqlData.ORDERBY && sqlData.ORDERBY.length) {
            const rule = sqlData.ORDERBY[0];
            result.sort((a, b) => {
                const av = a[rule.key];
                const bv = b[rule.key];
                if (av === bv) return 0;
                const n = av > bv ? 1 : -1;
                return rule.value === 'desc' ? -n : n;
            });
        }
        fcn(0, result);
    });
}

export function ExecWebForageSQL (sqlData, db, fcn) {
    if (!sqlData || !sqlData.SQL) {
        fcn(-1, null);
        return false;
    }
    const table = sqlData.TABLE;
    const primary = db.getTablePrimary(table);

    if (sqlData.SQL === 'select') {
        getObjects(sqlData, db, fcn);
        return true;
    }

    if (sqlData.SQL === 'insert') {
        const obj = sqlData.OBJ || {};
        let key = primary ? obj[primary] : null;
        if (key == null) key = uuidv4();
        db.setItem(table, key, obj, (code) => fcn(code, code === 0 ? key : null));
        return true;
    }

    if (sqlData.SQL === 'update') {
        getObjects(sqlData, db, (code, list) => {
            if (code !== 0) return fcn(code, null);
            if (!list || !list.length) return fcn(-1, null);
            let remaining = list.length;
            const updated = [];
            list.forEach(item => {
                const key = item[primary];
                db.updateItem(table, key, sqlData.OBJ || {}, (updateCode, value) => {
                    if (updateCode === 0) updated.push(value);
                    remaining--;
                    if (remaining === 0) fcn(0, updated);
                });
            });
        });
        return true;
    }

    if (sqlData.SQL === 'delete') {
        getObjects(sqlData, db, (code, list) => {
            if (code !== 0) return fcn(code, null);
            if (!list || !list.length) return fcn(0, null);
            let remaining = list.length;
            list.forEach(item => {
                db.deleteItem(table, item[primary], () => {
                    remaining--;
                    if (remaining === 0) fcn(0, null);
                });
            });
        });
        return true;
    }

    fcn(-1, null);
    return false;
}
