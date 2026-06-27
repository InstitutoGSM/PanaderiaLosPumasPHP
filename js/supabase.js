const API_BASE = 'api';

// ── queries ─────────────
class Q {
  constructor(table) {
    this._t  = table;
    this._a  = 'select';
    this._s  = '*';
    this._f  = [];
    this._o  = null;
    this._lim = null;
    this._1  = false;
    this._cnt = false;
    this._d  = null;
    this._uc = null;
  }

  select(cols = '*', opts = {}) {
    this._a = 'select';
    this._s = cols;
    if (opts.count === 'exact' && opts.head) this._cnt = true;
    return this;
  }
  insert(data)         { this._a = 'insert'; this._d = data; return this; }
  update(data)         { this._a = 'update'; this._d = data; return this; }
  upsert(data, o = {}) { this._a = 'upsert'; this._d = data; this._uc = o.onConflict || null; return this; }
  delete()             { this._a = 'delete'; return this; }

  eq(col, val)        { this._f.push({ type: 'eq',    col, val });     return this; }
  in(col, vals)       { this._f.push({ type: 'in',    col, vals });    return this; }
  ilike(col, pattern) { this._f.push({ type: 'ilike', col, pattern }); return this; }
  order(col, opts = {}) { this._o = { col, asc: opts.ascending ?? true }; return this; }
  limit(n)  { this._lim = n; return this; }
  single()  { this._1 = true; return this; }

  async _run() {
    const r = await fetch(`${API_BASE}/query.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        action:        this._a,
        table:         this._t,
        select:        this._s,
        filters:       this._f,
        order:         this._o,
        limit:         this._lim,
        single:        this._1,
        countOnly:     this._cnt,
        data:          this._d,
        upsertConflict: this._uc,
      }),
    });
    return r.json();
  }

  then(res, rej) { return this._run().then(res, rej); }
  catch(rej)     { return this._run().catch(rej); }
}

// ── Auth ──────────────────────────────────────────────────────
const _authFetch = (body) =>
  fetch(`${API_BASE}/auth.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  }).then(r => r.json());

const auth = {
  async getSession() {
    const d = await _authFetch({ action: 'getSession' });
    if (d.session) return { data: { session: { user: d.session } } };
    return { data: { session: null } };
  },
  async signInWithPassword({ email, password }) {
    const d = await _authFetch({ action: 'login', email, password });
    if (d.error) return { data: null, error: { message: d.error } };
    return { data: { user: d.user }, error: null };
  },
  async signUp({ email, password }) {
    const d = await _authFetch({ action: 'register', email, password });
    if (d.error) return { data: null, error: { message: d.error } };
    return { data: { user: d.user }, error: null };
  },
  async signOut() {
    await _authFetch({ action: 'logout' });
    return { error: null };
  },
  async updateUser({ password }) {
    const d = await _authFetch({ action: 'updatePassword', password });
    if (d.error) return { error: { message: d.error } };
    return { error: null };
  },
  async resetPasswordForEmail(email, opts = {}) {
    const d = await _authFetch({ action: 'resetPassword', email, redirectTo: opts.redirectTo });
    if (d.error) return { error: { message: d.error } };
    return { error: null };
  },
};

// ── Storage ───────────────────────────────────────────────────
const storage = {
  from(bucket) {
    const dirMap = { productos: 'assets/productos', avatares: 'assets/avatares' };
    return {
      async upload(path, file) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('bucket', bucket);
        fd.append('path', path);
        const r = await fetch(`${API_BASE}/upload.php`, {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });
        const d = await r.json();
        if (d.error) return { error: d.error };
        // Guardar la URL publica para que "getPublicUrl" funcione
        storage._lastUrl[bucket] = d.publicUrl;
        return { data: d, error: null };
      },
      getPublicUrl(path) {
        // Si viene de un upload reciente usamos esa URL; si no, construimos con la ruta guardada
        const url = storage._lastUrl[bucket] || `${dirMap[bucket] || 'assets'}/${path.split('/').pop()}`;
        return { data: { publicUrl: url } };
      },
    };
  },
  _lastUrl: {},
};

const channel = (name) => {
  const noop = { on: () => noop, subscribe: () => noop };
  return noop;
};

// ── Export ────────────────────────────────────────────────────
export const supabase = {
  from:    (table) => new Q(table),
  auth,
  storage,
  channel,
};