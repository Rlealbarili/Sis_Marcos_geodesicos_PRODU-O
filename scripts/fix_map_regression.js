const fs = require('fs');
const path = require('path');
const targetFile = path.join(__dirname, '../frontend/index.html');

console.log(`🏗️ EXECUTANDO FIX MAPA REGRESSION EM: ${targetFile}`);

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

    <!-- Libs -->
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
        
        .sidebar-menu { display: flex; flex-direction: column; padding: 10px; gap: 5px; }
        .sidebar { width: 275px; height: 100vh; position: fixed; left: 0; top: 0; background: var(--bg-secondary); border-right: 1px solid var(--border-primary); z-index: 1001; transition: transform 0.3s ease; }
        .sidebar-header { padding: 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-primary); }
        .sidebar-logo-text { font-weight: bold; font-size: 1.2rem; color: var(--text-primary); }
        
        .nav-link { 
            display: flex; align-items: center; gap: 12px; padding: 12px 16px; 
            color: var(--text-secondary); text-decoration: none; border-radius: 8px; 
            transition: all 0.2s; font-weight: 500; 
        }
        .nav-link:hover { background-color: var(--bg-hover); color: var(--text-primary); }
        .nav-link.active { background-color: var(--cogep-green-light); color: var(--cogep-green); }
        .nav-link i { width: 20px; height: 20px; }

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

        .content-body { flex: 1; position: relative; overflow-y: auto; }
        
        /* 1. CORREÇÃO CSS: Blindagem de Altura do Mapa */
        #map, .map-container {
            height: 85vh !important;
            width: 100%;
            min-height: 500px;
            display: block;
        }
        
        .tab-content { display: none; height: 100%; }
        .tab-content.active { display: block; animation: fadeIn 0.3s ease; }

        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 2000; justify-content: center; align-items: center; }
        .modal.active { display: flex; }
        
        .menu-toggle-btn { display: none; position: fixed; top: 15px; right: 15px; z-index: 1002; }
        @media (max-width: 1024px) { 
            .menu-toggle-btn { display: block; } 
            .sidebar { transform: translateX(-100%); }
            .sidebar.active { transform: translateX(0); }
        }
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
            
            <div class="sidebar-menu">
                <a href="#" class="nav-link" data-view="mapa">
                     <i data-lucide="map"></i> <span>Mapa</span>
                </a>
                <a href="#" class="nav-link" data-view="marcos">
                    <i data-lucide="map-pin"></i> <span>Marcos</span>
                </a>
                <a href="#" class="nav-link" data-view="importar">
                    <i data-lucide="upload"></i> <span>Importar</span>
                </a>
                <a href="#" class="nav-link" data-view="propriedades">
                    <i data-lucide="home"></i> <span>Propriedades</span>
                </a>
                <a href="#" class="nav-link" data-view="clientes">
                    <i data-lucide="users"></i> <span>Clientes</span>
                </a>
                <a href="#" class="nav-link" data-view="historico">
                    <i data-lucide="clock"></i> <span>Histórico</span>
                </a>
            </div>

            <div style="padding: 20px; border-top: 1px solid var(--border-primary); margin-top: auto;">
                <button class="theme-toggle" id="theme-btn"><i data-lucide="moon"></i></button>
            </div>
        </aside>

        <main class="main-content">
             <button class="menu-toggle-btn btn btn-secondary" id="mobile-menu-btn">
                <i data-lucide="menu"></i>
            </button>

            <div class="stats-grid">
                <div class="stat-card">
                    <i data-lucide="map-pin" style="color: var(--cogep-green)"></i>
                    <div><div class="stat-value" id="stat-marcos">0</div><div class="stat-label">Marcos</div></div>
                </div>
                <div class="stat-card">
                    <i data-lucide="check-circle" style="color: #10B981"></i>
                    <div><div class="stat-value" id="stat-levantados">0</div><div class="stat-label">Levantados</div></div>
                </div>
                 <div class="stat-card">
                    <i data-lucide="building-2" style="color: #3B82F6"></i>
                    <div><div class="stat-value" id="stat-propriedades">0</div><div class="stat-label">Propriedades</div></div>
                </div>
                 <div class="stat-card">
                    <i data-lucide="users" style="color: #F59E0B"></i>
                    <div><div class="stat-value" id="stat-clientes">0</div><div class="stat-label">Clientes</div></div>
                </div>
            </div>

            <div class="content-body">
                <div id="mapa" class="tab-content active">
                    <div id="map"></div>
                </div>
                
                <div id="marcos" class="tab-content">
                    <div style="padding: 20px;">
                        <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                            <h2>Gerenciar Marcos</h2>
                            <button class="btn btn-primary" id="btn-novo-marco">Novo Marco</button>
                            <button class="btn btn-secondary" id="btn-import-csv">Importar CSV</button>
                        </div>
                        <div style="margin-bottom:20px; display:flex; gap:10px;">
                            <input type="text" id="busca-marcos" class="input" placeholder="Buscar..." style="flex:1;">
                            <button class="btn btn-secondary" id="btn-buscar-marcos">Buscar</button>
                        </div>
                        <div id="marcos-grid" style="display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));"></div>
                        <div id="marcos-pagination" style="margin-top: 20px; text-align: center;"></div>
                    </div>
                </div>

                <div id="importar" class="tab-content">
                    <div style="padding: 40px; text-align: center;">
                        <h2>Importar Memorial (DOCX)</h2>
                        <div id="upload-area-docx" class="upload-area" style="margin-top:20px; cursor:pointer; border:2px dashed #ccc; padding:40px;">
                            <i data-lucide="file-text" style="width:48px;height:48px;"></i>
                            <h3>Clique para Selecionar DOCX</h3>
                            <input type="file" id="file-input-docx" accept=".docx" style="display:none;">
                        </div>
                        <div id="preview-area-docx" style="display:none; margin-top:20px;"></div>
                    </div>
                </div>

                <div id="propriedades" class="tab-content">
                    <div style="padding: 20px;">
                         <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                            <h2>Propriedades</h2>
                            <button class="btn btn-primary" id="btn-nova-prop">Nova Propriedade</button>
                         </div>
                         <div id="propriedades-grid"></div>
                    </div>
                </div>
                
                <div id="clientes" class="tab-content">
                     <div style="padding: 20px;">
                         <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                            <h2>Clientes</h2>
                            <button class="btn btn-primary" id="btn-novo-cliente">Novo Cliente</button>
                         </div>
                         <div id="clientes-grid"></div>
                    </div>
                </div>
                
                <div id="historico" class="tab-content">
                    <div style="padding: 20px;">
                        <h2>Histórico</h2>
                        <div id="lista-historico"></div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Modals -->
    <div id="modal-importar-csv" class="modal">
        <div class="modal-backdrop"></div>
        <div class="modal-container">
            <div class="modal-header"><h2>Importar CSV</h2><button class="btn-icon close-modal">×</button></div>
            <div class="modal-body">
                <div id="painel-upload">
                    <div class="upload-area" id="drop-zone-csv" style="padding:40px; border:2px dashed #ccc; text-align:center;">
                        <p>Selecionar Arquivo</p>
                        <input type="file" id="file-input-importar" accept=".csv,.xlsx" style="display:none;">
                    </div>
                    <div id="nome-arquivo-csv" style="display:none; margin-top:20px;"></div>
                    <div style="margin-top:20px;">
                         <label><input type="checkbox" id="check-simulacao" checked> Modo Simulação</label>
                    </div>
                </div>
                <div id="resultado-importacao-planilha" style="display:none;"></div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary close-modal">Cancelar</button>
                <button class="btn btn-primary" id="btn-executar-importacao" disabled>Iniciar</button>
            </div>
        </div>
    </div>
    
    <div id="modal-novo-marco" class="modal"><div class="modal-backdrop"></div><div class="modal-container"><div class="modal-header"><h2>Novo Marco</h2><button class="btn-icon close-modal">×</button></div><div class="modal-body"><form id="form-novo-marco"><div class="form-group"><label>Código</label><input type="text" id="marco-codigo" class="input"></div></form></div><div class="modal-footer"><button class="btn btn-primary" id="btn-salvar-marco">Salvar</button></div></div></div>
    <div id="modal-nova-propriedade" class="modal"><div class="modal-backdrop"></div><div class="modal-container"><div class="modal-header"><h2>Nova Propriedade</h2><button class="btn-icon close-modal">×</button></div><div class="modal-body"><form id="form-nova-propriedade"><div class="form-group"><label>Nome</label><input type="text" id="prop-nome" class="input"></div></form></div><div class="modal-footer"><button class="btn btn-primary" id="btn-salvar-prop">Salvar</button></div></div></div>
    <div id="modal-novo-cliente" class="modal"><div class="modal-backdrop"></div><div class="modal-container"><div class="modal-header"><h2>Novo Cliente</h2><button class="btn-icon close-modal">×</button></div><div class="modal-body"><form id="form-novo-cliente"><div class="form-group"><label>Nome</label><input type="text" id="cliente-nome" class="input"></div></form></div><div class="modal-footer"><button class="btn btn-primary" id="btn-salvar-cliente">Salvar</button></div></div></div>

    <div id="toast-container"></div>

    <script src="script.js"></script>
    <script src="script-poligonos.js"></script>

    <script>
        // ==========================================
        // JS PATCH: SINGLETON MAP INITIALIZATION
        // ==========================================
        
        // Variável de controle (Singleton)
        let mapaInicializado = false;

        document.addEventListener('DOMContentLoaded', () => {
            console.log("🛠️ Inicializando v3.1 (Map Fix)...");

            if(typeof lucide !== 'undefined') lucide.createIcons();

            const botoes = document.querySelectorAll('.nav-link[data-view]');
            const secoes = document.querySelectorAll('.tab-content');

            function ativarAba(idAlvo) {
                // 1. Esconde tudo
                secoes.forEach(sec => sec.style.display = 'none');
                secoes.forEach(sec => sec.classList.remove('active'));
                
                // 2. Mostra o alvo
                const alvo = document.getElementById(idAlvo);
                if (alvo) {
                    alvo.style.display = 'block';
                    alvo.classList.add('active');
                    console.log(\`✅ Aba ativa: \${idAlvo}\`);
                    
                    // --- MAP FIX: SINGLETON PATTERN ---
                    if (idAlvo === 'mapa') {
                        if (!mapaInicializado && typeof window.carregarMapa === 'function') {
                            window.carregarMapa();
                            mapaInicializado = true;
                        } else if (window.map && typeof window.map.invalidateSize === 'function') {
                            setTimeout(() => { window.map.invalidateSize(); }, 200);
                        }
                    }
                    // ----------------------------------

                    if (idAlvo === 'marcos' && window.carregarMarcosLista) window.carregarMarcosLista();
                    if (idAlvo === 'propriedades' && window.carregarPropriedadesLista) window.carregarPropriedadesLista();
                    if (idAlvo === 'clientes' && window.carregarClientes) window.carregarClientes();
                } else {
                    console.error(\`❌ Erro: Seção #\${idAlvo} não encontrada no HTML.\`);
                }
            }

            // Event Listeners
            botoes.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    botoes.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    ativarAba(btn.getAttribute('data-view'));
                });
            });

            // Modal & Global Listeners
            document.body.addEventListener('click', (e) => {
                const target = e.target;
                if (target.classList.contains('modal-backdrop') || target.closest('.close-modal')) {
                    const modal = target.closest('.modal');
                    if(modal) modal.style.display = 'none';
                }
                if (target.matches('#btn-novo-marco') || target.closest('#btn-novo-marco')) {
                    const m = document.getElementById('modal-novo-marco'); if(m) m.style.display = 'flex';
                }
                if (target.matches('#btn-import-csv') || target.closest('#btn-import-csv')) {
                     const m = document.getElementById('modal-importar-csv'); if(m) m.style.display = 'flex';
                }
                if (target.matches('#btn-nova-prop') || target.closest('#btn-nova-prop')) {
                     const m = document.getElementById('modal-nova-propriedade'); if(m) m.style.display = 'flex';
                }
                 if (target.matches('#btn-novo-cliente') || target.closest('#btn-novo-cliente')) {
                     const m = document.getElementById('modal-novo-cliente'); if(m) m.style.display = 'flex';
                }
                if (target.matches('#drop-zone-csv') || target.closest('#drop-zone-csv')) {
                    document.getElementById('file-input-importar').click();
                }
                 if (target.closest('#mobile-menu-btn')) {
                    document.querySelector('.sidebar').classList.toggle('active');
                }
                if (target.closest('#theme-btn')) {
                    const current = document.documentElement.getAttribute('data-theme');
                    const next = current === 'dark' ? 'light' : 'dark';
                    document.documentElement.setAttribute('data-theme', next);
                    localStorage.setItem('theme', next);
                }
            });
            
             const fileInputCsv = document.getElementById('file-input-importar');
            if(fileInputCsv) {
                fileInputCsv.addEventListener('change', function() { if(this.files && this.files[0]) if(window.csvSelecionado) window.csvSelecionado(this); });
            }
            const btnExec = document.getElementById('btn-executar-importacao');
            if(btnExec) {
                btnExec.addEventListener('click', () => { if(window.importarPlanilhaMarcos) window.importarPlanilhaMarcos(); });
            }
            const docxArea = document.getElementById('upload-area-docx');
             if(docxArea) docxArea.addEventListener('click', () => document.getElementById('file-input-docx').click());
             const fileInputDocx = document.getElementById('file-input-docx');
             if(fileInputDocx) fileInputDocx.addEventListener('change', (e) => { if(window.handleFileSelectDOCX) window.handleFileSelectDOCX(e); });
        });
    </script>
</body>
</html>`;

try {
    fs.writeFileSync(targetFile, htmlContent, 'utf8');
    console.log('✅ SUCESSO: index.html corrigido (Fix Mapa V3.1)');
} catch (err) {
    console.error('❌ ERRO AO SALVAR:', err);
}
