# CONTEXTO DO SISTEMA: INVENTÁRIO DE MARCOS GEODÉSICOS
Data: 27/11/2025
Supervisor: Prof. Petrovich
Fase: Polimento Final para Produção (T-14 dias)

## 1. IDENTIDADE DO SISTEMA
Este é um sistema de **Gestão e Inventário de Ativos Geodésicos**.
Sua única função é catalogar, visualizar e gerenciar marcos, propriedades e clientes.
**NÃO EXISTEM** ferramentas de análise fundiária, CAR ou detecção de sobreposição neste repositório.

## 2. ARQUITETURA ATIVA
- **Backend:** Node.js (Express) + PostgreSQL (PostGIS).
- **Frontend:** HTML5/CSS3 (Design System Premium) + Leaflet (Mapas) + Supercluster.
- **Coordenadas:**
  - Banco de Dados: EPSG:31982 (SIRGAS 2000 UTM 22S).
  - Frontend/Mapa: EPSG:4326 (WGS84 Lat/Long).

## 3. MÓDULOS CRÍTICOS (ESCOPO DE PRODUÇÃO)
1.  **Mapa Interativo:** Visualização de pinos (marcos) e polígonos (propriedades) com clustering.
2.  **CRUD de Marcos:** Cadastro manual, edição e exclusão de marcos.
3.  **Gestão de Entidades:** Cadastro de Clientes e Propriedades.
4.  **Importação de Dados:**
    - Processamento de planilhas (.csv, .xls) para lote de marcos.
    - Processamento de memoriais (.docx) APENAS para extração de coordenadas (sem análise).
    - Upload de arquivos geo (.kml, .shp) para cadastro de geometrias.

## 4. REGRAS DE OURO (PETROVICH)
- Se o usuário pedir "análise", responda que esta função não existe nesta versão.
- Foque em **Performance** (carregamento de milhares de marcos no mapa).
- Foque em **Robustez** (o importador de arquivos não pode falhar).