# Resolve Tech — Cloudflare D1 + R2

Este pacote usa os bindings já criados no Worker `resolve-tech-site`:

- D1: variável `DB` → banco `resolve-tech-db`
- R2: variável `MEDIA` → bucket `resolve-tech-media`

As tabelas do D1 são criadas automaticamente na primeira chamada da API.

## Dados salvos no D1
- dados da empresa
- recibos
- avaliações
- configuração de visibilidade do portfólio
- cadastro dos vídeos
- solicitações de orçamento/visita

## Arquivos salvos no R2
- fotos das avaliações
- vídeos enviados pelo painel

## Deploy
Use o mesmo fluxo do projeto atual:

Build command:
`pnpm build`

Deploy command:
`pnpm exec wrangler deploy --config dist/server/wrangler.json`

Depois de um novo deploy, confira em Workers & Pages > resolve-tech-site > Bindings se continuam presentes `DB` e `MEDIA`. Se algum binding não aparecer, conecte novamente o recurso e clique em Deploy.
