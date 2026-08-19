class SQLMatch {
    constructor (key) {
        this.key = key;
    }

    isMatch (sql) {
        return sql.trim().toLowerCase().startsWith(this.key);
    }
}

class SQLSelect extends SQLMatch {
    constructor () { super('select'); }
    match (sql) {
        const m = sql.match(/select\s+([a-zA-Z0-9,*]+)\s+from\s+([a-zA-Z0-9_]+)/i);
        if (!m) return null;
        const out = {SQL: 'select', KEY: m[1].split(','), TABLE: m[2]};
        const order = sql.match(/order\s+by\s+([a-zA-Z0-9_]+)\s+(asc|desc)/i);
        if (order) out.ORDERBY = [{key: order[1], value: order[2].toLowerCase()}];
        return out;
    }
}

class SQLInsert extends SQLMatch {
    constructor () { super('insert'); }
    match (sql, values) {
        const m = sql.match(/insert\s+into\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)/i);
        if (!m) return null;
        const keys = m[2].split(',').map(k => k.trim());
        const obj = {};
        keys.forEach((key, i) => { obj[key] = values[i]; });
        return {SQL: 'insert', TABLE: m[1], KEY: keys, OBJ: obj};
    }
}

class SQLUpdate extends SQLMatch {
    constructor () { super('update'); }
    match (sql, values) {
        const table = sql.match(/update\s+([a-zA-Z0-9_]+)/i);
        const set = sql.match(/\sset\s+(.+?)(?:\swhere\s|$)/i);
        if (!table || !set) return null;
        const assignments = set[1].split(',').map(v => v.trim());
        const obj = {};
        let valueIndex = 0;
        assignments.forEach(item => {
            const m = item.match(/^([a-zA-Z0-9_]+)\s*=\s*\?$/);
            if (m) obj[m[1]] = values[valueIndex++];
        });
        return {SQL: 'update', TABLE: table[1], OBJ: obj, SET_VALUE_COUNT: valueIndex};
    }
}

class SQLDelete extends SQLMatch {
    constructor () { super('delete'); }
    match (sql) {
        const m = sql.match(/delete\s+from\s+([a-zA-Z0-9_]+)/i);
        return m ? {SQL: 'delete', TABLE: m[1]} : null;
    }
}

function parseWhere (sql, values, offset) {
    const where = sql.match(/\swhere\s+(.+?)(?:\sorder\s+by\s|$)/i);
    if (!where) return null;
    const result = {};
    let valueIndex = offset || 0;
    where[1].split(/\s+AND\s+/i).forEach(part => {
        let m = part.match(/^\s*([a-zA-Z0-9_]+)\s*=\s*\?\s*$/);
        if (m) {
            result[m[1]] = values[valueIndex++];
            return;
        }
        m = part.match(/^\s*([a-zA-Z0-9_]+)\s*=\s*['\"]?([^'\"]+)['\"]?\s*$/);
        if (m) result[m[1]] = m[2];
    });
    return Object.keys(result).length ? result : null;
}

export function getSQLData (sql, values) {
    const text = sql.trim();
    const matchers = [new SQLSelect(), new SQLInsert(), new SQLUpdate(), new SQLDelete()];
    let data = null;
    for (let i = 0; i < matchers.length; i++) {
        if (matchers[i].isMatch(text)) {
            data = matchers[i].match(text, values || []);
            break;
        }
    }
    if (!data) return null;
    data.WHERE = parseWhere(text, values || [], data.SET_VALUE_COUNT || 0);
    return data;
}

export function isEmptyOrSpaces (str) {
    return str == null || /^\s*$/.test(str);
}

export function uuidv4 () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
