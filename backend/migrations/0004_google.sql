-- O sub do Google é a identidade estável. E-mails iguais nunca vinculam contas
-- automaticamente; a senha anterior precisa ser confirmada pelo usuário.
CREATE TABLE identidades_google (
  sub TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TEXT NOT NULL
);

-- Um nonce vale cinco minutos e uma única autenticação bem-sucedida.
-- O valor enviado ao Google não fica no banco, apenas seu hash.
CREATE TABLE google_desafios (
  nonce_hash TEXT PRIMARY KEY,
  origem TEXT NOT NULL,
  expira_em INTEGER NOT NULL,
  usado INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_google_desafios_expira ON google_desafios(expira_em);
