const fs = require('fs');
const path = require('path');

// Caminho alvo: ajustado para a raiz do frontend
const targetFile = path.join(__dirname, '../frontend/index.html');

console.log(`🏗️ INICIANDO RECONSTRUÇÃO TOTAL (GOLDEN COPY) EM: ${targetFile}`);

// CONTEÚDO "GOLDEN COPY" (Validado e Limpo)
const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR" data-theme="light">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COGEP - Sistema de Marcos Geodésicos</title>

    <script>
        // Definição Centralizada da API
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
        /* Layout Base */
        .app-container { display: flex; min-height: 100vh; background-color: var(--bg-primary); }
        .main-content { flex: 1; margin-left: 275px; display: flex; flex-direction: column; }
        @media (max-width: 1024px) { .main-content { margin-left: 0; } }
        #map { width: 100%; height: calc(100vh - 120px); z-index: 1; border-radius: 12px; }
        
        /* Utilitários de Modal e Tabs */
        .tab-content { display: none; }
        .tab-content.active { display: block; animation: fadeIn 0.3s ease; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2000; justify-content: center; align-items: center; }
        .modal.active { display: flex; }
        /* Ajuste do botão hamburger */
        .menu-toggle-btn { display: none; }
        @media (max-width: 1024px) { .menu-toggle-btn { display: block; position: fixed; top: 15px; right: 15px; z-index: 1002; } }
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
            <button class="menu-toggle-btn btn btn-secondary" onclick="document.querySelector('.sidebar').classList.toggle('active')">
                <i data-lucide="menu"></i>
            </button>

            <div class="tabs-container">
                <div class="tabs-list">
                    <button class="tab-button active" data-tab="mapa">Mapa</button>
                    <button class="tab-button" data-tab="marcos">Buscar Marcos</button>
                    <button class="tab-button" data-tab="importar">Importar Memorial</button>
                    <button class="tab-button" data-tab="propriedades">Propriedades</button>
                    <button class="tab-button" data-tab="clientes">Clientes</button>
                </div>
            </div>

            <div class="content-body">
                <div id="tab-mapa" class="tab-content active">
                    <div id="map"></div>
                </div>

                <div id="tab-marcos" class="tab-content">
                    <div style="padding: 20px;">
                        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                            <input type="text" id="busca-marcos" class="input" placeholder="Buscar marcos..." style="flex:1; min-width: 200px;">
                            <button class="btn btn-primary" onclick="buscarMarcos()">Buscar</button>
                            <button class="btn btn-secondary" onclick="abrirModalImportarCSV()">
                                <i data-lucide="file-spreadsheet"></i> Importar CSV
                            </button>
                            <button class="btn btn-primary" onclick="exportarMarcosDXF()">
                                <i data-lucide="download"></i> DXF
                            </button>
                        </div>
                        <div id="marcos-grid" style="display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));"></div>
                        <div id="marcos-pagination" style="margin-top: 20px; text-align: center;">
                           <button class="btn btn-sm btn-secondary" id="prev-page" onclick="paginaAnterior()">Anterior</button>
                           <span id="pagination-info" style="margin: 0 10px;"></span>
                           <button class="btn btn-sm btn-secondary" id="next-page" onclick="proximaPagina()">Próxima</button>
                        </div>
                    </div>
                </div>

                <div id="tab-importar" class="tab-content">
                    <div style="padding: 40px; text-align: center; max-width: 800px; margin: 0 auto;">
                        <h2>Importar Memorial Descritivo</h2>
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

                <div id="tab-propriedades" class="tab-content"><div id="propriedades-grid"></div></div>
                <div id="tab-clientes" class="tab-content"><div id="clientes-grid"></div></div>
                <div id="tab-historico" class="tab-content"><div id="lista-historico"></div></div>
            </div>
        </main>
    </div>

    <div id="modal-importar-csv" class="modal" style="display: none;">
        <div class="modal-backdrop" onclick="window.fecharModal('modal-importar-csv')"></div>
        <div class="modal-container" style="max-width: 600px;">
            <div class="modal-header">
                <h2 class="modal-title"><i data-lucide="file-spreadsheet"></i> Importação em Lote</h2>
                <button class="btn-icon" onclick="window.fecharModal('modal-importar-csv')"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
                <div id="painel-upload">
                    <div id="drop-zone-csv" class="upload-area" onclick="window.acionarSeletorCSV(event)" style="padding: 40px; cursor: pointer; border: 2px dashed var(--border-secondary); text-align: center;">
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

    <div id="toast-container"></div>
    <div id="modal-confirmacao-memorial"></div>

    <script src="script.js"></script>
    <script src="script-poligonos.js"></script>
    
    <script>
        // ==========================================
        // SCRIPT MESTRE DE INICIALIZAÇÃO (CLEAN)
        // ==========================================
        console.log('🚀 Sistema COGEP Reiniciado (Golden Copy)');

        // Estado Global
        window.AppState = { marcos: [], marcosLoaded: false, currentFilter: {} };
        window.memorialAtual = null;

        // Funções de Gerenciamento de Modal (Padrão DRY)
        window.abrirModal = (id) => { 
            const m = document.getElementById(id); 
            if(m) { m.style.display = 'flex'; m.classList.add('active'); if(typeof lucide!='undefined') lucide.createIcons(); }
        };
        window.fecharModal = (id) => { 
            const m = document.getElementById(id); 
            if(m) { m.style.display = 'none'; m.classList.remove('active'); }
            // Reset do estado do modal de importação
            if(id === 'modal-importar-csv') {
                 document.getElementById('painel-upload').style.display = 'block';
                 document.getElementById('resultado-importacao-planilha').style.display = 'none';
                 const btn = document.getElementById('btn-executar-importacao');
                 if(btn) { btn.disabled = true; btn.innerHTML = 'Iniciar Análise'; }
                 const info = document.getElementById('nome-arquivo-csv');
                 if(info) info.style.display = 'none';
            }
        };
        window.abrirModalImportarCSV = () => window.abrirModal('modal-importar-csv');

        // Lógica de Navegação (Tabs)
        function setupTabNavigation() {
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.onclick = () => {
                    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
                    
                    // Lazy Loading Estratégico
                    if(btn.dataset.tab === 'marcos' && window.carregarMarcosLista) window.carregarMarcosLista();
                    if(btn.dataset.tab === 'propriedades' && window.carregarPropriedadesLista) window.carregarPropriedadesLista();
                    if(btn.dataset.tab === 'clientes' && window.carregarClientes) window.carregarClientes();
                    if(btn.dataset.tab === 'mapa' && window.map) setTimeout(()=>window.map.invalidateSize(), 100);
                };
            });
        }

        // --- MOTOR DE IMPORTAÇÃO CSV/EXCEL ---
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

            const isSimulacao = forcarProducao ? false : checkbox.checked;
            const formData = new FormData();
            formData.append('csvFile', fileInput.files[0]);
            formData.append('simulacao', isSimulacao);

            btn.disabled = true;
            btn.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Processando...';
            lucide.createIcons();

            try {
                const baseUrl = (window.API_URL || '').replace(/\\/$/, '');
                const res = await fetch(baseUrl + '/api/marcos/importar-csv', { method: 'POST', body: formData });
                const result = await res.json();

                if(result.sucesso) {
                    painelUpload.style.display = 'none';
                    resultDiv.style.display = 'block';
                    
                    const color = result.modo_simulacao ? 'blue' : 'green';
                    const title = result.modo_simulacao ? 'Simulação Concluída' : 'Importação Finalizada';
                    
                    resultDiv.innerHTML = \`
                        <div class="card" style="padding:20px; border-left:4px solid \${color};">
                            <h3 style="color:\${color}">\${title}</h3>
                            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; margin:15px 0; text-align:center;">
                                <div style="background:#f1f5f9; padding:10px; border-radius:4px;"><strong>TOTAL</strong><br>\${result.estatisticas.total}</div>
                                <div style="background:#dcfce7; padding:10px; border-radius:4px; color:#166534"><strong>VÁLIDOS</strong><br>\${result.estatisticas.validos}</div>
                                <div style="background:#fef3c7; padding:10px; border-radius:4px; color:#92400e"><strong>PENDENTES</strong><br>\${result.estatisticas.pendentes}</div>
                            </div>
                            <p>\${result.mensagem}</p>
                            \${result.modo_simulacao ? 
                                \`<button class="btn btn-primary" style="width:100%; margin-top:10px; background-color:#10B981" onclick="window.importarPlanilhaMarcos(null, true)"><i data-lucide="database"></i> Confirmar e Gravar</button>\` : 
                                \`<button class="btn btn-secondary" style="width:100%; margin-top:10px;" onclick="window.location.reload()">Concluir</button>\`
                            }
                        </div>
                    \`;
                    lucide.createIcons();
                } else {
                    throw new Error(result.erro || 'Erro no servidor');
                }
            } catch(err) {
                console.error(err);
                alert('Erro: ' + err.message);
                painelUpload.style.display = 'block';
            } finally {
                btn.disabled = false;
            }
        };

        // --- INICIALIZAÇÃO ---
        document.addEventListener('DOMContentLoaded', () => {
            if(typeof lucide!='undefined') lucide.createIcons();
            setupTabNavigation();
            
            if(!localStorage.getItem('theme')) localStorage.setItem('theme', 'light');
            document.documentElement.setAttribute('data-theme', localStorage.getItem('theme'));
            
            const busca = document.getElementById('busca-marcos');
            if(busca) busca.addEventListener('keydown', (e) => { if(e.key === 'Enter' && window.buscarMarcos) window.buscarMarcos(); });
        });

        window.buscarMarcos = () => { if(window.carregarMarcosLista) window.carregarMarcosLista(1); };
        window.exportarMarcosDXF = () => { window.location.href = (window.API_URL || '') + '/api/marcos/exportar-dxf'; };
        
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
    console.log('✅ SUCESSO: index.html reconstruído do zero com estrutura limpa e segura.');
} catch (err) {
    console.error('❌ ERRO CRÍTICO AO SALVAR:', err);
}
