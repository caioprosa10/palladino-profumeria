# Palladino Profumeria

Loja de alta perfumaria italiana: vitrine, busca, carrinho, checkout,
área do cliente, painel administrativo e um consultor virtual de
recomendação.

**No ar:** https://palladino-profumeria.onrender.com

> **Demonstração.** O site está publicado sem as credenciais de
> pagamento, frete, e-mail e IA. O catálogo, a busca, o carrinho, o
> login e o painel funcionam; o checkout vai até a tela de pagamento e
> para ali. Veja [O que funciona sem chaves](#o-que-funciona-sem-chaves).
>
> **O primeiro acesso pode levar até 1 minuto.** O serviço roda no plano
> gratuito do Render, que hiberna após 15 minutos sem tráfego e leva
> cerca de um minuto para acordar. Depois disso as páginas respondem em
> frações de segundo. A cota gratuita é de 750 horas de instância por
> mês e por workspace — um mês tem 744 horas, então manter o serviço
> acordado em tempo integral consumiria a cota inteira e não sobraria
> nada para nenhum outro serviço. Por isso a hibernação fica como está,
> e o aviso aparece também na página inicial.

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, React Server Components) |
| Linguagem | TypeScript |
| Banco | PostgreSQL 18 |
| ORM | Prisma 5 |
| Hospedagem | Render (aplicação) + Neon (banco) |
| Pagamento | Mercado Pago |
| Frete | Melhor Envio |
| IA | Google Gemini |
| Testes | Vitest + Playwright |

A aplicação precisa de um servidor Node: há rotas de API, páginas
renderizadas no servidor e banco. Hospedagem estática não a executa.

## Destaques técnicos

- CSP com nonce por requisição e `strict-dynamic` no painel, sem
  `unsafe-inline`, e uma política mais estrita publicada em paralelo no
  modo Report-Only.
- CPF, tokens de integração e segredos de segundo fator cifrados em
  repouso com AES-256-GCM, com prefixo de versão para permitir rotação.
- Segundo fator por TOTP no login, com códigos de recuperação de uso
  único.
- Sessões gravadas no banco e revogáveis: trocar a senha derruba o que
  estiver aberto, e o logout invalida de fato em vez de só apagar o
  cookie.
- Limite de tentativas por IP e campo-isca contra robôs no cadastro.
- O código do checkout lê preço e estoque do banco, recota o frete no
  servidor e valida a assinatura HMAC do webhook de pagamento antes de
  considerar um pedido pago.
- O código só aceita um upload depois de conferir os bytes do arquivo,
  guarda a imagem no banco e a serve com `sandbox` e `nosniff`.
- Mais de 100 testes automatizados contra PostgreSQL real, com CI a cada
  push: lint, tipos, testes, build, auditoria de dependências e varredura
  de segredos — mais backup cifrado com restauração testada.

## Requisitos

- Node.js 24 ou superior
- npm
- PostgreSQL 18 (local, para desenvolvimento e testes)

## Como rodar

```bash
npm install
createdb palladino_dev && createdb palladino_test
cp .env.example .env     # preencha os valores (veja abaixo)
npx prisma migrate deploy
npx prisma db seed       # cria o usuário administrador
npm run dev
```

A aplicação sobe em http://localhost:3000.

## Variáveis de ambiente

Todas ficam no `.env`, que **nunca** deve ser versionado. Use o
`.env.example` como modelo.

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão do Postgres |
| `JWT_SECRET` | sim | Assina as sessões. Mínimo de 32 caracteres |
| `ENCRYPTION_KEY` | sim | Cifra CPF, tokens e segredos de 2FA em repouso. 32 bytes em base64 |
| `APP_URL` | sim | URL pública. Os links de e-mail não dependem do header `Host`, que o cliente controla |
| `MP_ACCESS_TOKEN` | pagamentos | Token da conta Mercado Pago. Use o de sandbox para avaliar |
| `MP_WEBHOOK_SECRET` | produção | Valida a assinatura dos webhooks |
| `MELHOR_ENVIO_TOKEN` | frete | Cálculo de frete |
| `CEP_ORIGEM` | frete | CEP de origem das remessas |
| `GEMINI_API_KEY` | chatbot | Consultor virtual |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed | Administrador criado pelo seed |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | e-mail | Envio transacional e redefinição de senha |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | CAPTCHA | Cloudflare Turnstile. Lida no build |
| `CSP_REPORT_ONLY` | não | Publica a CSP estrita em paralelo, sem bloquear. Lida no build |
| `TEST_DATABASE_URL` | testes | Sobrepõe o banco da suíte, usado no CI |
| `DISABLE_HTTPS_UPGRADE` | não | Só para testar o build de produção sobre http |

Gere os segredos com:

```bash
openssl rand -base64 48    # JWT_SECRET
openssl rand -base64 32    # ENCRYPTION_KEY
```

A aplicação não assina nem valida sessões sem essa variável — não existe
valor padrão de propósito, para que um segredo publicado no código nunca
possa ser usado para forjar uma sessão de administrador.

## O que funciona sem chaves

A aplicação sobe exigindo apenas `DATABASE_URL`, `JWT_SECRET`,
`ENCRYPTION_KEY` e `APP_URL`. As integrações externas são opcionais, e
sem elas o recurso correspondente fica indisponível em vez de derrubar
o site:

| Recurso | Sem a chave | Variável |
| --- | --- | --- |
| Catálogo, busca, carrinho, login, painel | funcionam | — |
| Pagamento | checkout responde erro legível, não conclui | `MP_ACCESS_TOKEN` |
| Cálculo de frete | frete não é cotado | `MELHOR_ENVIO_TOKEN`, `CEP_ORIGEM` |
| Consultor virtual | chat não responde | `GEMINI_API_KEY` |
| E-mail e redefinição de senha | link não é entregue | `SMTP_*` |
| CAPTCHA | desativado | `TURNSTILE_*` |

Com `MP_ACCESS_TOKEN` de sandbox, o checkout roda em **modo de teste**:
o fluxo é completo e nenhuma cobrança real acontece. É essa a
configuração indicada para avaliar o projeto.

## Deploy

O `render.yaml` na raiz descreve o serviço para o [Render](https://render.com):
aponte o painel para este repositório. Railway funciona igual, com as
mesmas variáveis.

O banco **não** é declarado no blueprint de propósito. O Postgres
gratuito do Render expira trinta dias depois de criado — não hiberna, é
excluído, junto com os dados. Por isso o banco fica no
[Neon](https://neon.com), cujo plano gratuito é permanente, e a URL de
conexão entra como variável do serviço.

A `ENCRYPTION_KEY` é `sync: false` e nunca `generateValue`: uma chave
nova não decifra o que a antiga cifrou, e a falha é silenciosa — build
passa, aplicação sobe, e o erro só aparece ao ler um registro antigo.

Dois pontos que valem atenção:

**Todo o estado fica no Postgres.** O plano gratuito do Render não oferece
disco persistente, e o sistema de arquivos da aplicação é recriado a cada
deploy. Por isso as imagens enviadas pelo painel vão para a tabela
`Arquivo`, não para o disco — o que, de bônus, faz o backup do banco
cobri-las. As imagens do catálogo que vieram versionadas seguem em
`public/` e são servidas estaticamente.

**Variáveis que afetam cabeçalhos valem no build.** O `headers()` do
Next é resolvido durante `next build` e gravado em `routes-manifest.json`,
não lido a cada requisição. Defini-las só na execução não tem efeito.

Depois do primeiro deploy, crie o administrador e defina a senha:

```bash
npm run db:seed        # cria o usuário
npm run senha:admin    # define a senha, sem ecoar na tela
```

O `senha:admin` só precisa de `DATABASE_URL`, então roda da sua máquina
apontando para o banco de produção — não exige acesso ao servidor.

## Notas de segurança

- Preços e estoque são sempre lidos do banco no checkout. O corpo da
  requisição só informa o id do produto e a quantidade.
- O webhook do Mercado Pago valida assinatura HMAC, consulta o pagamento
  na origem e confere o valor antes de marcar um pedido como pago.
- O login é limitado por IP para dificultar força bruta.
- CPF, tokens de integração e segredos de 2FA ficam cifrados em repouso
  com AES-256-GCM. As imagens enviadas pelo painel vão para a tabela
  `Arquivo`, servidas por uma rota que impõe `sandbox` e `nosniff`.
- O `/admin` recebe CSP com nonce por requisição, sem `unsafe-inline`.
- Os backups são cifrados com a mesma chave e a restauração é testada:
  `npm run backup` e `npm run restaurar`.
- Nenhuma credencial deve ser escrita no código. Este repositório é
  público.

## Testes

```bash
npm test
```

A suíte roda contra um Postgres próprio (`palladino_test`), o mesmo motor
da produção — testar em banco diferente é como divergências de dialeto
passam no teste e quebram no ar.

## Estrutura

```
src/app          rotas (App Router) e endpoints de API
src/components   componentes de interface
src/lib          autenticação, Prisma, Mercado Pago, chatbot
src/services     frete, e-mail, pagamento, auditoria, segurança
src/proxy.ts     proteção de rotas (Proxy do Next 16)
prisma/          schema, migrações e seeds
```
