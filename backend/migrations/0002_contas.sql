-- Contas de usuário: cada pessoa tem o próprio estado, versões e anexos.
--
-- Migrações nunca são reescritas depois de publicadas, então as tabelas da
-- versão de senha única (0001) não são apagadas: viram legado_*, e nada as
-- lê mais. Se algum servidor chegou a guardar dados nelas, eles continuam lá.

ALTER TABLE estado_atual   RENAME TO legado_estado_atual;
ALTER TABLE versoes        RENAME TO legado_versoes;
ALTER TABLE textos         RENAME TO legado_textos;
ALTER TABLE arquivos       RENAME TO legado_arquivos;
ALTER TABLE arquivo_partes RENAME TO legado_arquivo_partes;
DROP TABLE tentativas_login; -- só contagem de senhas erradas recentes

-- A conta guarda o mínimo: e-mail e o que confere a senha. Nome, foto,
-- nascimento etc. ficam no perfil, dentro do estado — dado do usuário, que
-- ele edita e exporta, não dado de login.
CREATE TABLE usuarios (
  id               TEXT PRIMARY KEY,     -- UUID aleatório; nunca muda
  email            TEXT NOT NULL UNIQUE, -- minúsculo, sem espaços
  senha_sal        TEXT NOT NULL,        -- 16 bytes aleatórios, único por conta
  senha_hash       TEXT NOT NULL,        -- HMAC-SHA256(sal, chave) — ver src/contas.js
  senha_algoritmo  TEXT NOT NULL,        -- permite trocar o esquema no futuro sem quebrar contas antigas
  criado_em        TEXT NOT NULL,
  senha_trocada_em TEXT NOT NULL
);

-- Sessões: o token vai só para o navegador; aqui fica o SHA-256 dele. Quem
-- ler o banco não consegue se passar por ninguém.
CREATE TABLE sessoes (
  token_hash  TEXT PRIMARY KEY,
  usuario_id  TEXT NOT NULL,
  criada_em   TEXT NOT NULL,
  expira_em   INTEGER NOT NULL, -- milissegundos desde 1970
  dispositivo TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_sessoes_usuario ON sessoes (usuario_id);

CREATE TABLE estado_atual (
  usuario_id    TEXT PRIMARY KEY,
  revisao       INTEGER NOT NULL,
  atualizado_em TEXT    NOT NULL,
  dispositivo   TEXT    NOT NULL DEFAULT '',
  tamanho       INTEGER NOT NULL,
  anexos        TEXT    NOT NULL DEFAULT '[]'
);

CREATE TABLE versoes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id  TEXT    NOT NULL,
  revisao     INTEGER NOT NULL,
  salvo_em    TEXT    NOT NULL,
  guardado_em TEXT    NOT NULL,
  dispositivo TEXT    NOT NULL DEFAULT '',
  motivo      TEXT    NOT NULL DEFAULT '',
  tamanho     INTEGER NOT NULL,
  anexos      TEXT    NOT NULL DEFAULT '[]'
);
CREATE INDEX idx_versoes_usuario ON versoes (usuario_id, id);

-- chave: 'atual:<usuario>' para o estado em vigor, 'v:<id da versão>' para cópias.
CREATE TABLE textos (
  chave    TEXT    NOT NULL,
  indice   INTEGER NOT NULL,
  conteudo TEXT    NOT NULL,
  PRIMARY KEY (chave, indice)
);

-- O id do anexo vem do navegador; a chave inclui o usuário para uma conta
-- nunca alcançar (nem sobrescrever) o arquivo de outra.
CREATE TABLE arquivos (
  usuario_id TEXT    NOT NULL,
  id         TEXT    NOT NULL,
  tipo       TEXT    NOT NULL DEFAULT '',
  tamanho    INTEGER NOT NULL,
  partes     INTEGER NOT NULL,
  criado_em  TEXT    NOT NULL,
  PRIMARY KEY (usuario_id, id)
);

CREATE TABLE arquivo_partes (
  usuario_id TEXT    NOT NULL,
  arquivo_id TEXT    NOT NULL,
  indice     INTEGER NOT NULL,
  dados      BLOB    NOT NULL,
  PRIMARY KEY (usuario_id, arquivo_id, indice)
);

-- Tentativas recentes (senha errada, cadastro), para travar abuso.
-- chave: 'entrar-email:<email>', 'entrar-ip:<ip>', 'cadastro-ip:<ip>'.
CREATE TABLE tentativas (
  chave TEXT    NOT NULL,
  em    INTEGER NOT NULL
);
CREATE INDEX idx_tentativas ON tentativas (chave, em);
