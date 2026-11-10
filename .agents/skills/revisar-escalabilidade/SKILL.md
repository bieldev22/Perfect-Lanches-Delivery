---
name: revisar-escalabilidade
description: Avaliar gargalos e custos do delivery, banco SQLite, mídia de produtos, pagamentos e análise de pedidos por IA.
---

Avalie os gargalos e os custos de crescimento. Baseie conclusões no código e, quando disponíveis, em medições de tráfego, consultas, volume de pedidos e consumo de APIs. Declare hipóteses e não invente métricas.

O site institucional é estático; o delivery usa um processo Node.js com SQLite em volume persistente. Avalie concorrência de escrita, índices, retenção, backup, sessões, consultas agregadas, limites das requisições e entrega de mídia. Não proponha múltiplas réplicas com arquivos SQLite independentes.

Considere execução preguiçosa de vídeos, imagens locais otimizadas, idempotência de cobranças, frequência de consultas ao provedor, limite e cache de IA. Priorize mudanças por evidência, impacto, esforço e custo. Pesquise preços oficiais atuais somente quando necessários e explicite suas fontes.
