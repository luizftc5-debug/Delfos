-- Esquema inicial do back end do Delfos (Cloudflare D1, que é SQLite).
--
-- O estado do painel (o mesmo JSON que o navegador guarda no localStorage)
-- é gravado como TEXTO, cortado em pedaços na tabela `textos`: uma linha do
-- D1 aceita no máximo ~2 MB, e o estado pode passar disso. O servidor nunca
-- interpreta esse JSON — só guarda, devolve e versiona.

-- Metadados da versão em vigor. Uma linha só (id = 1).
CREATE TABLE estado_atual (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  revisao       INTEGER NOT NULL,            -- sobe 1 a cada gravação; é o que detecta conflito
  atualizado_em TEXT    NOT NULL,            -- ISO 8601
  dispositivo   TEXT    NOT NULL DEFAULT '', -- "Chrome no Android", só para exibir
  tamanho       INTEGER NOT NULL,            -- caracteres do JSON
  anexos        TEXT    NOT NULL DEFAULT '[]' -- ids de anexo citados no estado (JSON), para a limpeza
);

-- Cópias antigas do estado, para desfazer uma sobrescrita ou um conflito.
CREATE TABLE versoes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  revisao     INTEGER NOT NULL,
  salvo_em    TEXT    NOT NULL,  -- quando aquela versão foi escrita originalmente
  guardado_em TEXT    NOT NULL,  -- quando virou cópia
  dispositivo TEXT    NOT NULL DEFAULT '',
  motivo      TEXT    NOT NULL DEFAULT '',
  tamanho     INTEGER NOT NULL,
  anexos      TEXT    NOT NULL DEFAULT '[]'
);

-- Pedaços de texto: chave 'atual' para o estado em vigor, 'v:<id>' para cada versão.
CREATE TABLE textos (
  chave    TEXT    NOT NULL,
  indice   INTEGER NOT NULL,
  conteudo TEXT    NOT NULL,
  PRIMARY KEY (chave, indice)
);

-- Anexos (PDF, slides, imagens dos resumos). Mesmo id do IndexedDB do navegador.
CREATE TABLE arquivos (
  id        TEXT    PRIMARY KEY,
  tipo      TEXT    NOT NULL DEFAULT '',
  tamanho   INTEGER NOT NULL,
  partes    INTEGER NOT NULL,
  criado_em TEXT    NOT NULL
);

-- O conteúdo binário, em partes de até 1 MB (mesmo limite de linha do D1).
CREATE TABLE arquivo_partes (
  arquivo_id TEXT    NOT NULL,
  indice     INTEGER NOT NULL,
  dados      BLOB    NOT NULL,
  PRIMARY KEY (arquivo_id, indice)
);

-- Senhas erradas recentes, por IP — trava o chute em série.
CREATE TABLE tentativas_login (
  ip TEXT    NOT NULL,
  em INTEGER NOT NULL -- milissegundos desde 1970
);
CREATE INDEX idx_tentativas_ip ON tentativas_login (ip, em);
