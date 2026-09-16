# Resolve Tech — site e painel de recibos

Site responsivo de assistência técnica com landing page, acesso do técnico, criação, histórico, edição, impressão e exportação de recibos em PDF pelo navegador.

## Rodar localmente

Requisitos: Node.js 22 ou superior e pnpm.

```bash
pnpm install
pnpm dev
```

Abra o endereço mostrado no terminal. Para testar o painel, use:

- usuário: `admin`
- senha: `1234`

Os dados da empresa e recibos ficam salvos no navegador durante a demonstração.

## Publicar pelo GitHub na Cloudflare

1. Crie um repositório no GitHub e envie estes arquivos para a branch `main`.
2. Na Cloudflare, crie um API Token com permissão para publicar Workers.
3. No GitHub, abra `Settings > Secrets and variables > Actions` e crie `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`.
4. A automação em `.github/workflows/deploy-cloudflare.yml` publica a cada envio para `main`.

## Antes de colocar em produção

O login atual é propositalmente um modo de demonstração local. Antes do uso real, conecte autenticação do servidor e Cloudflare D1 para proteger o painel e manter os recibos sincronizados entre aparelhos.
