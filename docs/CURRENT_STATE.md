# Estado Atual do Projeto - Sis_Marcos_Inventario

**Última Atualização:** 2025-12-10 17:35 (Dezembro)

## Status Geral: FUNCIONAL ✅ + MULTI-TENANT ✅

---

## 🔐 Sistema de Autenticação (Protocolo Bunker)

### Status: IMPLEMENTADO ✅

| Funcionalidade | Endpoint | Status |
|----------------|----------|--------|
| Login JWT | `POST /api/auth/login` | ✅ |
| Troca de Senha | `POST /api/auth/change-password` | ✅ |
| Listar Usuários | `GET /api/auth/users` | ✅ Admin |
| Criar Usuário | `POST /api/auth/register` | ✅ Admin |
| Ativar/Desativar | `PUT /api/auth/users/:id/toggle-active` | ✅ Admin |
| Reset Senha | `POST /api/auth/admin/reset-password` | ✅ Admin |
| **Provisionar Tenant** | `POST /api/auth/provision-tenant` | ✅ **NOVO** |
| Listar Clientes | `GET /api/auth/clientes-list` | ✅ **NOVO** |

### Cargos de Usuário:
- `admin` - Acesso total, vê todos os dados
- `operador` - CRUD nos dados do seu cliente
- `visualizador` - Apenas leitura

---

## 🏢 Multi-Tenant (Row-Level Security)

### Status: IMPLEMENTADO ✅ (Protocolo Petrovich)

**Lógica de Isolamento:**
- Usuário com `cliente_id` → Vê apenas dados do seu cliente
- Usuário sem `cliente_id` (NULL) → Vê **ZERO dados** (sistema limpo)
- Admin → Vê **TODOS** os dados

**Rotas Protegidas com Multi-Tenant:**
| Rota | Filtro Aplicado |
|------|-----------------|
| `GET /api/marcos` | `WHERE cliente_id = ?` |
| `GET /api/propriedades` | `WHERE cliente_id = ?` |
| `GET /api/propriedades/geojson` | `WHERE cliente_id = ?` |
| `GET /api/clientes` | `WHERE id = ?` (próprio cliente) |
| `GET /api/estatisticas` | Filtra todas as contagens |
| `GET /api/dashboard/overview` | Filtra todos os KPIs |
| `GET /api/historico` | `WHERE cliente_id = ?` |

**Provisionamento Atômico:**
- Botão "Novo Inquilino" cria Empresa + Usuário em transação única
- Impossível criar usuário "órfão" (sem cliente_id)

---

## Componentes Principais

### Backend (Node.js/Express)
- **Container**: `app_inventario_prod` (porta 3002)
- **Middleware**: `authMiddleware` obrigatório em todas as rotas de dados
- **Arquivos Principais**:
  - `backend/routes/auth.js` - Autenticação + Provisionamento
  - `backend/routes/marcos.js` - CRUD marcos multi-tenant
  - `backend/routes/propriedades.js` - CRUD propriedades multi-tenant
  - `backend/routes/dashboard.js` - KPIs multi-tenant
  - `backend/routes/clientes.js` - CRUD clientes multi-tenant
  - `backend/middleware/auth-middleware.js` - JWT + cliente_id

### Frontend (Leaflet/JavaScript)
- **Design System**: COGEP Premium v2.0 (Light/Dark)
- **Autenticação**: `js/auth-client.js` - Interceptor global + Modal de login
- **Admin Panel**: `js/modules/admin-panel.js` - Gestão de usuários/tenants
- **Módulos**:
  - `js/modules/dashboard.js` - KPIs + Chart.js
  - `js/modules/importador.js` - Hub unificado (DOCX/DXF/CSV)
  - `js/modules/propriedades.js` - CRUD + Ver no Mapa
  - `js/modules/clientes.js` - CRUD clientes

### Banco de Dados (PostGIS)
- **Container**: `db_inventario_prod` (porta 5434)
- **Database**: `marcos_geodesicos`
- **Tabelas com `cliente_id`**:
  - `usuarios` - FK para clientes
  - `marcos_levantados` - FK para clientes
  - `propriedades` - FK para clientes
  - `logs_sistema` - FK para clientes

---

## ⚠️ NOMENCLATURA CRÍTICA

| Conceito | Nome Correto | NÃO usar |
|----------|--------------|----------|
| Tabela marcos | `marcos_levantados` | `marcos`, `marcos_geodesicos` |
| Status marco | `validado` | `levantado` |
| Data criação | `created_at` | `data_cadastro` |
| Usuário/Cliente | `cliente_id` | `user_id`, `tenant_id` |

---

## Painel de Administração

### Gestão de Usuários (`/api/auth/users`)
- Tabela com todos os usuários
- Badges de status (Ativo/Inativo)
- Badges de cargo (Admin/Operador/Visualizador)
- Ações: Reset Senha, Ativar/Desativar

### Provisionamento de Tenant
- **Botão "Novo Inquilino"**: Cria empresa + usuário administrador juntos
- **Botão "Adicionar Usuário"**: Adiciona usuário a empresa existente (com select)
- Transação atômica (BEGIN...COMMIT)

---

## Dashboard (Multi-Tenant)

**4 KPIs:**
1. Área Mapeada (hectares) - filtrado por cliente
2. Acervo de Marcos (% validados) - filtrado por cliente
3. Propriedades (eficiência) - filtrado por cliente
4. Clientes Ativos - 1 para não-admin, total para admin

**2 Gráficos:**
- Timeline de produção (6 meses)
- Distribuição por tipo (rosca)

---

## Camadas do Mapa

| Camada | Fonte | Licença |
|--------|-------|---------|
| OSM (padrão) | OpenStreetMap | Open Data ✅ |
| Topográfico | OpenTopoMap | CC-BY-SA ✅ |
| Satélite | Esri World Imagery | Gratuito básico ✅ |

> **Nota:** Google Hybrid foi removido por restrições de licenciamento comercial.

---

## Sessão 10/12/2025 - Implementações

### Autenticação (Protocolo Bunker)
- ✅ Login com JWT (24h)
- ✅ Modal de troca de senha obrigatória
- ✅ Lockout após 5 tentativas (15 min)
- ✅ Painel Admin para gestão de usuários

### Multi-Tenant (Protocolo Petrovich)
- ✅ Coluna `cliente_id` em todas as tabelas críticas
- ✅ Filtro automático por cliente_id em todas as rotas
- ✅ cliente_id NULL retorna zero dados (sistema limpo)
- ✅ Provisionamento atômico (Empresa + Usuário)

### Frontend
- ✅ Design System Premium com variáveis CSS
- ✅ Estilos do Admin Panel atualizados
- ✅ Modais dinâmicos para provisionamento

---

## Comandos Úteis

```bash
# Deploy
docker-compose -f docker-compose.prod.yml up -d --build app_inventario

# Logs
docker logs app_inventario_prod --tail 50

# Teste Autenticação
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@cogep.com","senha":"sua_senha"}'

# Teste Dashboard (com token)
curl http://localhost:3002/api/dashboard/overview \
  -H "Authorization: Bearer SEU_TOKEN"
```

---

## Fluxo de Criação de Novo Cliente

1. Admin acessa "Gestão" na sidebar
2. Clica em "Novo Inquilino"
3. Preenche: Nome Empresa, CNPJ, Nome Usuário, Email
4. Sistema cria Empresa + Usuário em transação única
5. Copia senha temporária e envia ao cliente
6. Cliente faz login e troca senha
7. Cliente começa a popular **seus próprios dados** (sistema limpo)

---

## Próximos Passos Sugeridos

1. ~~Autenticação de usuários~~ ✅ FEITO
2. ~~Multi-tenant~~ ✅ FEITO
3. Relatórios em PDF
4. Backup automático
5. Integração SIGEF/CAR (quando dados disponíveis)
6. Página de cobranças/assinatura (SaaS)