# Palladino Profumeria

Loja de alta perfumaria italiana construída com Next.js 16, Prisma e
Mercado Pago. Inclui vitrine, busca, carrinho, checkout, área do cliente,
painel administrativo e um consultor virtual de recomendação.

## Requisitos

- Node.js 20 ou superior
- npm

## Como rodar

```bash
npm install
cp .env.example .env     # preencha os valores (veja abaixo)
npx prisma migrate dev   # cria o banco local
npx prisma db seed       # cria o usuário administrador
npm run dev
```

A aplicação sobe em http://localhost:3000.

## Variáveis de ambiente

Todas ficam no `.env`, que **nunca** deve ser versionado. Use o
`.env.example` como modelo.

| Variável | Obrigatória | Para quê |
| --- | --- | --- |
| `DATABASE_URL` | sim | Conexão do Prisma |
| `JWT_SECRET` | sim | Assina as sessões. Mínimo de 32 caracteres |
| `MP_ACCESS_TOKEN` | pagamentos | Token da conta Mercado Pago |
| `MP_WEBHOOK_SECRET` | produção | Valida a assinatura dos webhooks |
| `MELHOR_ENVIO_TOKEN` | frete | Cálculo de frete |
| `CEP_ORIGEM` | frete | CEP de origem das remessas |
| `GEMINI_API_KEY` | chatbot | Consultor virtual |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed | Administrador criado pelo seed |
| `UPLOADS_DIR` | produção | Pasta das imagens enviadas pelo painel |
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

**Volume persistente.** O disco da aplicação é recriado a cada deploy. O
banco (`DATABASE_URL=file:/data/prod.db`) e as imagens do painel
(`UPLOADS_DIR=/data/uploads`) precisam ficar num volume montado, senão
cada deploy apaga pedidos, contas e fotos de produto.

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

## Estrutura

```
src/app          rotas (App Router) e endpoints de API
src/components   componentes de interface
src/lib          autenticação, Prisma, Mercado Pago, chatbot
src/services     frete, e-mail, pagamento, auditoria, segurança
src/proxy.ts     proteção de rotas (Proxy do Next 16)
prisma/          schema, migrações e seeds
```
