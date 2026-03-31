# Mural de Noticias - Suporte Lojas

Painel interno para publicar e consultar noticias operacionais do time de suporte.

## O que foi profissionalizado

- Publicacao, edicao e exclusao liberadas sem login.
- Campo obrigatorio de nome do responsavel na publicacao.
- Configuracao de cabecalhos de seguranca no deploy.

## Estrutura principal

- `index.html`: painel completo (publicacao + listagem).
- `leitura.html`: painel somente leitura.
- `app.js`: gerenciamento das noticias.
- `mural-common.js`: utilitarios de persistencia e renderizacao.
- `vercel.json`: headers de seguranca.

## Deploy no Vercel

1. Suba o projeto para um repositorio Git.
2. Importe no Vercel.
3. Faça o deploy.

## Observacoes importantes

- As noticias continuam salvas no `localStorage` do navegador, por 7 dias.
- Para mural compartilhado entre varias maquinas, o proximo passo e mover as noticias para backend/banco.
