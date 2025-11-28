# CONTEXTO: SISTEMA DE INVENTÁRIO (PRODUÇÃO)
Data: 27/11/2025
Fase: Infraestrutura e Migração

## ESCOPO
- Gestão de Marcos, Propriedades e Clientes.
- Importação de Memoriais (ETL via Unstructured).
- Visualização em Mapa.
- **EXCLUÍDO:** Análise de Sobreposição, CAR, SIGEF.

## INFRAESTRUTURA (DOCKER)
- DB: PostGIS (Porta 5436) - Schema Limpo
- APP: Node.js (Porta 3002)
- ETL: Unstructured API (Porta 8001)