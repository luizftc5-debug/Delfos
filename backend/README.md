# Back end do Delfos

Servidor opcional que deixa o painel **igual em todos os seus aparelhos**. Sem ele, o Delfos
continua funcionando como sempre: tudo guardado só no navegador em que você cadastrou.

Roda na **Cloudflare** (Workers + banco D1), no plano gratuito, sem máquina para manter ligada.

## O que ele faz

| Função | Como funciona |
|---|---|
| **Sincronização** | Cada mudança que você faz sobe sozinha ~1 segundo depois. Toda página aberta confere se outro aparelho gravou algo antes. |
| **Conflito sem perda** | Se o celular e o notebook mudaram coisas ao mesmo tempo, o painel pergunta qual versão fica. Nenhum aparelho apaga o outro em silêncio. |
| **Versões anteriores** | O servidor guarda cópias automáticas (no máximo uma a cada 10 min de uso) e toda versão que perdeu um conflito. As 60 mais recentes ficam disponíveis para restaurar. |
| **Anexos na nuvem** | PDFs, slides e imagens dos resumos sobem junto. Um aparelho novo baixa cada arquivo na primeira vez que você o abre. |
| **Senha** | Só quem tem a senha lê ou grava. Trocar a senha desconecta todos os aparelhos na hora. Depois de 10 senhas erradas, trava por 15 minutos. |
| **Limpeza diária** | Apaga anexos que nenhuma versão cita mais e versões além das 60. |

## Publicar (uma vez só)

Tudo pelo navegador, sem instalar nada.

### 1. Conta na Cloudflare

1. Crie uma conta gratuita em <https://dash.cloudflare.com/sign-up>.
2. No menu da esquerda, abra **Workers & Pages** uma vez — a Cloudflare pede para escolher um
   subdomínio (ex.: `luiz`). Seu servidor vai ficar em `https://delfos-api.<subdomínio>.workers.dev`.
3. Copie o **Account ID**: aparece na página inicial da conta, na coluna da direita
   (ou em Workers & Pages, lado direito).

### 2. Token de acesso da Cloudflare

1. Vá em <https://dash.cloudflare.com/profile/api-tokens> → **Create Token**.
2. Escolha o modelo **Edit Cloudflare Workers** → **Use template**.
3. Em **Permissions**, clique em **+ Add more** e acrescente: `Account` → `D1` → `Edit`.
4. **Continue to summary** → **Create Token**. Copie o token (ele só aparece uma vez).

### 3. Segredos no GitHub

No repositório, **Settings → Secrets and variables → Actions → New repository secret**. Crie três:

| Nome | Valor |
|---|---|
| `CLOUDFLARE_API_TOKEN` | o token do passo 2 |
| `CLOUDFLARE_ACCOUNT_ID` | o Account ID do passo 1 |
| `SENHA_DELFOS` | a senha que você vai digitar no painel (mínimo 8 caracteres; use uma que não usa em outro lugar) |

### 4. Publicar

Aba **Actions** do repositório → **Back end** → **Run workflow**. Em ~2 minutos fica verde.
Abra o passo **Publicar o Worker**: o endereço do servidor aparece no fim
(`https://delfos-api.....workers.dev`).

Daqui em diante, qualquer mudança em `backend/` no branch principal publica sozinha.

### 5. Conectar os aparelhos

- **Aparelho onde você já usa o Delfos:** clique no seu nome (barra lateral) →
  **Sincronização na nuvem** → cole o endereço, digite a senha → **Conectar**. Os dados dele sobem.
- **Aparelho novo:** no assistente de boas-vindas, toque em **Já uso em outro aparelho** e faça o
  mesmo. Ele baixa tudo e já abre a visão geral.

## Perguntas comuns

**Fico sem internet?** O painel funciona normal. As mudanças ficam guardadas no aparelho e sobem
quando a conexão voltar.

**Troquei a senha.** Mude o segredo `SENHA_DELFOS` no GitHub e rode o workflow de novo. Todos os
aparelhos vão pedir a senha nova; nada se perde.

**Fiz besteira e sincronizou.** Perfil → Sincronização na nuvem → **Versões anteriores** →
**Restaurar**. A versão de agora também vira cópia, então dá para desfazer a restauração.

**Quanto custa?** Nada, no uso de uma pessoa. O plano gratuito aceita 100 mil requisições por
dia e 5 GB de banco.

**O backup em arquivo ainda serve?** Sim — é uma cópia sua, fora de qualquer servidor.
Continue exportando de vez em quando.

## Para quem for mexer no código

```
backend/
  src/index.js       rotas, CORS e tratamento de erro
  src/auth.js        senha, token (HMAC, 90 dias), trava de tentativas
  src/estado.js      estado com revisão, conflito (409) e versões
  src/arquivos.js    anexos em partes de 1 MB
  src/textos.js      texto grande em pedaços de 400 mil caracteres
  src/limpeza.js     rotina diária (cron)
  migrations/        esquema do banco (SQL)
  test/              testes (node --test, com um D1 falso sobre node:sqlite)
```

- **Testes:** `npm test` (Node 22+, sem instalar nada).
- **Rodar local:** `npm install`, copie `.dev.vars.exemplo` para `.dev.vars` e rode `npm run dev`
  (servidor em `http://localhost:8787`). Sirva o painel em `http://localhost:8000` — já está na
  lista de origens permitidas (`ORIGENS` em `wrangler.toml`).
- **Mudou o esquema?** Crie `migrations/0002_....sql`; o workflow aplica sozinho.
- **Por que o servidor não lê o JSON do estado?** Para o formato continuar sendo só de
  `dashboard/store.js` (`normalizar`) e para não gastar o limite de CPU do plano gratuito (10 ms
  por requisição). Ele só guarda, versiona e devolve.
- **Sem Actions:** `npx wrangler login`, `npx wrangler d1 create delfos`, cole o id em
  `wrangler.toml`, depois `npm run migrar`, `npm run publicar` e `npx wrangler secret put SENHA`.

### API

Todas as rotas exigem `Authorization: Bearer <token>`, menos `/api/saude` e `/api/entrar`.

| Rota | O quê |
|---|---|
| `GET /api/saude` | `{ ok, versao, senhaConfigurada }` |
| `POST /api/entrar` | `{ senha }` → `{ token, expiraEm }` |
| `GET /api/sessao` | 200 se o token vale |
| `GET /api/estado[?desde=N]` | `{ revisao, atualizadoEm, dispositivo, estado }`; com `desde` igual à revisão, só `{ inalterado: true }` |
| `PUT /api/estado?base=N[&forcar=1][&motivo=][&dispositivo=]` | corpo = JSON do estado → `{ revisao }` ou **409** se `base` não for a revisão atual |
| `GET /api/versoes` | lista das cópias (sem conteúdo) |
| `GET /api/versoes/:id` | uma cópia, no formato de `GET /api/estado` |
| `POST /api/versoes?motivo=&dispositivo=` | guarda uma cópia sem mexer no estado em vigor |
| `GET /api/arquivos` | anexos guardados |
| `PUT /api/arquivos/:id` | corpo = arquivo cru (até 25 MB) |
| `GET /api/arquivos/:id` | o arquivo |
