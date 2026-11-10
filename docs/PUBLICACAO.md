# Publicação do delivery

O código desta pasta é um delivery independente em React, TypeScript e Vite,
com API HTTP em Node.js 24, SQLite e mídia no disco. Ele é diferente do projeto
Python/FastAPI/Flask encontrado em outra pasta e de suas integrações com Sheets.
Não existe chatbot ManyChat neste delivery.

Repositório de divulgação:
<https://github.com/bieldev22/Perfect-Lanches-Delivery>.

## Compatibilidade com Vercel

O build da interface não contém o backend. Pedidos, sessões e configurações são
persistidos pelo módulo `server/database.mjs` em um arquivo SQLite; uploads são
gravados em disco por `server/index.mjs`.

A [documentação oficial da Vercel](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel),
consultada em 10/11/2026, informa que funções serverless não disponibilizam o
armazenamento local persistente e compartilhado exigido por esse uso do SQLite.
Publicar apenas `dist/` não hospeda pedidos, login, Pix ou administração.

## Decisão necessária

Há duas opções, sem substituir silenciosamente a arquitetura:

1. Manter Node.js e SQLite em um serviço que ofereça processo contínuo e volume
   persistente, HTTPS e backup. Exige escolher a hospedagem e confirmar seu custo.
2. Manter a Vercel e adaptar a persistência para banco gerenciado, uploads para
   armazenamento de objetos e a entrada HTTP para funções. Exige alterar e
   validar os contratos de banco e de mídia, cookies, origem, Pix e webhooks.

Nenhuma migração de dados, contratação ou troca de provedor foi realizada.
As variáveis necessárias estão em `.env.example`, sem valores privados.

## Demonstração segura

O modo de demonstração atual foi projetado somente para loopback e recusa
produção. Ele usa clientes e pedidos fictícios e não realiza cobranças reais.
Não remova essas proteções apenas para obter uma URL pública. Uma demonstração
pública exige isolamento, controle de abuso e uma configuração própria; usar
`PIX_PROVIDER=demo` em produção não é suportado pelo código atual.

Uma publicação real deve usar `DELIVERY_DEMO=false`, HTTPS, credenciais próprias,
persistência e os parâmetros de Pix descritos no README. Testes deste projeto
devem continuar isolados e não disparar pedidos, mensagens ou cobranças reais.
