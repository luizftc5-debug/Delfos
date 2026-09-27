# Back end do Delfos

Servidor que guarda as **contas** do Delfos e os dados de cada uma. Com ele publicado, o painel só
abre depois de entrar numa conta, e cada pessoa vê só o que é dela, em qualquer aparelho.

Roda na **Cloudflare** (Workers + banco D1), no plano gratuito, sem máquina para manter ligada.

## O que ele faz

| Função | Como funciona |
|---|---|
| **Contas** | Cadastro com nome, e-mail e senha. Na primeira abertura, o painel pede para entrar ou criar conta. |
| **Senha guardada do jeito certo** | A senha nunca sai do aparelho: vira uma chave por PBKDF2-SHA256 com 600 mil iterações (recomendação da OWASP) e só essa chave viaja. O servidor guarda um hash dela com sal aleatório por conta. Nem quem tiver o banco inteiro vê a senha. |
| **Senha vazada é recusada** | Ao criar ou trocar a senha, o painel confere na base do *Have I Been Pwned* se ela já apareceu em vazamentos, como pede a norma do NIST (SP 800-63B). Só os 5 primeiros caracteres de um hash da senha saem do aparelho. |
| **Sessões** | Toda vez que o navegador é aberto, o Delfos pede a senha — a menos que se marque **Manter conectado** (aí vale 30 dias). Sem marcar, a sessão vale no máximo 12 h e some ao fechar o navegador. No banco fica só o hash do token. Sair encerra na hora (em todas as abas). Trocar a senha desconecta os outros aparelhos. |
| **Esqueci a senha** | Ao criar a conta aparece um **código de recuperação** (ex.: `K7QP-2MXA-…`), uma única vez. Com ele, "Esqueci minha senha" na tela de entrada troca a senha sem precisar de e-mail. Usar o código gera outro e desconecta todos os aparelhos. Dá para gerar um novo pelo painel. |
| **Contra tentativa e erro** | 10 senhas erradas para o mesmo e-mail travam o login por 15 min; no máximo 5 contas novas por hora do mesmo endereço de internet. |
| **Dados separados por conta** | Estado, versões e anexos são sempre buscados pelo dono da sessão — uma conta não alcança a outra nem sabendo o id de um arquivo. |
| **Sincronização** | Cada mudança sobe sozinha ~1 s depois. Se dois aparelhos mudaram ao mesmo tempo, o painel pergunta qual versão fica. |
| **Versões anteriores** | Cópias automáticas (no máximo uma a cada 10 min de uso) e toda versão que perdeu um conflito. As 60 mais recentes, restauráveis. |
| **Anexos na nuvem** | PDFs e imagens dos resumos sobem junto, até 100 MB por conta. |
| **Excluir a conta** | Pelo perfil, confirmando a senha. Apaga tudo do servidor e do navegador (direito de eliminação da LGPD, art. 18). |

**O que o navegador guarda:** o token da sessão, o e-mail e o id da conta (`organizador.sessao`) e
a cópia de trabalho dos dados, como sempre. **Sair da conta apaga os dados do navegador** — eles
continuam na conta. Por isso dá para usar um computador emprestado sem deixar nada para trás.

## Publicar (uma vez só)

Tudo pelo navegador, sem instalar nada.

### 1. Conta na Cloudflare

1. Crie uma conta gratuita em <https://dash.cloudflare.com/sign-up>.
2. No menu da esquerda, abra **Workers & Pages** uma vez — a Cloudflare pede para escolher um
   subdomínio (ex.: `luiz`). O servidor vai ficar em `https://delfos-api.<subdomínio>.workers.dev`.
3. Copie o **Account ID**: aparece na página inicial da conta, na coluna da direita.

### 2. Token de acesso da Cloudflare

1. Vá em <https://dash.cloudflare.com/profile/api-tokens> → **Create Token**.
2. Escolha o modelo **Edit Cloudflare Workers** → **Use template**.
3. Em **Permissions**, clique em **+ Add more** e acrescente: `Account` → `D1` → `Edit`.
4. **Continue to summary** → **Create Token**. Copie o token (ele só aparece uma vez).

### 3. Segredos no GitHub

No repositório, **Settings → Secrets and variables → Actions → New repository secret**:

| Nome | Valor | |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | o token do passo 2 | obrigatório |
| `CLOUDFLARE_ACCOUNT_ID` | o Account ID do passo 1 | obrigatório |
| `CODIGO_CONVITE` | um código qualquer (ex.: `delfos-turma-2026`) | **recomendado** — ver abaixo |

**Por que o convite é recomendado:** sem ele, qualquer pessoa que achar o endereço do site cria
conta. O banco gratuito da Cloudflare tem **500 MB no total**, somando todas as contas; alguém mal
intencionado criando contas e enchendo de anexos travaria o seu Delfos. Com o convite, só cria conta
quem você passar o código. Dá para tirar depois (apague o segredo e publique de novo).

### 4. Publicar

Aba **Actions** do repositório → **Back end** → **Run workflow**. Em ~2 minutos fica verde. Abra o
passo **Publicar o Worker**: o endereço do servidor aparece no fim
(`https://delfos-api.....workers.dev`).

### 5. Ligar as contas no painel

O endereço vai em `API_PUBLICA`, no alto de `dashboard/sessao.js`. É uma linha só — mas se não
quiser mexer em código, mande o endereço para o Claude fazer. **Até isso ser feito, o painel continua
abrindo sem conta**, só no navegador, como antes: é de propósito, para nada ficar trancado no meio do
caminho.

Depois de ligado, na primeira abertura aparece a tela de entrar. **No aparelho onde você já usa o
Delfos, escolha "Criar conta"**: o painel pergunta se quer levar os dados que já estão ali para a
conta nova — diga que sim. Nos outros aparelhos, só **Entrar**.

## Perguntas comuns

**Esqueci a senha.** Tela de entrada → **Esqueci minha senha** → e-mail, código de recuperação e
senha nova. Perdeu também o código? Se estiver conectado em algum aparelho, troque a senha ou gere
um código novo por lá (Conta e sincronização). Sem código e sem aparelho conectado não há volta —
é o preço de o servidor não conhecer a senha. Recuperação por e-mail exigiria um serviço de envio
(outra conta, outra chave); dá para acrescentar depois.

**Fico sem internet?** O painel funciona normal. As mudanças ficam no aparelho e sobem quando a
conexão voltar. Só entrar pela primeira vez num aparelho precisa de rede.

**Perdi o celular.** Em outro aparelho: Conta e sincronização → **Sair dos outros aparelhos** (ou
troque a senha, que faz o mesmo).

**Fiz besteira e sincronizou.** Conta e sincronização → **Versões anteriores** → **Restaurar**. A
versão de agora também vira cópia, então dá para desfazer.

**Quanto custa?** Nada, no uso de uma pessoa ou de poucas. O plano gratuito aceita 100 mil
requisições por dia; o banco tem 500 MB.

**O backup em arquivo ainda serve?** Sim — é uma cópia sua, fora de qualquer servidor.

## Para quem for mexer no código

```
backend/
  src/index.js       rotas, CORS e tratamento de erro
  src/contas.js      cadastro, login, sessões, troca de senha, exclusão, limites de tentativa
  src/estado.js      estado por conta, com revisão, conflito (409) e versões
  src/arquivos.js    anexos por conta, em partes de 1 MB, com cota
  src/textos.js      texto grande em pedaços de 400 mil caracteres
  src/limpeza.js     rotina diária (cron)
  migrations/        esquema do banco (SQL) — só acrescente, nunca reescreva uma publicada
  test/              testes (node --test, com um D1 falso sobre node:sqlite)
```

- **Testes:** `npm test` (Node 22+, sem instalar nada).
- **Rodar local:** `npm install` e `npm run dev` (servidor em `http://localhost:8787`). Sirva o
  painel em `http://localhost:8000` e, no console do navegador,
  `localStorage.setItem("organizador.api", "http://localhost:8787")` — liga as contas só naquele
  navegador, sem mexer em `API_PUBLICA`.
- **Por que as 600 mil iterações rodam no navegador?** O plano gratuito dá ~10 ms de CPU por
  requisição; PBKDF2 desse tamanho levaria centenas de ms no servidor. É o mesmo desenho do
  Bitwarden: o custo de cada palpite de senha fica igual para quem roubar o banco.
- **Por que o token fica no localStorage e não num cookie?** O painel (github.io) e a API
  (workers.dev) estão em domínios diferentes, e os navegadores bloqueiam cada vez mais cookie entre
  sites. Cookie `HttpOnly` exigiria servir o painel pelo próprio Worker. O painel já só desenha HTML
  de usuário por `UI.htmlSeguro`, que é a defesa que importa aqui.
- **Por que o servidor não lê o JSON do estado?** Para o formato continuar sendo só de
  `dashboard/store.js` (`normalizar`) e para não gastar o limite de CPU. Ele guarda, versiona e
  devolve.
- **Sem Actions:** `npx wrangler login`, `npx wrangler d1 create delfos`, cole o id em
  `wrangler.toml`, depois `npm run migrar` e `npm run publicar`.

### API

Todas as rotas exigem `Authorization: Bearer <token>`, menos `saude`, `cadastro` e `entrar`.
`chave` é sempre a senha já derivada no navegador (32 bytes em base64url) — nunca a senha.

| Rota | O quê |
|---|---|
| `GET /api/saude` | `{ ok, versao, cadastro: "aberto" \| "convite" }` |
| `POST /api/cadastro` | `{ email, chave, convite?, manter? }` → `{ token, expiraEm, usuario, codigoRecuperacao }` |
| `POST /api/entrar` | `{ email, chave, manter? }` → `{ token, expiraEm, usuario }` |
| `POST /api/recuperar` | `{ email, codigo, chaveNova, manter? }` → `{ token, usuario, codigoRecuperacao }` |
| `POST /api/sair` | encerra esta sessão |
| `GET /api/conta` | `{ usuario, anexos: { usadoBytes, limiteBytes } }` |
| `POST /api/conta/senha` | `{ chaveAtual, chaveNova }` — encerra as outras sessões |
| `POST /api/conta/sair-dos-outros` | encerra as outras sessões |
| `POST /api/conta/excluir` | `{ chave }` — apaga a conta e tudo dela |
| `POST /api/conta/codigo-recuperacao` | `{ chave }` → `{ codigoRecuperacao }` (o anterior deixa de valer) |
| `GET /api/estado[?desde=N]` | `{ revisao, atualizadoEm, dispositivo, estado }`; com `desde` igual à revisão, só `{ inalterado: true }` |
| `PUT /api/estado?base=N[&forcar=1][&motivo=][&dispositivo=]` | corpo = JSON do estado → `{ revisao }` ou **409** |
| `GET /api/versoes` · `GET /api/versoes/:id` · `POST /api/versoes` | cópias do estado |
| `GET /api/arquivos` · `PUT /api/arquivos/:id` · `GET /api/arquivos/:id` | anexos (até 25 MB cada) |
