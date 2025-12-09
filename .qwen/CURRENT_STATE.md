# Estado Atual do Projeto - Sis_Marcos_Inventario

**Última Atualização:** 2025-12-09 11:17

## Status Geral: FUNCIONAL ✅

---

## Componentes Principais

### Backend (Node.js)
- **Container**: `app_inventario_prod` (porta 3002)
- **Endpoints Funcionais**:
  - `/api/memorial/upload` - Extração de dados de memoriais DOCX
  - `/api/salvar-memorial-completo` - Salva cliente, propriedade e gera geometria
  - `/api/verificar-memorial` - Verifica duplicatas e sobreposições (PostGIS)
  - `/api/historico` - Logs de auditoria do sistema
  - `/api/poligonos` - Polígonos para visualização no mapa
  - `/api/marcos` - Marcos com paginação (19k+ registros)
  - `/api/estatisticas` - KPIs do dashboard

### Frontend (Leaflet/JavaScript)
- **Estrutura Modular**:
  - `js/modules/importador.js` - Importação de memoriais DOCX ✅ **COMPLETO**
  - `js/modules/propriedades.js` - CRUD de propriedades + Ver no Mapa
  - `js/modules/clientes.js` - CRUD de clientes
  - `js/modules/historico.js` - Logs de auditoria
  - `js/modules/modals-crud.js` - Modais de criação/edição
- **Mapa**: Funcional com clusters, polígonos e tooltips
- **Sidebar**: Navegação entre Mapa, Marcos, Importar, Propriedades, Clientes, Histórico

### Banco de Dados (PostGIS)
- **Container**: `db_inventario_prod` (porta 5434)
- **Database**: `marcos_geodesicos`
- **Tabelas Principais**: `marcos_levantados`, `propriedades`, `clientes`, `vertices`, `logs_sistema`

### API Unstructured
- **Container**: `unstructured_api_prod` (porta 8001)
- **Função**: Extração de texto de documentos DOCX para processamento de memoriais

---

## Funcionalidades Implementadas

### Importação de Dados
| Tipo | Status | Endpoint | Notas |
|------|--------|----------|-------|
| CSV/XLSX | ✅ Funcional | `/api/upload-csv` | Streaming com batch insert, suporta 20k+ registros |
| Memorial DOCX | ✅ **COMPLETO** | `/api/memorial/upload` | Extrai → Verifica → Salva → Ver no Mapa |
| Arquivos GEO | ✅ Funcional | `/api/geo/upload` | Suporta KML, KMZ, SHP, DXF, GeoJSON |

### Gestão de Entidades
| Entidade | Listar | Criar | Editar | Excluir | Ver no Mapa |
|----------|--------|-------|--------|---------|-------------|
| Marcos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Propriedades | ✅ | ✅ | ✅ | ✅ | ✅ |
| Clientes | ✅ | ✅ | ✅ | ✅ | N/A |

### Sistema de Auditoria
- Logs automáticos em operações CRUD
- Visualização na aba "Histórico"
- Filtros por ação, entidade, data

---

## ✅ RESOLVIDO NESTA SESSÃO: Fluxo de Importação DOCX

### Funcionalidade Completa:
1. **Extração**: Upload do DOCX → API Unstructured → Parse de coordenadas
2. **Verificação**: Detecção de duplicatas (matrícula, nome+município) e sobreposições geográficas
3. **Confirmação**: Se conflitos, usuário vê `confirm()` e decide se continua
4. **Salvamento**: Cliente + Propriedade + Vértices + Geometria (PostGIS)
5. **Ver no Mapa**: Botão leva direto para propriedade com **zoom e popup**

### Bugs Corrigidos:
- ✅ `poligonosLayer` não inicializado → [FIX PETROVICH] em `script.js`
- ✅ Botão "Ver no Mapa" não centralizava → Usa `verPropriedadeNoMapa()` de `propriedades.js`

---

## Última Sessão de Trabalho (2025-12-09)

### O que foi feito:
1. ✅ Corrigido botão "Descartar" na importação CSV
2. ✅ Corrigido erro "ON CONFLICT" em importação XLSX
3. ✅ Criado endpoint `/api/verificar-memorial`
4. ✅ **FLUXO DOCX UNIFICADO** - Chain de 3 requests:
   - `POST /api/memorial/upload` (extração)
   - `POST /api/verificar-memorial` (duplicatas)
   - `POST /api/salvar-memorial-completo` (persistência)
5. ✅ [FIX PETROVICH] Inicialização de `poligonosLayer` em `script.js`
6. ✅ Botão "Ver no Mapa" com zoom e popup funcionando
7. ✅ Docker rebuild bem-sucedido

### Arquivos Modificados:
- `backend/server.js` - [FIX PETROVICH] inicialização poligonosLayer
- `frontend/script.js` - Hotfix linha 1311-1318
- `frontend/js/modules/importador.js` - Fluxo completo implementado

---

## Próximos Passos

### Prioridade Média
1. Testar importação de grandes volumes (20k+ registros)
2. Validar funcionamento do CAR (análise com PostGIS)
3. Preparar para migração AWS

### Prioridade Baixa
1. Substituir ícone `map-off` que não existe no Lucide
2. Refatorar `script.js` em módulos menores (debt técnico)

---

## Arquitetura Docker

```
┌─────────────────────────────────────┐
│         Docker Compose (prod)       │
├─────────────────────────────────────┤
│  app_inventario_prod (3002)         │
│  ├── Node.js + Express              │
│  └── Serve static frontend          │
├─────────────────────────────────────┤
│  db_inventario_prod (5434)          │
│  └── PostgreSQL + PostGIS           │
├─────────────────────────────────────┤
│  unstructured_api_prod (8001)       │
│  └── API para extração de texto     │
└─────────────────────────────────────┘
```

---

## Comandos Úteis

```bash
# Rebuild e deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Ver logs
docker logs app_inventario_prod --tail 50

# Restaurar arquivos
git checkout HEAD -- frontend/script.js frontend/js/modules/importador.js
```