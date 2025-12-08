const fs = require('fs');
const path = require('path');
const targetFile = path.join(__dirname, '../frontend/index.html');

console.log(`🏗️ EXECUTANDO CORREÇÃO CIRÚRGICA V2.1 EM: ${targetFile}`);

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COGEP - Sistema de Marcos Geodésicos</title>

    <script>
        window.API_URL = window.location.origin;
        console.log('🌐 API_URL:', window.API_URL);
    </script>

    <script src="https://unpkg.com/lucide@latest"></script>
    <link rel="stylesheet" href="styles/design-system.css">
    <link rel="stylesheet" href="styles/components.css">
    <link rel="stylesheet" href="styles/animations.css">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/proj4@2.9.2/dist/proj4.js"></script>
    <script src="https://unpkg.com/@turf/turf@6/turf.min.js"></script>
    <script src="https://unpkg.com/supercluster@8.0.1/dist/supercluster.min.js"></script>

    <style>
        .app-container { display: flex; min-height: 100vh; background-color: var(--bg-primary); }
        .main-content { flex: 1; margin-left: 275px; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
        @media (max-width: 1024px) { .main-content { margin-left: 0; } }
        
        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            padding: 20px;
            background-color: var(--bg-primary);
            border-bottom: 1px solid var(--border-primary);
            z-index: 10;
        }
        .stat-card {
            background: var(--bg-secondary);
            padding: 15px;
            border-radius: 8px;
            border: 1px solid var(--border-primary);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .stat-value { font-size: 1.5rem; font-weight: bold; color: var(--text-primary); }
        .stat-label { font-size: 0.85rem; color: var(--text-secondary); }

        /* Mapa e Conteúdo */
        .content-body { flex: 1; position: relative; overflow-y: auto; }
        #map { width: 100%; height: 100%; z-index: 1; }
        
        .tab-content { display: none; height: 100%; }
        .tab-content.active { display: block; animation: fadeIn 0.3s ease; }

        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2000; justify-content: center; align-items: center; }
        .modal.active { display: flex; }
        .menu-toggle-btn { display: none; position: fixed; top: 15px; right: 15px; z-index: 1002; }
        @media (max-width: 1024px) { .menu-toggle-btn { display: block; } }
    </style>
</head>
<body>

    <div class="app-container">
        <aside class="sidebar">
            <div class="sidebar-header">
                <a href="#" class="sidebar-logo">
                    <i data-lucide="map-pin"></i><span class="sidebar-logo-text">COGEP</span>
                </a>
            </div>
            <nav class="sidebar-nav">
                <!-- V2.1: Removido onclick, adicionado data-tab e classes limpas -->
                <a href="#" class="nav-link active" data-tab="mapa"><i data-lucide="map"></i><span>Mapa</span></a>
                <a href="#" class="nav-link" data-tab="marcos"><i data-lucide="map-pin"></i><span>Marcos</span></a>
                <a href="#" class="nav-link" data-tab="importar"><i data-lucide="upload"></i><span>Importar</span></a>
                <a href="#" class="nav-link" data-tab="propriedades"><i data-lucide="building-2"></i><span>Propriedades</span></a>
                <a href="#" class="nav-link" data-tab="clientes"><i data-lucide="users"></i><span>Clientes</span></a>
                <a href="#" class="nav-link" data-tab="historico"><i data-lucide="clock"></i><span>Histórico</span></a>
            </nav>
            <div style="padding: 20px; border-top: 1px solid var(--border-primary);">
                <button class="theme-toggle" onclick="toggleTheme()"><i data-lucide="moon" id="theme-icon"></i></button>
            </div>
        </aside>

        <main class="main-content">
             <button class="menu-toggle-btn btn btn-secondary" id="mobile-menu-btn">
                <i data-lucide="menu"></i>
            </button>

            <div class="stats-grid">
                <div class="stat-card">
                    <i data-lucide="map-pin" style="color: var(--cogep-green)"></i>
                    <div>
                        <div class="stat-value" id="stat-marcos">0</div>
                        <div class="stat-label">Total de Marcos</div>
                    </div>
                </div>
                <div class="stat-card">
                    <i data-lucide="check-circle" style="color: #10B981"></i>
                    <div>
                        <div class="stat-value" id="stat-levantados">0</div>
                        <div class="stat-label">Levantados</div>
                    </div>
                </div>
                <div class="stat-card">
                    <i data-lucide="building-2" style="color: #3B82F6"></i>
                    <div>
                        <div class="stat-value" id="stat-propriedades">0</div>
                        <div class="stat-label">Propriedades</div>
                    </div>
                </div>
                <div class="stat-card">
                    <i data-lucide="users" style="color: #F59E0B"></i>
                    <div>
                        <div class="stat-value" id="stat-clientes">0</div>
                        <div class="stat-label">Clientes</div>
                    </div>
                </div>
            </div>

            <div class="content-body">
                <div id="tab-mapa" class="tab-content active">
                    <div id="map"></div>
                    <div style="position: absolute; bottom: 20px; right: 20px; background: white; padding: 10px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); z-index: 1000; font-size: 12px;">
                        <div style="display:flex; align-items:center; gap:5px; margin-bottom:5px;"><span style="width:10px; height:10px; background:#27ae60; border-radius:50%"></span> Rural</div>
                        <div style="display:flex; align-items:center; gap:5px; margin-bottom:5px;"><span style="width:10px; height:10px; background:#3498db; border-radius:50%"></span> Urbano</div>
                        <div style="display:flex; align-items:center; gap:5px;"><span style="width:10px; height:10px; background:#e74c3c; border-radius:50%"></span> Marcos</div>
                    </div>
                </div>
                
                <div id="tab-marcos" class="tab-content">
                    <div style="padding: 20px;">
                        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; justify-content: space-between;">
                            <h2 style="margin:0;">Gerenciar Marcos</h2>
                            <div style="display:flex; gap:10px;">
                                <button class="btn btn-primary" onclick="window.abrirModalNovoMarco()"><i data-lucide="plus"></i> Novo Marco</button>
                                <button class="btn btn-secondary" onclick="window.abrirModalImportarCSV()"><i data-lucide="file-spreadsheet"></i> Importar CSV</button>
                            </div>
                        </div>
                        <div style="display:flex; gap:10px; margin-bottom:20px;">
                             <input type="text" id="busca-marcos" class="input" placeholder="Buscar por código, local..." style="flex:1;">
                             <button class="btn btn-secondary" onclick="if(window.carregarMarcosLista) window.carregarMarcosLista(1)">Buscar</button>
                        </div>
                        <div id="marcos-grid" style="display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));"></div>
                        <div id="marcos-pagination" style="margin-top: 20px; text-align: center; display:flex; justify-content:center; gap:15px; align-items:center;">
                             <button class="btn btn-sm btn-secondary" id="prev-page" onclick="paginaAnterior()">Anterior</button>
                             <span id="pagination-info">Carregando...</span>
                             <button class="btn btn-sm btn-secondary" id="next-page" onclick="proximaPagina()">Próxima</button>
                        </div>
                    </div>
                </div>

                <div id="tab-importar" class="tab-content">
                    <div style="padding: 40px; text-align: center; max-width: 800px; margin: 0 auto;">
                        <h2>Importar Memorial Descritivo (DOCX)</h2>
                        <p style="color:var(--text-secondary); margin-bottom:20px;">Processamento inteligente de documentos para extração de geometria.</p>
                        <div id="upload-area-docx" class="upload-area" onclick="document.getElementById('file-input-docx').click()" style="margin-top: 20px; cursor: pointer;">
                            <i data-lucide="file-text" style="width: 48px; height: 48px; color: var(--cogep-green);"></i>
                            <h3>Clique para selecionar DOCX</h3>
                            <input type="file" id="file-input-docx" accept=".docx" style="display:none;" onchange="window.handleFileSelectDOCX(event)">
                        </div>
                        <div id="preview-area-docx" style="display:none; margin-top:20px;">
                            <div class="card" style="padding:15px;">
                                <strong id="file-name-docx"></strong>
                                <div id="docx-status"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="tab-propriedades" class="tab-content">
                    <div style="padding: 20px;">
                         <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                            <h2>Propriedades</h2>
                            <button class="btn btn-primary" onclick="window.abrirModalNovaPropriedade()"><i data-lucide="plus"></i> Nova Propriedade</button>
                         </div>
                         <div id="propriedades-grid" style="display:grid; gap:15px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));"></div>
                    </div>
                </div>
                
                <div id="tab-clientes" class="tab-content">
                     <div style="padding: 20px;">
                         <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                            <h2>Clientes</h2>
                            <button class="btn btn-primary" onclick="window.abrirModalNovoCliente()"><i data-lucide="plus"></i> Novo Cliente</button>
                         </div>
                         <div id="clientes-grid" style="display:grid; gap:15px;"></div>
                    </div>
                </div>
                
                <div id="tab-historico" class="tab-content">
                    <div style="padding: 20px;">
                        <h2>Histórico de Atividades</h2>
                        <div id="lista-historico"></div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Modals -->
    <div id="modal-importar-csv" class="modal" style="display: none;">
         <div class="modal-backdrop" onclick="window.fecharModal('modal-importar-csv')"></div>
        <div class="modal-container" style="max-width: 600px;">
            <div class="modal-header">
                <h2 class="modal-title"><i data-lucide="file-spreadsheet"></i> Importação em Lote</h2>
                <button class="btn-icon" onclick="window.fecharModal('modal-importar-csv')"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
                <div id="painel-upload">
                    <div id="drop-zone-csv" class="upload-area" onclick="window.acionarSeletorCSV(event)" style="padding: 40px; text-align: center; cursor: pointer; border: 2px dashed #ccc;">
                        <i data-lucide="upload-cloud" style="width: 48px; color: var(--cogep-green);"></i>
                        <h3>Selecione a Planilha</h3>
                        <p>Suporta CSV e Excel (.xlsx)</p>
                        <button class="btn btn-secondary" id="btn-abrir-seletor">Buscar Arquivo</button>
                        <input type="file" id="file-input-importar" accept=".csv, .txt, .xlsx, .xls" style="display: none;" onchange="window.csvSelecionado(this)">
                    </div>
                    <div id="nome-arquivo-csv" class="alert alert-info" style="display: none; margin-top: 20px;"></div>
                    <div class="card" style="margin-top: 20px; padding: 15px; background-color: var(--bg-secondary);">
                        <label style="cursor: pointer; display: flex; gap: 10px;">
                            <input type="checkbox" id="check-simulacao" checked>
                            <div><strong>Modo Simulação</strong><br><small>Verifica integridade sem persistência no banco.</small></div>
                        </label>
                    </div>
                </div>
                <div id="resultado-importacao-planilha" style="display: none; margin-top: 20px;"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.fecharModal('modal-importar-csv')">Cancelar</button>
                <button class="btn btn-primary" id="btn-executar-importacao" disabled onclick="window.importarPlanilhaMarcos()">Iniciar Análise</button>
            </div>
        </div>
    </div>
    
     <div id="modal-novo-marco" class="modal" style="display: none;">
        <div class="modal-backdrop" onclick="window.fecharModal('modal-novo-marco')"></div>
        <div class="modal-container" style="max-width: 700px;">
            <div class="modal-header">
                <h2 class="modal-title"><i data-lucide="map-pin"></i> Novo Marco</h2>
                <button class="btn-icon" onclick="window.fecharModal('modal-novo-marco')"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
                <form id="form-novo-marco" onsubmit="return false;">
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group"><label>Código *</label><input type="text" id="marco-codigo" class="input" required></div>
                        <div class="form-group"><label>Tipo *</label><select id="marco-tipo" class="input"><option value="V">V - Vértice</option><option value="M">M - Marco</option></select></div>
                    </div>
                    <div class="form-group" style="margin-top:10px;"><label>Município</label><input type="text" id="marco-municipio" class="input"></div>
                    <div class="form-row" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top:10px;">
                        <div class="form-group"><label>Lat</label><input type="number" id="marco-latitude" class="input" step="any"></div>
                        <div class="form-group"><label>Long</label><input type="number" id="marco-longitude" class="input" step="any"></div>
                        <div class="form-group"><label>Alt</label><input type="number" id="marco-altitude" class="input" step="any"></div>
                    </div>
                    <div class="form-group" style="margin-top:10px;"><label>Obs</label><textarea id="marco-observacoes" class="input"></textarea></div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="window.fecharModal('modal-novo-marco')">Cancelar</button>
                <button class="btn btn-primary" onclick="if(window.salvarNovoMarco) window.salvarNovoMarco()">Salvar</button>
            </div>
        </div>
    </div>

    <div id="modal-nova-propriedade" class="modal"><div class="modal-backdrop" onclick="window.fecharModal('modal-nova-propriedade')"></div><div class="modal-container"><div class="modal-header"><h2>Nova Propriedade</h2><button class="btn-icon" onclick="window.fecharModal('modal-nova-propriedade')">×</button></div><div class="modal-body"><form id="form-nova-propriedade"><div class="form-group"><label>Nome</label><input type="text" id="prop-nome" class="input" required></div><div class="form-group"><label>Cliente</label><select id="prop-cliente" class="input"></select></div></form></div><div class="modal-footer"><button class="btn btn-primary" onclick="if(window.salvarNovaPropriedade) window.salvarNovaPropriedade()">Salvar</button></div></div></div>
    <div id="modal-novo-cliente" class="modal"><div class="modal-backdrop" onclick="window.fecharModal('modal-novo-cliente')"></div><div class="modal-container"><div class="modal-header"><h2>Novo Cliente</h2><button class="btn-icon" onclick="window.fecharModal('modal-novo-cliente')">×</button></div><div class="modal-body"><form id="form-novo-cliente"><div class="form-group"><label>Nome</label><input type="text" id="cliente-nome" class="input" required></div></form></div><div class="modal-footer"><button class="btn btn-primary" onclick="if(window.salvarNovoCliente) window.salvarNovoCliente()">Salvar</button></div></div></div>

    <div id="toast-container"></div>
    <div id="modal-confirmacao-memorial"></div>

    <script src="script.js"></script>
    <script src="script-poligonos.js"></script>

    <script>
        // ==========================================
        // LÓGICA DE INTERFACE V2.1 (Event Listeners Safe)
        // ==========================================
        console.log('🚀 Interface V2.1 Inicializada (Safe Events)');

        window.AppState = { marcos: [], marcosLoaded: false, currentFilter: {} };

        // 1. Definição Global de Modais
        window.abrirModal = (id) => { const m = document.getElementById(id); if(m) { m.style.display = 'flex'; m.classList.add('active'); if(typeof lucide!='undefined') lucide.createIcons(); }};
        window.fecharModal = (id) => { 
            const m = document.getElementById(id); 
            if(m) { m.style.display = 'none'; m.classList.remove('active'); }
            if(id === 'modal-importar-csv') {
                 const p = document.getElementById('painel-upload'); if(p) p.style.display = 'block';
                 const r = document.getElementById('resultado-importacao-planilha'); if(r) r.style.display = 'none';
            }
        };

        window.abrirModalImportarCSV = () => window.abrirModal('modal-importar-csv');
        window.abrirModalNovoMarco = () => window.abrirModal('modal-novo-marco');
        window.abrirModalNovaPropriedade = () => { if(window.carregarClientesSelectProp) window.carregarClientesSelectProp('prop-cliente'); window.abrirModal('modal-nova-propriedade'); };
        window.abrirModalNovoCliente = () => window.abrirModal('modal-novo-cliente');

        window.acionarSeletorCSV = (e) => { if(e) e.stopPropagation(); document.getElementById('file-input-importar').click(); };
        window.csvSelecionado = (input) => {
            const display = document.getElementById('nome-arquivo-csv');
            const btn = document.getElementById('btn-executar-importacao');
            if (input.files && input.files[0]) {
                display.style.display = 'flex';
                display.innerHTML = \`<i data-lucide="file-check"></i> <strong>\${input.files[0].name}</strong>\`;
                btn.disabled = false;
                btn.innerHTML = '<i data-lucide="flask-conical"></i> Executar Simulação';
                if(typeof lucide!='undefined') lucide.createIcons();
            }
        };

        window.importarPlanilhaMarcos = async function(e, forcarProducao = false) {
             if(e) e.preventDefault();
            const fileInput = document.getElementById('file-input-importar');
            const checkbox = document.getElementById('check-simulacao');
            const resultDiv = document.getElementById('resultado-importacao-planilha');
            const painelUpload = document.getElementById('painel-upload');
            const btn = document.getElementById('btn-executar-importacao');

            if(!fileInput.files[0]) return alert('Selecione um arquivo.');
            
            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Processando...';
            lucide.createIcons();

            const isSimulacao = forcarProducao ? false : checkbox.checked;
            const formData = new FormData();
            formData.append('csvFile', fileInput.files[0]);
            formData.append('simulacao', isSimulacao);

            try {
                const baseUrl = (window.API_URL || '').replace(/\/$/, '');
                const res = await fetch(baseUrl + '/api/marcos/importar-csv', { method: 'POST', body: formData });
                const result = await res.json();

                if(result.sucesso) {
                    painelUpload.style.display = 'none';
                    resultDiv.style.display = 'block';
                    const color = result.modo_simulacao ? 'blue' : 'green';
                    resultDiv.innerHTML = \`
                        <div class="card" style="padding:20px; border-left:4px solid \${color};">
                            <h3 style="color:\${color}">\${result.modo_simulacao ? 'Simulação' : 'Sucesso'}</h3>
                            <p>Total: \${result.estatisticas.total} | Válidos: \${result.estatisticas.validos}</p>
                            \${result.modo_simulacao ? 
                                \`<button class="btn btn-primary" style="width:100%; margin-top:10px; background-color:#10B981" onclick="window.importarPlanilhaMarcos(null, true)">Confirmar e Gravar</button>\` : 
                                \`<button class="btn btn-secondary" style="width:100%; margin-top:10px;" onclick="window.location.reload()">Concluir</button>\`
                            }
                        </div>\`;
                } else {
                    throw new Error(result.erro);
                }
            } catch(err) {
                alert('Erro: ' + err.message);
                painelUpload.style.display = 'block';
            } finally {
                btn.disabled = false;
            }
        };

        document.addEventListener('DOMContentLoaded', () => {
             // Init Libs
            if(typeof lucide!='undefined') lucide.createIcons();
            if(!localStorage.getItem('theme')) localStorage.setItem('theme', 'light');
            document.documentElement.setAttribute('data-theme', localStorage.getItem('theme'));
            if(window.iniciarAtualizacaoAutomatica) window.iniciarAtualizacaoAutomatica();
            
            // Mobile Menu
            const toggleBtn = document.getElementById('mobile-menu-btn');
            if(toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                     document.querySelector('.sidebar').classList.toggle('active');
                });
            }

            // --- NAVEGAÇÃO SEGURA (V2.1) ---
            const navLinks = document.querySelectorAll('.nav-link');
            
            function switchTabInternal(tabId) {
                console.log(\`🔄 Trocando para aba: \${tabId}\`);
                document.querySelectorAll('.tab-content').forEach(section => {
                    section.style.display = 'none';
                    section.classList.remove('active');
                });
                const targetSection = document.getElementById('tab-' + tabId); 
                if (targetSection) {
                    targetSection.style.display = 'block';
                    targetSection.classList.add('active');
                    
                    if(window.innerWidth <= 1024) document.querySelector('.sidebar').classList.remove('active');
                    
                    if(tabId === 'marcos' && window.carregarMarcosLista) window.carregarMarcosLista();
                    if(tabId === 'propriedades' && window.carregarPropriedadesLista) window.carregarPropriedadesLista();
                    if(tabId === 'clientes' && window.carregarClientes) window.carregarClientes();
                    if(tabId === 'mapa' && window.map) setTimeout(() => window.map.invalidateSize(), 200);
                } else {
                    console.error(\`[ERRO CRÍTICO] Seção não encontrada no DOM: #tab-\${tabId}\`);
                }
            }

            if (navLinks.length > 0) {
                navLinks.forEach(link => {
                    link.addEventListener('click', function(e) {
                        e.preventDefault();
                        const targetId = this.getAttribute('data-tab');
                        
                        navLinks.forEach(l => l.classList.remove('active'));
                        this.classList.add('active');

                        if (targetId) {
                            switchTabInternal(targetId);
                        } else {
                            console.warn("⚠️ Link de navegação sem alvo definido (data-tab ausente).");
                        }
                    });
                });
                console.log(\`✅ \${navLinks.length} links de navegação vinculados com sucesso.\`);
            } else {
                console.warn("⚠️ Nenhum link de navegação (.nav-link) encontrado no HTML.");
            }
        });

        window.toggleTheme = () => {
            const current = localStorage.getItem('theme') === 'light' ? 'dark' : 'light';
            localStorage.setItem('theme', current);
            document.documentElement.setAttribute('data-theme', current);
            lucide.createIcons();
        };
    </script>
</body>
</html>`;

try {
    fs.writeFileSync(targetFile, htmlContent, 'utf8');
    console.log('✅ SUCESSO: index.html corrigido (V2.1 - Event Listeners Seguros)');
} catch (err) {
    console.error('❌ ERRO AO SALVAR:', err);
}
