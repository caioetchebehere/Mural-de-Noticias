# Mural de Noticias - Suporte Lojas

Painel interno para publicar e consultar noticias operacionais do time de suporte.

## O que foi profissionalizado

- Login para liberar publicacao, edicao e exclusao de noticias.
- Endpoints serverless para autenticacao em ambiente Vercel.
- Sessao via cookie `HttpOnly` e validacao de expiracao.
- Interface com feedback de sessao e bloqueio de formulario sem login.
- Configuracao de cabecalhos de seguranca no deploy.

## Credenciais atuais

- Usuario: `admin`
- Senha: `essilor@lux`

## Estrutura principal

- `index.html`: painel completo (login + publicacao + listagem).
- `leitura.html`: painel somente leitura.
- `app.js`: fluxo de login/sessao e gerenciamento das noticias.
- `mural-common.js`: utilitarios de persistencia e renderizacao.
- `api/login.js`: login.
- `api/session.js`: validacao de sessao.
- `api/logout.js`: encerramento de sessao.
- `api/_auth.js`: regras de autenticacao e cookie assinado.
- `vercel.json`: headers de seguranca.

## Deploy no Vercel

1. Suba o projeto para um repositorio Git.
2. Importe no Vercel.
3. Configure as variaveis de ambiente do projeto:
   - `MURAL_ADMIN_USER` (ex.: `admin`)
   - `MURAL_ADMIN_PASSWORD` (ex.: `essilor@lux`)
   - `MURAL_AUTH_SECRET` (valor longo e aleatorio para assinatura do cookie)
4. Faça o deploy.

## Observacoes importantes

- As noticias continuam salvas no `localStorage` do navegador, por 7 dias.
- O login protege o acesso ao formulario, mas nao sincroniza noticias entre computadores.
- Para mural compartilhado entre varias maquinas, o proximo passo e mover as noticias para backend/banco.
