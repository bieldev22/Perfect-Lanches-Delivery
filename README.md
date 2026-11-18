## Perfect Lanches Delivery

Sistema de delivery para uma lanchonete, com cardápio digital, carrinho, checkout e painel para acompanhar pedidos. A demonstração local usa dados fictícios e permite simular a aprovação de um pagamento via Pix.

Desenvolvido com React, TypeScript, Node.js e SQLite. O servidor calcula o total a partir dos preços cadastrados e registra o pedido para acompanhamento no painel.

## Iniciar

Requisitos: **Node.js 24** e **pnpm 12**.

```powershell
cd E:\Projetos\Perfect_Lanches
pnpm install --frozen-lockfile
pnpm dev
```

- Delivery: **http://127.0.0.1:4174/**
- Cliente e histórico: **http://127.0.0.1:4174/conta**
- Administração: **http://127.0.0.1:4174/admin**

No painel, **Explorar demonstração local** abre a administração com pedidos e clientes fictícios. Esse acesso funciona somente no computador local e é desabilitado em produção. O Pix de demonstração não é uma cobrança bancária. Para testar o fluxo completo, finalize um pedido com dados fictícios e clique em **Simular pagamento aprovado**.

Sem arquivo de ambiente, o projeto inicia em demonstração local. Para personalizar a configuração:

```powershell
Copy-Item .env.example .env
```

Edite o arquivo e reinicie o processo. Não compartilhe nem versione credenciais.

## O que está implementado

- Cardápio de 15 produtos: 6 hambúrgueres, 3 batatas, 3 refrigerantes e 3 doces.
- Filtros por categoria, busca por produto e ingrediente, detalhes, observações e alergênicos.
- Carrinho persistente neste navegador, entrega por bairro e retirada, pedido mínimo e checkout.
- QR Code e código copia e cola gerados no servidor, com valor calculado a partir dos preços cadastrados.
- Cadastro, login, endereço salvo, histórico, acompanhamento e repetição do pedido com preços atuais. Também é possível comprar sem cadastro.
- Gestão de pedidos e avanço de preparo; preços, descrição, ingredientes, foto, vídeo, categoria e disponibilidade editáveis.
- Upload de imagem com validação e conversão para WebP; upload de MP4 com limite de tamanho.
- Gráficos de receita, dias da semana, produtos e bairros; clientes com histórico de compras.
- Análises estatísticas locais e integração opcional com a Responses API da OpenAI, usando somente agregados.
- Configuração dos bairros, taxas, prazo, pedido mínimo, horário informativo, endereço de retirada e abertura manual da loja.
- Interface adaptada a desktop e celular, navegação por teclado, diálogo nativo com retenção de foco e respeito a movimento reduzido.

As prévias em MP4 são animações de aproximação feitas a partir de fotografias ilustrativas. O vídeo só é carregado após interação; o administrador pode substituir a prévia por um vídeo real do produto. Veja [Mídia e referências](docs/MIDIA.md).

## Pix real

Configure os valores do servidor no arquivo de ambiente. Existem dois modos reais:

| Modo | Configuração | Confirmação |
| --- | --- | --- |
| `mercadopago` | `MERCADOPAGO_ACCESS_TOKEN`, `PUBLIC_URL` HTTPS e opcionalmente `MERCADOPAGO_WEBHOOK_SECRET` | Consulta ao provedor enquanto o cliente acompanha o pedido; webhook assinado quando configurado. Valor, moeda, meio e referência são conferidos no servidor. |
| `manual` | `PIX_KEY`, nome do recebedor e cidade | QR estático BR Code com CRC16. O administrador precisa conferir o crédito no banco e confirmar o pagamento no painel. Não há vencimento bancário nem conciliação automática nesse modo. |

Em produção, use `DELIVERY_DEMO=false`, `NODE_ENV=production`, `PUBLIC_URL=https://seu-dominio`, `ADMIN_EMAIL` e uma `ADMIN_PASSWORD` exclusiva de pelo menos 12 caracteres. Nunca use `NEXT_PUBLIC_*` ou `VITE_*` para chaves privadas. A conta administrativa é criada na primeira inicialização da base: alterar a variável depois não troca a senha de uma conta já existente.

As credenciais da empresa não foram fornecidas e **nenhuma cobrança real foi feita nos testes**. O fluxo deve ser homologado com a conta do recebedor antes de aceitar vendas reais. Integração baseada na [documentação Pix do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/integrate-pix) e no [manual BR Code do Banco Central](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf).

## IA

Defina `OPENAI_API_KEY` e, se necessário, `OPENAI_MODEL` no servidor. Sem chave, continuam disponíveis os gráficos e análises estatísticas identificadas como **análise local**. A [Responses API](https://developers.openai.com/api/docs/guides/text?api-mode=responses) recebe somente agregados de vendas, com `store: false`, limite de saída, controle de frequência e cache de cinco minutos. Nunca enviamos nomes, contatos, CPF ou endereços completos dos clientes no conjunto de dados.

As sugestões não fazem alterações automáticas nos produtos e não representam garantia de resultado comercial. Os números do modo de demonstração são fictícios.

## Dados e operação

O servidor usa SQLite com WAL, consultas parametrizadas, índices e sessões persistentes. Os arquivos ficam no diretório ignorado `.delivery/`, com bases separadas em `demo/` e `live/`. Fotografias e vídeos enviados pelo painel ficam no subdiretório `media/` da respectiva base.

Pedidos não são guardados apenas em `localStorage`: somente a sacola fica no navegador. Senhas usam scrypt com salt; sessões usam cookies HttpOnly/SameSite e identificadores aleatórios armazenados como hash. Gravações exigem a origem configurada e um token CSRF. Cada cliente só pode consultar seus próprios pedidos; funções administrativas exigem autorização no servidor.

Antes de operar: valide cardápio, ingredientes e alergênicos com a cozinha; substitua as fotos ilustrativas; confirme horário, endereço e regiões; configure o recebedor do Pix e um canal de privacidade da empresa. A abertura/fechamento é manual; os horários publicados são informativos.

Para hospedar, este projeto precisa de **um processo Node.js e disco persistente**. O diretório `dist/` sozinho não contém a API nem o banco. Use HTTPS em um proxy reverso e mantenha o processo disponível. O cadastro de uma conta, por si só, não verifica a titularidade do e-mail: verificação e recuperação por e-mail dependem de um serviço de envio, ainda não configurado.

Faça backup do banco e da mídia. Para uma cópia consistente com o servidor ativo, use a API de backup do SQLite; copiar apenas o arquivo principal pode ignorar escritas no WAL. Para uma loja pequena, um processo com SQLite é uma base simples. Antes de múltiplas réplicas ou grande volume, migre os dados compartilhados para um banco gerenciado, a mídia para armazenamento de objetos e o processamento de integrações para uma fila. Não execute réplicas com bancos locais independentes.

## Verificação

```powershell
pnpm check
pnpm build
pnpm test:e2e
pnpm start
```

Os testes de API usam banco em memória. Os testes de navegador compilam a interface e iniciam um servidor independente na porta 4188, com uma base fictícia nova a cada execução em `.delivery/e2e/`, sem IA externa e sem cobranças reais. O navegador padrão de teste é o Microsoft Edge instalado; defina `PLAYWRIGHT_CHANNEL=chrome` para Chrome ou instale o Chromium do Playwright e ajuste essa opção se estiver em outro sistema.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| [src/](src/) | Interface React/TypeScript, cardápio, compra, conta e painel |
| [server/](server/) | HTTP, API, validação, banco, autenticação, Pix e análises |
| [server/menu.json](server/menu.json) | Produtos iniciais, importados apenas quando não existem na base |
| [public/media/](public/media/) | Logomarca, fotos, fontes locais e minivídeos |
| [tests/](tests/) | Verificações de API, autorização, preços, Pix e relatórios |
| [e2e/](e2e/) | Fluxos completos no navegador |
| [.agents/skills/](.agents/skills/) | As cinco skills de contexto solicitadas |

Os comandos solicitados estão preservados em [.agents/skills/COMANDOS.md](.agents/skills/COMANDOS.md).
