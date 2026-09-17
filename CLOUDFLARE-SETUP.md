# Assistência Técnica Jorge Rodrigues — Cloudflare

Bindings esperados no Worker:
- `DB` → D1 database (o banco já ligado ao Worker pode ser reutilizado)
- `MEDIA` → R2 bucket (o bucket já ligado ao Worker pode ser reutilizado)

O projeto declara `DB` e `MEDIA` no build para que o Wrangler não publique uma versão sem bindings.

## Teste rápido após o deploy
Abra:
`https://SEU-WORKER.workers.dev/api/health`

Resultado esperado:
`{"ok":true,"db":true,"media":true,"dbQuery":true,"mediaQuery":true}`

## Admin
URL: `/admin`
Usuário: `jorgemlr`
Senha: `jorge160288`
