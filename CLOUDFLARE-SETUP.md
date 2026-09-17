# Cloudflare — configuração de produção

O projeto usa:
- D1 `resolve-tech-db` como binding `DB`
- R2 `resolve-tech-media` como binding `MEDIA`

No Workers Builds, configure:

```text
Build command: pnpm build
Deploy command: pnpm deploy:cloudflare
```

O script `scripts/deploy-cloudflare.mjs` lê o binding D1 que já está ligado ao Worker `resolve-tech-site`, injeta o UUID correto no arquivo de deploy gerado e fixa o R2 antes de executar `wrangler deploy`.

Se a descoberta automática não puder ler a versão atual do Worker, o script também tenta `wrangler d1 info`. Como último fallback, aceita a variável `CLOUDFLARE_D1_DATABASE_ID`.

Depois do deploy:
- `/api/health` testa leitura dos bindings.
- Após login no `/admin`, `/api/health?deep=1` testa gravação/leitura/exclusão reais no D1 e R2.
