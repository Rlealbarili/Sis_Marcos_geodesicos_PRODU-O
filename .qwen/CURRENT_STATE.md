# Estado Atual do Projeto - Sis_Marcos_Inventario

**Última Atualização:** 2025-12-09

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
  - `js/modules/importador.js` - Importação de memoriais DOCX
  - `js/modules/propriedades.js` - CRUD de propriedades
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
| Memorial DOCX | ⚠️ Parcial | `/api/memorial/upload` | Extrai dados mas NÃO salva automaticamente |
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

## Problemas Conhecidos

### IMPORTANTE: Fluxo de Importação DOCX Incompleto
1. O módulo `importador.js` envia para `/api/memorial/upload`
2. Backend **EXTRAI** os dados mas **NÃO SALVA** no banco
3. O endpoint `/api/salvar-memorial-completo` existe mas **não é chamado**
4. Os dados extraídos são **perdidos** após fechar a página

**Solução Pendente**: Modificar `importador.js` para chamar salvamento após extração

---

## Última Sessão de Trabalho (2025-12-09)

### O que foi feito:
1. ✅ Corrigido botão "Descartar" na importação CSV (reset completo)
2. ✅ Corrigido erro "ON CONFLICT" em importação XLSX (deduplicação de batch)
3. ✅ Criado endpoint `/api/verificar-memorial` para detecção de duplicatas/sobreposições
4. ✅ Análise completa do fluxo de importação DOCX
5. ⚠️ Tentativa de unificar fluxo DOCX - **REVERTIDA** (modificações quebraram script.js)
6. ✅ Arquivos restaurados via `git checkout`

### Arquivos Modificados:
- `backend/routes/upload-csv.js` - Deduplicação de batch
- `backend/server.js` - Endpoint `/api/verificar-memorial`
- `frontend/script.js` - Cancelar importação (resetado para original)
- `frontend/js/modules/importador.js` - (resetado para original)

---

## Próximos Passos

### Prioridade Alta
1. **Completar fluxo DOCX**: Modificar `importador.js` para chamar `/api/salvar-memorial-completo` após extração
2. **Integrar verificação**: Adicionar chamada a `/api/verificar-memorial` antes de salvar
3. **Botão "Ver no Mapa"**: Adicionar após importação bem-sucedida

### Prioridade Média
1. Testar importação de grandes volumes (20k+ registros)
2. Validar funcionamento do CAR (análise com PostGIS)
3. Preparar para migração AWS

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