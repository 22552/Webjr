import {uuidv4} from './WebSQLMatch';

function matchesClause (obj, clause) {
    const value = obj ? obj[clause.key] : undefined;
    switch (clause.op) {
    case 'eq': return value == clause.value; // eslint-disable-line eqeqeq
    case 'ne': return value != clause.value; // eslint-disable-line eqeqeq
    case 'isnull': return value == null; // eslint-disable-line eqeqeq
    case 'notnull': return value != null; // eslint-disable-line eqeqeq
    default: return true;
    }
}

function matchesWhere (obj, where) {
    if (!where || !where.length) return true;
    if (!obj) return false;
    return where.every(clause => matchesClause(obj, clause));
}

function primaryLookupValue (where, primary) {
    if (!where || !primary) return null;
    for (let i = 0; i < where.length; i++) {
        if (where[i].key === primary && where[i].op === 'eq') return where[i].value;
    }
    return null;
}

function getObjects (sqlData, db, fcn) {
    const table = sqlData.TABLE;
    const primary = db.getTablePrimary(table);
    const where = sqlData.WHERE;
    const lookup = primaryLookupValue(where, primary);
    if (lookup != null) {
        db.getItem(table, lookup, (code, obj) => {
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
        db.setItem(table, key, obj, code => fcn(code, code === 0 ? key : null));
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
