# Palladino Profumeria

Loja de alta perfumaria italiana construída com Next.js 16, Prisma e
Mercado Pago. Inclui vitrine, busca, carrinho, checkout, área do cliente,
painel administrativo e um consultor virtual de recomendação.

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
| `MP_ACCESS_TOKEN` | pagamentos | Token da conta Mercado Pago |
| `MP_WEBHOOK_SECRET` | produção | Valida a assinatura dos webhooks |
| `MELHOR_ENVIO_TOKEN` | frete | Cálculo de frete |
| `CEP_ORIGEM` | frete | CEP de origem das remessas |
| `GEMINI_API_KEY` | chatbot | Consultor virtual |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed | Administrador criado pelo seed |
| `DISABLE_HTTPS_UPGRADE` | não | Só para testar o build de produção sobre http |

Gere o `JWT_SECRET` com:

```bash
openssl rand -base64 48
```

A aplicação não assina nem valida sessões sem essa variável — não existe
valor padrão de propósito, para que um segredo publicado no código nunca
possa ser usado para forjar uma sessão de administrador.

## Deploy

O projeto precisa de um servidor Node: são rotas de API, páginas
renderizadas no servidor e um banco. Hospedagem estática — GitHub Pages,
por exemplo — não consegue executá-lo.

O `render.yaml` na raiz descreve o serviço para o [Render](https://render.com):
basta apontar o painel para este repositório. Railway funciona igual, com as
mesmas variáveis.

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

Depois do primeiro deploy, crie o administrador:

```bash
npm run db:seed
```

## Notas de segurança

- Preços e estoque são sempre lidos do banco no checkout. O corpo da
  requisição só informa o id do produto e a quantidade.
- O webhook do Mercado Pago valida assinatura HMAC, consulta o pagamento
  na origem e confere o valor antes de marcar um pedido como pago.
- O login é limitado por IP para dificultar força bruta.
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
