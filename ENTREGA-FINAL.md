# Assistência Técnica Jorge Rodrigues — entrega final

## URLs
- Site: `https://resolve-tech-site.vagasdocaio.workers.dev`
- Admin: `https://resolve-tech-site.vagasdocaio.workers.dev/admin`
- Saúde técnica: `https://resolve-tech-site.vagasdocaio.workers.dev/api/health`

## Acesso administrativo
- Usuário: `jorgemlr`
- Senha: `jorge160288`

A senha não fica mais escrita no JavaScript do navegador. O servidor valida um hash PBKDF2 e cria uma sessão HttpOnly armazenada no D1.

## Cloudflare
Recursos existentes usados pelo projeto:
- D1: `resolve-tech-db`, binding `DB`
- R2: `resolve-tech-media`, binding `MEDIA`

### Configuração do Workers Build
Use exatamente:
- Build command: `pnpm build`
- Deploy command: `pnpm deploy:cloudflare`

O deploy final descobre o UUID do D1 a partir do binding já existente no Worker e grava no `dist/server/wrangler.json` antes de publicar. Assim o Wrangler não apaga o binding no próximo deploy. O R2 é fixado como `MEDIA -> resolve-tech-media`.

## Teste depois do deploy
1. Abra `/api/health`. Deve retornar `ok: true`, `db: true`, `media: true`.
2. Entre em `/admin`.
3. Com a sessão aberta, abra `/api/health?deep=1`. Deve retornar `deep: true`, `dbWrite: true`, `mediaWrite: true`.
4. Em Dados da empresa, altere um campo e salve. Atualize a página e confirme que permaneceu.
5. Crie um recibo, salve, atualize a página e confirme que ele continua no Histórico.
6. Teste a assinatura e um vídeo do portfólio.

## O que foi corrigido
- Dados da empresa persistidos no D1.
- Recibos persistidos no D1.
- Avaliações persistidas no D1; fotos vão para R2.
- Orçamentos/solicitações persistidos no D1.
- Portfólio persistido no D1; uploads de vídeo vão para R2.
- Assinatura PNG persistente e reposicionável, com assinatura padrão já incluída.
- Marca d'água `Assistência Técnica Jorge Rodrigues` no recibo/PDF.
- `/admin` abre o acesso administrativo.
- Login passou a ser validado no servidor e ações administrativas exigem sessão válida.
- API pública não devolve mais o histórico de recibos.
- Deploy passou a fixar os bindings D1/R2 antes de publicar.
- O projeto não depende mais da pasta oculta `.openai` para compilar.
