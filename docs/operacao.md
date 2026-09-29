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
   npx tsx scripts/migrar-criptografia.ts --dry-run
   ```

3. Aplique:

   ```bash
   npx tsx scripts/migrar-criptografia.ts
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
npx tsx scripts/backup.ts
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
npx tsx scripts/restaurar.ts /data/backups/backup-<data>.db.enc --destino /tmp/teste.db
```

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
npx tsx scripts/redefinir-senha-admin.ts
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
