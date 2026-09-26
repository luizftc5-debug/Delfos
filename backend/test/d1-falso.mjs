/* D1 de mentira sobre o SQLite embutido no Node (node:sqlite), para testar
   o Worker sem conta na Cloudflare. Imita só o que o código usa:
   prepare().bind().first()/all()/run() e batch() transacional. */

import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MIGRACOES = fileURLToPath(new URL("../migrations/", import.meta.url));

export function criarD1() {
  const db = new DatabaseSync(":memory:");
  for (const f of readdirSync(MIGRACOES).filter((n) => n.endsWith(".sql")).sort()) {
    db.exec(readFileSync(MIGRACOES + f, "utf8"));
  }

  const converter = (v) => (v instanceof ArrayBuffer ? new Uint8Array(v) : v);

  class Comando {
    constructor(sql, params = []) { this.sql = sql; this.params = params; }
    bind(...params) { return new Comando(this.sql, params.map(converter)); }
    executar() {
      const st = db.prepare(this.sql);
      if (/^\s*(SELECT|WITH)/i.test(this.sql)) return { results: st.all(...this.params), success: true };
      const r = st.run(...this.params);
      return { results: [], success: true, meta: { changes: r.changes } };
    }
    async first() { return this.executar().results[0] ?? null; }
    async all() { return this.executar(); }
    async run() { return this.executar(); }
  }

  return {
    sqlite: db,
    prepare: (sql) => new Comando(sql),
    async batch(comandos) {
      db.exec("BEGIN");
      try {
        const r = comandos.map((c) => c.executar());
        db.exec("COMMIT");
        return r;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}
