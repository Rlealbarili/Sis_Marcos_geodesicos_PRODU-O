const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'analise-fundiaria.html');
const backupPath = path.join(__dirname, 'analise-fundiaria-backup.html');

console.log('🔧 Iniciando reparo do frontend...');

// Função para corrigir encoding
function fixEncoding(content) {
    // Verifica se parece estar "duplo codificado" (UTF-8 lido como Latin-1 e salvo novamente como UTF-8)
    // Padrões comuns: Ã¡ (á), Ã£ (ã), Ã§ (ç), Ã© (é), Ã³ (ó), Ãª (ê)
    // Emojis também ficam quebrados, ex: ðŸ (parte de emoji)

    if (content.includes('Ã¡') || content.includes('Ã£') || content.includes('ðŸ')) {
        console.log('⚠️ Detectado encoding quebrado (UTF-8 -> Latin1). Tentando corrigir...');
        try {
            // A mágica: converter string para buffer assumindo que os caracteres são bytes Latin1,
            // e depois ler esse buffer como UTF-8.
            const buffer = Buffer.from(content, 'binary'); // 'binary' é alias para 'latin1' no Node
            const fixed = buffer.toString('utf8');

            // Verificar se melhorou
            if (fixed.includes('á') || fixed.includes('ã') || fixed.includes('✅')) {
                console.log('✅ Encoding corrigido com sucesso!');
                return fixed;
            } else {
                console.log('⚠️ Correção automática não pareceu funcionar. Mantendo original.');
                return content;
            }
        } catch (e) {
            console.error('❌ Erro ao tentar corrigir encoding:', e);
            return content;
        }
    }
    console.log('ℹ️ Encoding parece estar OK (ou não detectado padrão comum).');
    return content;
}

try {
    // 1. Ler arquivo atual
    let content = fs.readFileSync(htmlPath, 'utf8');
    console.log(`📄 Lido ${content.length} caracteres.`);

    // 2. Corrigir Encoding
    content = fixEncoding(content);

    // 3. Garantir Script CAR
    const scriptTag = '<script src="car-layers.js"></script>';
    if (!content.includes('car-layers.js')) {
        console.log('➕ Adicionando script car-layers.js...');
        // Adicionar antes do Leaflet ou no final do head/body
        if (content.includes('<script src="https://unpkg.com/leaflet')) {
            content = content.replace(
                '<script src="https://unpkg.com/leaflet',
                `${scriptTag}\n    <script src="https://unpkg.com/leaflet`
            );
        } else {
            content = content.replace('</body>', `    ${scriptTag}\n</body>`);
        }
    } else {
        console.log('✅ Script car-layers.js já presente.');
    }

    // 4. Garantir chamada verificarCamadasCAR
    if (!content.includes('verificarCamadasCAR(propriedadeId)')) {
        console.log('➕ Adicionando chamada verificarCamadasCAR...');
        const searchStr = 'await carregarNoMapa(propriedadeId, resultado);';
        const replaceStr = `await carregarNoMapa(propriedadeId, resultado);\n\n                // Verificar camadas CAR disponíveis\n                if (typeof verificarCamadasCAR === 'function') {\n                    await verificarCamadasCAR(propriedadeId);\n                } else {\n                    console.error('Função verificarCamadasCAR não encontrada!');\n                }`;

        if (content.includes(searchStr)) {
            content = content.replace(searchStr, replaceStr);
        } else {
            console.warn('⚠️ Não foi possível encontrar o local para inserir verificarCamadasCAR.');
        }
    } else {
        console.log('✅ Chamada verificarCamadasCAR já presente.');
    }

    // 5. Remover controle de camadas redundante (map-legend)
    // O CSS .map-legend e o HTML div.map-legend
    // Vamos usar regex simples para remover o bloco HTML específico

    // Remover CSS se existir
    // (Simplificado para não quebrar se não achar exato, mas vamos tentar limpar o bloco específico)
    /*
        .map-legend {
            position: absolute;
            bottom: 30px;
            ...
        }
    */
    // Melhor não remover CSS via regex complexo para não quebrar. Vamos focar no HTML.

    // Remover HTML div class="map-legend"
    const mapLegendRegex = /<div class="map-legend">[\s\S]*?<\/div>\s*<\/div>/; // O último </div> fecha o map-container? Cuidado.
    // O HTML mostra:
    /*
         <div class="map-container">
             <div id="map"></div>
 
             <div class="map-legend">
                 ...
             </div>
         </div>
    */
    // Vamos tentar remover apenas o div map-legend
    const legendStart = content.indexOf('<div class="map-legend">');
    if (legendStart !== -1) {
        let legendEnd = content.indexOf('</div>', legendStart);
        // Precisamos achar o fechamento correto. Como é aninhado...
        // O conteúdo interno tem divs.
        // Vamos contar divs.
        let depth = 1;
        let pos = legendStart + '<div class="map-legend">'.length;
        while (depth > 0 && pos < content.length) {
            const nextDiv = content.indexOf('<div', pos);
            const nextClose = content.indexOf('</div>', pos);

            if (nextClose === -1) break; // Erro

            if (nextDiv !== -1 && nextDiv < nextClose) {
                depth++;
                pos = nextDiv + 4;
            } else {
                depth--;
                pos = nextClose + 6;
            }
        }

        if (depth === 0) {
            const legendHTML = content.substring(legendStart, pos);
            console.log('➖ Removendo controle de camadas redundante (HTML)...');
            content = content.replace(legendHTML, '');
        }
    }

    // 6. Salvar
    fs.writeFileSync(htmlPath, content, 'utf8');
    console.log('💾 Arquivo salvo com sucesso!');

} catch (err) {
    console.error('❌ Erro fatal:', err);
}
