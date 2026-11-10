---
name: revisar-seguranca-web
description: Revisar e corrigir riscos de segurança do delivery, incluindo autenticação, autorização, Pix, dados de clientes e administração.
---

Revise a segurança e priorize os riscos. Inspecione autenticação e autorização no servidor, cookies, CSRF, limites de tentativas, validação, consultas SQL, uploads, segredos e isolamento dos pedidos de cada cliente.

Preços, taxas, disponibilidade e valor final devem ser calculados no servidor. Pagamento real só pode ser aprovado após verificação do provedor ou conferência administrativa explícita no modo Pix manual. Nunca trate um clique em “paguei” como confirmação bancária. Preserve a distinção entre demonstração e produção e impeça acesso administrativo demonstrativo em produção.

A IA recebe somente agregados de negócio, sem nomes, e-mails, telefones ou endereços. Não exponha tokens de IA e pagamento no navegador ou nos logs. Use cenários locais e testes de autorização para verificar correções; não execute ações ofensivas em sistemas externos.

Entregue achados por gravidade, evidência, impacto e correção, separando vulnerabilidade reproduzida de melhoria preventiva.
