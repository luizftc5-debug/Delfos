/* ===========================================================================
   Arquivos — anexos (PDF, slides, imagens) guardados no navegador.

   Por que não no localStorage: ele guarda ~5 MB no total e só texto. Um PDF de
   aula estoura isso sozinho. O IndexedDB aceita centenas de MB e guarda o
   arquivo como está, então é ele quem carrega os anexos.

   O que fica no Store (localStorage) é só a ficha do anexo — id, nome, tipo e
   tamanho. O conteúdo mora aqui, e o backup junta os dois.
   =========================================================================== */

const Arquivos = (() => {
  const BANCO = "organizador.arquivos";
  const LOJA = "arquivos";
  const LIMITE_MB = 25;

  let bancoAberto = null;

  function abrir() {
    if (bancoAberto) return bancoAberto;
    bancoAberto = new Promise((ok, falha) => {
      const req = indexedDB.open(BANCO, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(LOJA)) req.result.createObjectStore(LOJA, { keyPath: "id" });
      };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => falha(req.error || new Error("Não foi possível abrir o armazenamento de arquivos."));
    });
    return bancoAberto;
  }

  function transacao(modo, fn) {
    return abrir().then(
      (db) =>
        new Promise((ok, falha) => {
          const tx = db.transaction(LOJA, modo);
          const req = fn(tx.objectStore(LOJA));
          tx.onerror = () => falha(tx.error);
          tx.onabort = () => falha(tx.error || new Error("Gravação cancelada."));
          if (req) req.onsuccess = () => ok(req.result);
          else tx.oncomplete = () => ok();
        })
    );
  }

  /* ------------------------------ Formatos -------------------------------- */

  function tamanhoLegivel(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
  }

  /** Rótulo e cor do ícone a partir da extensão/tipo — usado pela lista. */
  function classificar(anexo) {
    const nome = String(anexo?.nome || "");
    const ext = (nome.split(".").pop() || "").toLowerCase();
    const tipo = String(anexo?.tipo || "");
    if (ext === "pdf" || tipo === "application/pdf") return { classe: "pdf", rotulo: "PDF" };
    if (tipo.startsWith("image/")) return { classe: "img", rotulo: ext.slice(0, 4) || "IMG" };
    if (["doc", "docx", "odt", "rtf", "txt", "md"].includes(ext)) return { classe: "doc", rotulo: ext };
    if (["xls", "xlsx", "csv", "ods"].includes(ext)) return { classe: "xls", rotulo: ext };
    if (["ppt", "pptx", "odp"].includes(ext)) return { classe: "img", rotulo: ext };
    return { classe: "", rotulo: ext.slice(0, 4) || "arq" };
  }

  /* ------------------------------- Escrita -------------------------------- */

  /**
   * Guarda um File e devolve a ficha que vai para o Store.
   * Recusa arquivos acima do limite — melhor avisar do que falhar na gravação.
   */
  async function salvar(file) {
    if (!file) throw new Error("Nenhum arquivo escolhido.");
    if (file.size > LIMITE_MB * 1024 * 1024) {
      throw new Error(`"${file.name}" tem ${tamanhoLegivel(file.size)}. O limite por arquivo é ${LIMITE_MB} MB.`);
    }
    const id = `arq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const dados = await file.arrayBuffer();
    await transacao("readwrite", (loja) => loja.put({ id, dados, tipo: file.type || "" }));
    return { id, nome: file.name, tipo: file.type || "", tamanho: file.size, salvoEm: new Date().toISOString() };
  }

  async function remover(id) {
    if (!id) return;
    try { await transacao("readwrite", (loja) => loja.delete(id)); }
    catch (e) { console.warn("Não foi possível apagar o anexo.", e); }
  }

  /* -------------------------------- Leitura ------------------------------- */

  /**
   * O arquivo de um anexo. Se ele não está neste navegador (foi anexado em
   * outro aparelho) e a sincronização está ligada, busca na nuvem e guarda
   * aqui, para a próxima abertura não precisar da rede. `soLocal` é para
   * quem está justamente enviando à nuvem e não pode buscar lá.
   */
  async function blob(anexo, { soLocal = false } = {}) {
    const reg = await transacao("readonly", (loja) => loja.get(anexo.id));
    if (reg) return new Blob([reg.dados], { type: reg.tipo || anexo.tipo || "application/octet-stream" });
    if (soLocal || typeof Nuvem === "undefined" || !Nuvem.conectado()) return null;

    const remoto = await Nuvem.baixarAnexo(anexo.id);
    if (!remoto) return null;
    const tipo = remoto.type || anexo.tipo || "";
    try {
      const dados = await remoto.arrayBuffer();
      await transacao("readwrite", (loja) => loja.put({ id: anexo.id, dados, tipo }));
    } catch (e) {
      console.warn("Anexo baixado da nuvem, mas não guardado neste navegador.", e);
    }
    return new Blob([remoto], { type: tipo || "application/octet-stream" });
  }

  /** Ids de todos os anexos guardados neste navegador (usado pela sincronização). */
  async function ids() {
    const db = await abrir();
    return new Promise((ok, falha) => {
      const req = db.transaction(LOJA, "readonly").objectStore(LOJA).getAllKeys();
      req.onsuccess = () => ok(req.result || []);
      req.onerror = () => falha(req.error);
    });
  }

  /** Abre em outra aba (PDF/imagem) ou baixa (o resto). */
  async function abrirAnexo(anexo) {
    const b = await blob(anexo);
    if (!b) throw new Error("Este anexo não está neste navegador nem na nuvem. Importe o backup que o contém.");
    const url = URL.createObjectURL(b);
    const visualizavel = b.type === "application/pdf" || b.type.startsWith("image/") || b.type.startsWith("text/");
    if (visualizavel) {
      window.open(url, "_blank", "noopener");
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = anexo.nome || "arquivo";
      a.click();
    }
    // Só revoga depois que o navegador teve tempo de ler a URL.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function baixar(anexo) {
    const b = await blob(anexo);
    if (!b) throw new Error("Este anexo não está neste navegador.");
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = anexo.nome || "arquivo";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* ------------------------- Backup: exportar/importar --------------------- */

  function paraBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let s = "";
    // Em blocos: passar um array gigante de uma vez estoura a pilha.
    for (let i = 0; i < bytes.length; i += 8192) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
    }
    return btoa(s);
  }

  function deBase64(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  /** Todos os anexos em base64, para entrarem no .json do backup. */
  async function exportarTodos() {
    const db = await abrir();
    const registros = await new Promise((ok, falha) => {
      const req = db.transaction(LOJA, "readonly").objectStore(LOJA).getAll();
      req.onsuccess = () => ok(req.result || []);
      req.onerror = () => falha(req.error);
    });
    return registros.map((r) => ({ id: r.id, tipo: r.tipo || "", dados: paraBase64(r.dados) }));
  }

  async function importarTodos(lista) {
    if (!Array.isArray(lista) || !lista.length) return 0;
    let n = 0;
    for (const item of lista) {
      if (!item?.id || !item?.dados) continue;
      try {
        await transacao("readwrite", (loja) => loja.put({ id: item.id, dados: deBase64(item.dados), tipo: item.tipo || "" }));
        n++;
      } catch (e) {
        console.warn(`Anexo ${item.id} não pôde ser restaurado.`, e);
      }
    }
    return n;
  }

  async function limpar() {
    try { await transacao("readwrite", (loja) => loja.clear()); }
    catch (e) { console.warn("Não foi possível limpar os anexos.", e); }
  }

  /** Quanto os anexos ocupam — mostrado no pop-up de perfil e no backup. */
  async function uso() {
    try {
      const db = await abrir();
      const registros = await new Promise((ok, falha) => {
        const req = db.transaction(LOJA, "readonly").objectStore(LOJA).getAll();
        req.onsuccess = () => ok(req.result || []);
        req.onerror = () => falha(req.error);
      });
      return {
        quantidade: registros.length,
        bytes: registros.reduce((s, r) => s + (r.dados?.byteLength || 0), 0),
      };
    } catch {
      return { quantidade: 0, bytes: 0 };
    }
  }

  const disponivel = typeof indexedDB !== "undefined";

  return {
    LIMITE_MB, disponivel,
    salvar, remover, blob, ids, abrirAnexo, baixar,
    exportarTodos, importarTodos, limpar, uso,
    tamanhoLegivel, classificar,
  };
})();
