# Mural de Noticias - Suporte Lojas

Painel interno para publicar e consultar noticias operacionais do time de suporte.

## O que foi profissionalizado

- Publicacao, edicao e exclusao liberadas sem login.
- Campo obrigatorio de nome do responsavel na publicacao.
- Persistencia compartilhada via API em Vercel Blob.
- Armazenamento de anexos em Vercel Blob (URL publica), sem base64 em banco.
- Configuracao de cabecalhos de seguranca no deploy.

## Estrutura principal

- `index.html`: painel completo (publicacao + listagem).
- `leitura.html`: painel somente leitura.
- `app.js`: gerenciamento das noticias.
- `mural-common.js`: utilitarios de persistencia e renderizacao.
- `api/news.js`: API de noticias (GET/POST/PUT/DELETE) em Vercel Blob.
- `vercel.json`: headers de seguranca.

## Deploy no Vercel

1. Suba o projeto para um repositorio Git.
2. Importe no Vercel.
3. Crie e conecte um **Vercel Blob Store** ao projeto.
4. Faça o deploy.

## Observacoes importantes

- As noticias sao armazenadas de forma compartilhada no Vercel Blob em um arquivo JSON.
- Os anexos tambem sao enviados para o Vercel Blob e salvos como URL.
- Se o Blob nao estiver configurado no projeto, a API retornara erro.
