const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../frontend/index.html');
console.log(`📝 Atualizando: ${targetFile}`);

let html = fs.readFileSync(targetFile, 'utf8');

// Adiciona o script do importador após script-poligonos.js
const oldScripts = '<script src="script-poligonos.js"></script>';
const newScripts = '<script src="script-poligonos.js"></script>\n    <script src="js/modules/importador.js"></script>';

if (html.includes('js/modules/importador.js')) {
    console.log('⚠️ Script já presente, pulando...');
} else if (html.includes(oldScripts)) {
    html = html.replace(oldScripts, newScripts);
    fs.writeFileSync(targetFile, html, 'utf8');
    console.log('✅ Script importador.js adicionado ao index.html!');
} else {
    console.error('❌ Não encontrou script-poligonos.js para inserir após.');
}
