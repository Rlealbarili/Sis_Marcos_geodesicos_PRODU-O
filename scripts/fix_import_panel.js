const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../frontend/index.html');
console.log(`📝 Atualizando painel de importação: ${targetFile}`);

let html = fs.readFileSync(targetFile, 'utf8');

// HTML antigo (simples)
const oldPanel = `<div id="panel-importar" class="content-panel">
                    <div style="padding: 40px; text-align: center;">
                        <h2>Importar Memorial (DOCX)</h2>
                        <div id="upload-area-docx" class="upload-area" style="margin-top:20px; cursor:pointer; border:2px dashed #ccc; padding:40px;">
                            <i data-lucide="file-text" style="width:48px;height:48px;"></i>
                            <h3>Clique para Selecionar DOCX</h3>
                            <input type="file" id="file-input-docx" accept=".docx" style="display:none;">
                        </div>
                    </div>
                </div>`;

// HTML novo (completo com todos os elementos que o módulo espera)
const newPanel = `<div id="panel-importar" class="content-panel">
                    <div style="padding: 40px; max-width: 600px; margin: 0 auto;">
                        <h2 style="text-align: center; margin-bottom: 30px;">
                            <i data-lucide="file-text" style="width:32px;height:32px;vertical-align:middle;margin-right:10px;"></i>
                            Importar Memorial Descritivo
                        </h2>
                        
                        <!-- Área de Upload (inicial) -->
                        <div id="upload-area-docx" class="upload-area" style="cursor:pointer; border:2px dashed var(--border-primary); padding:50px; border-radius:12px; text-align:center; background:var(--bg-secondary); transition: all 0.3s;">
                            <i data-lucide="upload-cloud" style="width:64px;height:64px;color:var(--cogep-green);margin-bottom:15px;"></i>
                            <h3 style="margin:0 0 10px 0;">Clique para Selecionar DOCX</h3>
                            <p style="color:var(--text-secondary);margin:0;">ou arraste o arquivo aqui</p>
                            <p style="font-size:12px;color:var(--text-tertiary);margin-top:15px;">Formatos aceitos: .DOC, .DOCX</p>
                            <input type="file" id="file-input-docx" accept=".doc,.docx" style="display:none;">
                        </div>
                        
                        <!-- Área de Preview (após seleção) -->
                        <div id="preview-area-docx" style="display:none; border:1px solid var(--border-primary); padding:30px; border-radius:12px; text-align:center; background:var(--bg-secondary);">
                            <i data-lucide="file-check" style="width:48px;height:48px;color:var(--cogep-green);margin-bottom:15px;"></i>
                            <h3 id="file-name-docx" style="margin:0 0 10px 0;">arquivo.docx</h3>
                            <p style="color:var(--text-secondary);margin:0;">Pronto para processamento</p>
                        </div>
                        
                        <!-- Área de Status/Feedback -->
                        <div id="docx-status" style="margin-top:20px;"></div>
                        
                        <!-- Informações -->
                        <div style="margin-top:30px; padding:20px; background:var(--bg-tertiary); border-radius:8px; font-size:14px;">
                            <h4 style="margin:0 0 10px 0; display:flex; align-items:center; gap:8px;">
                                <i data-lucide="info" style="width:18px;height:18px;"></i>
                                O que será extraído:
                            </h4>
                            <ul style="margin:0; padding-left:20px; color:var(--text-secondary);">
                                <li>Coordenadas UTM/Geográficas dos vértices</li>
                                <li>Nome da propriedade e confrontantes</li>
                                <li>Geometria do polígono para visualização no mapa</li>
                            </ul>
                        </div>
                    </div>
                </div>`;

if (html.includes('preview-area-docx')) {
    console.log('⚠️ Painel já atualizado, pulando...');
} else if (html.includes('panel-importar')) {
    html = html.replace(oldPanel, newPanel);
    fs.writeFileSync(targetFile, html, 'utf8');
    console.log('✅ Painel de importação atualizado com estrutura completa!');
} else {
    console.error('❌ Não encontrou panel-importar para substituir.');
}
