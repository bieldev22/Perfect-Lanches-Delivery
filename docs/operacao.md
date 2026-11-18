# Operação do Perfect Lanches Delivery

## Hospedagem
 Para hospedar, este projeto precisa de um processo Node.js e disco persistente. O diretório dist/ sozinho não contém a API nem o banco. Use HTTPS em um proxy reverso e mantenha o processo disponível. O cadastro de uma conta, por si só, não verifica a titularidade do e-mail: verificação e recuperação por e-mail dependem de um serviço de envio, ainda não configurado.

## Backup
 Faça backup do banco e da mídia. Para uma cópia consistente com o servidor ativo, use a API de backup do SQLite; copiar apenas o arquivo principal pode ignorar escritas no WAL. Para uma loja pequena, um processo com SQLite é uma base simples. Antes de múltiplas réplicas ou grande volume, migre os dados compartilhados para um banco gerenciado, a mídia para armazenamento de objetos e o processamento de integrações para uma fila. Não execute réplicas com bancos locais independentes.

## Pix real
 Configure os valores do servidor no arquivo de ambiente. Existem dois modos reais:

Modo	Configuração	Confirmação
mercadopago	MERCADOPAGO_ACCESS_TOKEN, PUBLIC_URL HTTPS e opcionalmente MERCADOPAGO_WEBHOOK_SECRET	Consulta ao provedor enquanto o cliente acompanha o pedido; webhook assinado quando configurado. Valor, moeda, meio e referência são conferidos no servidor.
manual	PIX_KEY, nome do recebedor e cidade	QR estático BR Code com CRC16. O administrador precisa conferir o crédito no banco e confirmar o pagamento no painel. Não há vencimento bancário nem conciliação automática nesse modo.
Em produção, use DELIVERY_DEMO=false, NODE_ENV=production, PUBLIC_URL=https://seu-dominio, ADMIN_EMAIL e uma ADMIN_PASSWORD exclusiva de pelo menos 12 caracteres. Nunca use NEXT_PUBLIC_* ou VITE_* para chaves privadas. A conta administrativa é criada na primeira inicialização da base: alterar a variável depois não troca a senha de uma conta já existente.

As credenciais da empresa não foram fornecidas e nenhuma cobrança real foi feita nos testes. O fluxo deve ser homologado com a conta do recebedor antes de aceitar vendas reais. Integração baseada na documentação Pix do Mercado Pago e no manual BR Code do Banco Central.