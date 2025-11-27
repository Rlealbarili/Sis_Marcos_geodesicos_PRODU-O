const fs = require('fs');

console.log('📝 Iniciando modificação do HTML...');

let html = fs.readFileSync('frontend/analise-fundiaria-backup.html', 'utf8');

console.log(`📄 HTML lido: ${(html.length / 1024).toFixed(1)}KB`);

// 1. Adicionar script car-layers.js BEFORE Leaflet
console.log('1️⃣ Adicionando script car-layers.js...');
html = html.replace(
    '    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>',
    '    <script src="car-layers.js"></script>\r\n    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
);

// 2. Remover CSS .map-legend
console.log('2️⃣ Removendo CSS .map-legend...');
const mapLegendCssStart = html.indexOf('.map-legend {');
if (mapLegendCssStart > 0) {
    const legendColorEnd = html.indexOf('}', html.indexOf('.legend-color {')) + 1;
    html = html.substring(0, mapLegendCssStart) + html.substring(legendColorEnd);
    console.log('   ✅ CSS removido');
}

// 3. Remover div.map-legend HTML
console.log('3️⃣ Removendo div.map-legend HTML...');
const mapLegendHtmlStart = html.indexOf('<div class="map-legend">');
if (mapLegendHtmlStart > 0) {
    // Encontrar o fechamento apropriado
    let depth = 1;
    let pos = mapLegendHtmlStart + '<div class="map-legend">'.length;
    while (depth > 0 && pos < html.length) {
        if (html.substring(pos, pos + 4) === '<div') depth++;
        if (html.substring(pos, pos + 6) === '</div>') {
            depth--;
            if (depth === 0) {
                // Remove desde o início até o fim da tag + whitespace
                const endPos = html.indexOf('>', pos) + 1;
                // Remove também linhas vazias e espaços antes
                let startPos = mapLegendHtmlStart;
                while (startPos > 0 && (html[startPos - 1] === ' ' || html[startPos - 1] === '\r' || html[startPos - 1] === '\n')) {
                    startPos--;
                }
                html = html.substring(0, startPos) + html.substring(endPos);
                console.log('   ✅ HTML removido');
                break;
            }
        }
        pos++;
    }
}

// 4. Adicionar verificação CAR na função executarAnalise
console.log('4️⃣ Adicionando vericação CAR...');
html = html.replace(
    'await carregarNoMapa(propriedadeId, resultado);',
    `await carregarNoMapa(propriedadeId, resultado);\r\n\r\n                // Verificar camadas CAR disponíveis\r\n                await verificarCamadasCAR(propriedadeId);`
);

// Salvar
fs.writeFileSync('frontend/analise-fundiaria.html', html, 'utf8');
console.log('✅ Arquivo HTML atualizado com sucesso!');

// Verificações
const hasCarScript = html.includes('car-layers.js');
const hasMapLegendCss = html.includes('.map-legend {');
const hasMapLegendHtml = html.includes('<div class="map-legend">');
const hasVerifyCAR = html.includes('verificarCamadasCAR');

console.log('\n📊 Verificações:');
console.log(`   Script CAR: ${hasCarScript ? '✅' : '❌'}`);
console.log(`   CSS removido: ${!hasMapLegendCss ? '✅' : '❌'}`);
console.log(`   HTML removido: ${!hasMapLegendHtml ? '✅' : '❌'}`);
console.log(`   Função CAR: ${hasVerifyCAR ? '✅' : '❌'}`);
