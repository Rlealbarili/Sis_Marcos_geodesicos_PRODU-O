const fs = require('fs');
const path = require('path');

// =============================================
// PARTE 1: Remover função duplicada do script.js
// =============================================
const scriptFile = path.join(__dirname, '../frontend/script.js');
console.log(`📝 Processando: ${scriptFile}`);

let scriptContent = fs.readFileSync(scriptFile, 'utf8');

// Localizar e remover a primeira função carregarMarcosLista (sem paginação)
// Ela está nas linhas ~4560-4640 aproximadamente
const funcaoSemPaginacao = `async function carregarMarcosLista() {
    try {
        console.log('📍 Carregando lista de marcos...');

        const container = document.getElementById('marcos-grid');
        if (!container) {
            console.warn('⚠️ Container marcos-grid não encontrado');
            return;
        }

        // Mostrar loading
        container.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">Carregando marcos...</p>';

        const response = await fetch(\`\${API_URL}/api/marcos?limite=1000&levantados=true\`);`;

if (scriptContent.includes(funcaoSemPaginacao)) {
    console.log('🔍 Encontrada função duplicada sem paginação. Removendo...');

    // Encontrar início e fim da função duplicada
    const startIdx = scriptContent.indexOf(funcaoSemPaginacao);

    // Procurar o final da função (próximo "}" que aparece sozinho em linha)
    let endIdx = startIdx;
    let braceCount = 0;
    let insideFunction = false;

    for (let i = startIdx; i < scriptContent.length; i++) {
        if (scriptContent[i] === '{') {
            braceCount++;
            insideFunction = true;
        } else if (scriptContent[i] === '}') {
            braceCount--;
            if (insideFunction && braceCount === 0) {
                endIdx = i + 1;
                break;
            }
        }
    }

    // Remove a função duplicada
    const before = scriptContent.substring(0, startIdx);
    const after = scriptContent.substring(endIdx);

    // Remove também o comentário anterior se existir
    const commentStart = before.lastIndexOf('// ====================================');
    const cleanBefore = commentStart > before.length - 100 ? before.substring(0, commentStart) : before;

    scriptContent = cleanBefore + after;

    fs.writeFileSync(scriptFile, scriptContent, 'utf8');
    console.log('✅ Função duplicada removida do script.js!');
} else {
    console.log('⚠️ Função duplicada não encontrada (talvez já removida).');
}

// =============================================
// PARTE 2: Atualizar HTML com controles de paginação
// =============================================
const htmlFile = path.join(__dirname, '../frontend/index.html');
console.log(`📝 Processando: ${htmlFile}`);

let htmlContent = fs.readFileSync(htmlFile, 'utf8');

// HTML antigo da paginação (vazio)
const oldPagination = '<div id="marcos-pagination" style="margin-top: 20px; text-align: center;"></div>';

// HTML novo com controles completos
const newPagination = `<div id="marcos-pagination" style="margin-top: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
                            <div style="display: flex; justify-content: center; align-items: center; gap: 15px; flex-wrap: wrap;">
                                <button id="prev-page" onclick="paginaAnterior()" class="btn btn-secondary" style="min-width: 100px;">
                                    <i data-lucide="chevron-left" style="width:16px;height:16px;"></i> Anterior
                                </button>
                                <div style="display: flex; align-items: center; gap: 8px; font-size: 14px;">
                                    <span>Página</span>
                                    <span id="current-page" style="font-weight: 700; color: var(--cogep-green);">1</span>
                                    <span>de</span>
                                    <span id="total-pages" style="font-weight: 600;">1</span>
                                </div>
                                <button id="next-page" onclick="proximaPagina()" class="btn btn-secondary" style="min-width: 100px;">
                                    Próxima <i data-lucide="chevron-right" style="width:16px;height:16px;"></i>
                                </button>
                            </div>
                            <div style="text-align: center; margin-top: 10px; font-size: 13px; color: var(--text-secondary);">
                                Total: <span id="total-records" style="font-weight: 600;">0</span> marcos
                            </div>
                        </div>`;

if (htmlContent.includes(oldPagination)) {
    htmlContent = htmlContent.replace(oldPagination, newPagination);
    fs.writeFileSync(htmlFile, htmlContent, 'utf8');
    console.log('✅ Controles de paginação adicionados ao HTML!');
} else if (htmlContent.includes('prev-page')) {
    console.log('⚠️ Controles de paginação já existem no HTML.');
} else {
    console.error('❌ Não encontrou o elemento de paginação para substituir.');
}

console.log('\n🏁 Correção concluída!');
