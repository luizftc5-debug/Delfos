-- Código de recuperação: a forma de redefinir a senha sem depender de e-mail.
-- Gerado no cadastro e mostrado uma única vez; aqui fica só o SHA-256 dele
-- (o código é aleatório, com 100 bits, então hash rápido basta).
-- Vazio = a conta ainda não tem código (gera-se um pelo painel).
ALTER TABLE usuarios ADD COLUMN recuperacao_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE usuarios ADD COLUMN recuperacao_gerada_em TEXT NOT NULL DEFAULT '';
