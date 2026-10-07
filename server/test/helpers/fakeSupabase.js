/** Minimal in-memory stand-in for the supabase-js query builder (only what the app uses). */
function createFakeSupabase(seed = {}) {
  const tables = { videos: [...(seed.videos || [])], comments: [...(seed.comments || [])] };
  const failOn = new Set(); // e.g. 'comments:upsert' or 'videos:select'
  const calls = [];
  const failOnCall = new Map(); // e.g. 'comments:upsert' -> 2 fails the 2nd upsert only
  const counts = {};

  function from(name) {
    const state = { op: 'select', filters: [], rows: null, single: false };
    const q = {
      select() { return q; },
      order() { return q; },
      limit() { return q; },
      eq(col, val) { state.filters.push([col, val]); return q; },
      maybeSingle() { state.single = true; return q; },
      delete() { state.op = 'delete'; return q; },
      upsert(rows) { state.op = 'upsert'; state.rows = rows; return q; },
      then(resolve, reject) { return Promise.resolve(exec()).then(resolve, reject); },
    };

    function exec() {
      const key = `${name}:${state.op}`;
      calls.push(key);
      counts[key] = (counts[key] || 0) + 1;
      if (failOnCall.get(key) === counts[key]) return { data: null, error: { message: 'simulated failure' } };
      if (failOn.has(`${name}:${state.op}`)) return { data: null, error: { message: 'simulated failure' } };
      const matches = (row) => state.filters.every(([c, v]) => row[c] === v);
      if (state.op === 'select') {
        const rows = tables[name].filter(matches);
        return { data: state.single ? rows[0] || null : rows, error: null };
      }
      if (state.op === 'delete') {
        tables[name] = tables[name].filter((r) => !matches(r));
        return { data: null, error: null };
      }
      for (const row of state.rows) {
        const i = tables[name].findIndex((r) => r.id === row.id);
        if (i >= 0) tables[name][i] = row; else tables[name].push(row);
      }
      return { data: null, error: null };
    }
    return q;
  }

  return { from, tables, failOn, failOnCall, calls };
}

module.exports = { createFakeSupabase };
