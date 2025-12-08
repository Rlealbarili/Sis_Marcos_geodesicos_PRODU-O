const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, '../frontend/index.html');
console.log(`📝 Adicionando event listeners de busca: ${htmlFile}`);

let content = fs.readFileSync(htmlFile, 'utf8');

// Encontrar onde adicionar os listeners (após o handler de fileInputDocx)
const insertPoint = `const docxArea = document.getElementById('upload-area-docx');
            if(docxArea) docxArea.addEventListener('click', () => document.getElementById('file-input-docx').click());`;

// Novos event listeners para busca de marcos
const searchListeners = `const docxArea = document.getElementById('upload-area-docx');
            if(docxArea) docxArea.addEventListener('click', () => document.getElementById('file-input-docx').click());
            
            // ========== BUSCA DE MARCOS ==========
            const buscaInput = document.getElementById('busca-marcos');
            const btnBuscar = document.getElementById('btn-buscar-marcos');
            
            // Busca ao clicar no botão
            if(btnBuscar) {
                btnBuscar.addEventListener('click', () => {
                    if(window.carregarMarcosLista) window.carregarMarcosLista(1);
                });
            }
            
            // Busca ao pressionar Enter no campo
            if(buscaInput) {
                buscaInput.addEventListener('keydown', (e) => {
                    if(e.key === 'Enter') {
                        e.preventDefault();
                        if(window.carregarMarcosLista) window.carregarMarcosLista(1);
                    }
                });
            }`;

if (content.includes('buscaInput')) {
    console.log('⚠️ Event listeners de busca já existem.');
} else if (content.includes(insertPoint)) {
    content = content.replace(insertPoint, searchListeners);
    fs.writeFileSync(htmlFile, content, 'utf8');
    console.log('✅ Event listeners de busca adicionados!');
} else {
    console.error('❌ Ponto de inserção não encontrado.');
}
