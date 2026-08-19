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

function parseLiteral (text) {
    const trimmed = text.trim();
    if (/^null$/i.test(trimmed)) return null;
    if ((trimmed[0] === '"' && trimmed[trimmed.length - 1] === '"') || (trimmed[0] === "'" && trimmed[trimmed.length - 1] === "'")) {
        return trimmed.substring(1, trimmed.length - 1);
    }
    if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(trimmed)) return Number(trimmed);
    return trimmed;
}

function parseWhere (sql, values, offset) {
    const where = sql.match(/\swhere\s+(.+?)(?:\sorder\s+by\s|$)/i);
    if (!where) return null;
    const clauses = [];
    let valueIndex = offset || 0;
    where[1].split(/\s+AND\s+/i).forEach(part => {
        let m = part.match(/^\s*([a-zA-Z0-9_]+)\s*(=|!=|<>)\s*\?\s*$/i);
        if (m) {
            clauses.push({key: m[1], op: m[2] === '=' ? 'eq' : 'ne', value: values[valueIndex++]});
            return;
        }
        m = part.match(/^\s*([a-zA-Z0-9_]+)\s+IS\s+(NOT\s+)?NULL\s*$/i);
        if (m) {
            clauses.push({key: m[1], op: m[2] ? 'notnull' : 'isnull'});
            return;
        }
        m = part.match(/^\s*([a-zA-Z0-9_]+)\s*(=|!=|<>)\s*(.+?)\s*$/i);
        if (m) clauses.push({key: m[1], op: m[2] === '=' ? 'eq' : 'ne', value: parseLiteral(m[3])});
    });
    return clauses.length ? clauses : null;
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
