# Estado Atual do Projeto - Sis_Marcos_Inventario

**Última Atualização:** 2025-12-10 13:30

## Status Geral: FUNCIONAL ✅

---

## Componentes Principais

### Backend (Node.js)
- **Container**: `app_inventario_prod` (porta 3002)
- **Endpoints Funcionais**:
  - `/api/marcos` - CRUD com paginação (tabela: `marcos_levantados`)
  - `/api/propriedades` - CRUD + exportação DXF inteligente
  - `/api/clientes` - CRUD básico
  - `/api/dashboard/overview` - **NOVO** - KPIs e gráficos agregados
  - `/api/upload-geo` - Importação DXF/GeoJSON/Shapefile
  - `/api/memorial/upload` - Extração de memoriais DOCX
  - `/api/salvar-memorial-completo` - Persistência completa

### Frontend (Leaflet/JavaScript)
- **Dashboard** - **NOVO** - Centro de Comando Geodésico com 4 KPIs + 2 gráficos Chart.js
- **Mapa Leaflet** - 3 camadas base (OSM, OpenTopoMap, Esri Satellite)
- **Módulos**:
  - `js/modules/dashboard.js` - Consumo API + Chart.js
  - `js/modules/importador.js` - Hub unificado (DOCX/DXF/CSV)
  - `js/modules/propriedades.js` - CRUD + Ver no Mapa
  - `js/modules/clientes.js` - CRUD clientes

### Banco de Dados (PostGIS)
- **Container**: `db_inventario_prod` (porta 5434)
- **Database**: `marcos_geodesicos`
- **Tabelas**: `marcos_levantados`, `propriedades`, `clientes`, `vertices`

---

## ⚠️ NOMENCLATURA CRÍTICA

| Conceito | Nome Correto | NÃO usar |
|----------|--------------|----------|
| Tabela marcos | `marcos_levantados` | `marcos`, `marcos_geodesicos` |
| Status marco | `validado` | `levantado` |
| Data criação | `created_at` | `data_cadastro` |

---

## Camadas do Mapa

| Camada | Fonte | Licença |
|--------|-------|---------|
| OSM (padrão) | OpenStreetMap | Open Data ✅ |
| Topográfico | OpenTopoMap | CC-BY-SA ✅ |
| Satélite | Esri World Imagery | Gratuito básico ✅ |

> **Nota:** Google Hybrid foi removido por restrições de licenciamento comercial.

---

## Dashboard (Implementado 10/12/2025)

**4 KPIs:**
1. Área Mapeada (hectares)
2. Acervo de Marcos (% validados)
3. Propriedades (eficiência marcos/prop)
4. Clientes Ativos

**2 Gráficos:**
- Timeline de produção (6 meses)
- Distribuição por tipo (rosca)

---

## Sessão 10/12/2025

### Implementações:
- ✅ Dashboard Operacional (Backend + Frontend + Chart.js)
- ✅ 3 camadas de mapa gratuitas (removido Google)
- ✅ Exportação DXF com tolerância espacial (ST_DWithin 10cm)
- ✅ Correções de nomenclatura SQL

### Arquivos Modificados:
- `backend/routes/dashboard.js` (novo)
- `frontend/js/modules/dashboard.js` (novo)
- `frontend/script.js` (camadas mapa)
- `backend/routes/propriedades.js` (DXF export)

---

## Comandos Úteis

```bash
# Deploy
docker-compose -f docker-compose.prod.yml up -d --build app_inventario

# Logs
docker logs app_inventario_prod --tail 50

# Teste Dashboard
curl http://localhost:3002/api/dashboard/overview
```

---

## Próximos Passos Sugeridos

1. Autenticação de usuários
2. Relatórios em PDF
3. Backup automático
4. Integração SIGEF/CAR (quando dados disponíveis)