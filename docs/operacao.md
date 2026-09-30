# Operação

Procedimentos de manutenção do Palladino Profumeria em produção (Render).

---

## Migração de criptografia

Cifra campos sensíveis que ainda estejam em texto puro: `User.cpf`,
`User.totpSecret`, `User.totpBackup`, `ConfiguracaoFrete.token`,
`ConfiguracaoFrete.clientSecret` e `TokenIntegracao.token`.

`cripto.ts` é retrocompatível — `decifrar` devolve valores sem o prefixo
`enc:v1:` como estão —, então a aplicação funciona antes e depois da
migração. Rodar o script fecha a janela em que um vazamento do arquivo
SQLite entregaria esses dados legíveis.

### Como rodar no Render

1. Abra o **Shell** do serviço no painel do Render.
2. Simule primeiro, para ver quanto seria alterado:

   ```bash
   npm run migrar:cripto -- --dry-run
   ```

3. Aplique:

   ```bash
   npm run migrar:cripto
   ```

O script faz um backup do banco com `VACUUM INTO` antes de qualquer
alteração, em `/data/backups/antes-da-migracao-<data>.db`. Processa em
lotes de 100 dentro de transação e, após gravar, relê cada registro para
confirmar que decifra para o valor original. A saída traz apenas
contagens — nunca os valores.

É idempotente: rodar de novo não cifra nada já cifrado.

### Se aparecerem falhas

A saída lista `tabela.coluna id=...` dos registros que não verificaram, sem
os valores. Nesse caso o backup em `/data/backups/` é o ponto de retorno —
ver *Restauração* abaixo.

> **Atenção:** trocar `ENCRYPTION_KEY` depois da migração torna os dados
> cifrados ilegíveis. A chave precisa ser preservada junto dos backups (em
> local separado deles).

---

## Backup e restauração

### Backup manual

```bash
npm run backup
```

Gera uma cópia consistente com `VACUUM INTO` — nunca uma cópia bruta do
arquivo, que poderia capturar um estado parcial enquanto a aplicação
escreve — e a cifra com `ENCRYPTION_KEY`.

Variáveis:

| Variável | Padrão | Para quê |
| --- | --- | --- |
| `BACKUP_DIR` | `/data/backups` | Onde gravar |
| `BACKUP_RETENCAO_DIAS` | `14` | Backups mais antigos são apagados |

### Restauração

```bash
npm run restaurar -- /data/backups/backup-<data>.db.enc --destino /tmp/teste.db
```

A restauração confere `PRAGMA integrity_check` e conta tabelas, produtos e
usuários, para você ver que o conteúdo voltou — não apenas que o arquivo
abriu.

Sem `--destino`, restaura sobre o banco atual e pede confirmação.
**Pare a aplicação antes de restaurar sobre o banco em uso.**

### Guardar fora do Render

O disco do Render é a mesma falha única do banco. Envie os backups para
outro lugar — S3, Backblaze, Google Drive — e **teste a restauração**, não
só a geração. Backup nunca testado não é backup.

---

## E-mail (SMTP)

Sem `SMTP_*` configurado, a aplicação sobe normalmente e registra um aviso
no log; os e-mails transacionais e o link de redefinição de senha não são
entregues.

Depois de configurar, use **Segurança → Enviar e-mail de teste** no painel
administrativo para confirmar.

### O que configurar no provedor

Para os e-mails não caírem em spam, três registros DNS no domínio:

**SPF** — autoriza o provedor a enviar em nome do domínio. Um único
registro `TXT` na raiz:

```
v=spf1 include:<provedor> ~all
```

**DKIM** — assina os e-mails. O provedor fornece o seletor e a chave
pública; entra como `TXT` em `<seletor>._domainkey.palladinoprofumeria.com.br`.

**DMARC** — diz o que fazer quando SPF ou DKIM falham. Comece observando,
em `_dmarc.palladinoprofumeria.com.br`:

```
v=DMARC1; p=none; rua=mailto:dmarc@palladinoprofumeria.com.br
```

Depois de algumas semanas sem falso positivo nos relatórios, endureça para
`p=quarantine` e então `p=reject`.

---

## Senha do administrador

```bash
npm run senha:admin
```

Pede a senha com entrada oculta, exige a mesma força do cadastro público e
revoga todas as sessões da conta.

---

## Variáveis obrigatórias

`JWT_SECRET`, `ENCRYPTION_KEY` e `APP_URL` são verificadas no boot: em
produção, a aplicação não sobe sem elas.

As que afetam cabeçalhos HTTP — `DISABLE_HTTPS_UPGRADE`,
`TURNSTILE_SITE_KEY` — são lidas por `next.config.ts`, que o Next resolve
**durante o build** e grava em `routes-manifest.json`. Definir só em tempo
de execução não tem efeito: precisam existir no build.

---

## Testes e integração contínua

```bash
npm test          # suíte completa
npm run test:watch
```

O banco de testes é um arquivo próprio em `tests/.tmp/`, criado e
descartado pela suíte. Nunca toca o banco de desenvolvimento nem o de
produção.

`.github/workflows/ci.yml` roda a cada push na main, em pull request e
semanalmente: lint, verificação de tipos, testes, build,
`npm audit --audit-level=high` e varredura de segredos com gitleaks.

A auditoria falha em vulnerabilidade **alta ou crítica**. Moderadas e
baixas aparecem no log sem interromper — costumam estar em dependência de
desenvolvimento, e travar a entrega por elas faz o time ignorar o CI.

### Sobre os avisos de lint

O lint passa sem erros, mas emite cerca de 86 avisos herdados: usos de
`any` e variáveis não usadas de antes de haver lint no CI. Ficaram como
aviso de propósito — visíveis, sem reprovar toda execução. Para reduzir:
`npx eslint --fix`, depois arquivo por arquivo com os testes rodando.

Três pontos têm `eslint-disable` com a justificativa escrita ao lado:
busca de dados em `useEffect` no painel, que só sai com refatoração para
Server Component, e o padrão "montado" do checkout, necessário porque o
carrinho vem do `localStorage`.
