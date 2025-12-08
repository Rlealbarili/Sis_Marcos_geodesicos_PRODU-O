const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../frontend/index.html');

console.log(`🔬 INICIANDO AUDITORIA PROFUNDA EM: ${targetFile}`);

try {
    if (!fs.existsSync(targetFile)) {
        throw new Error("Arquivo não encontrado!");
    }

    const content = fs.readFileSync(targetFile, 'utf8');
    const lines = content.split('\n');
    console.log(`📄 Total de Linhas: ${lines.length}`);

    // 1. BUSCA POR MARCADORES ESTRUTURAIS (Duplicatas)
    const markers = [
        '<!DOCTYPE html>',
        '<html',
        '</html>',
        '<body',
        '</body>',
        'function importarPlanilhaMarcos', // Função chave
        'window.AppState ='                 // Estado global
    ];

    console.log('\n--- 🏗️ ANÁLISE DE DUPLICIDADE ---');
    let hasDuplication = false;
    markers.forEach(marker => {
        // Regex para contar ocorrências ignorando case e espaços extras
        const regex = new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        const count = (content.match(regex) || []).length;

        if (count > 1) {
            console.error(`❌ DUPLICIDADE CRÍTICA: "${marker}" encontrado ${count} vezes!`);
            hasDuplication = true;

            // Mostrar linhas onde ocorrem
            let match;
            let lineNums = [];
            const linesArr = content.split('\n');
            linesArr.forEach((line, idx) => {
                if (line.toLowerCase().includes(marker.toLowerCase())) lineNums.push(idx + 1);
            });
            console.log(`   📍 Linhas: ${lineNums.join(', ')}`);
        } else if (count === 1) {
            console.log(`✅ "${marker}": 1 ocorrência (Correto).`);
        } else {
            console.warn(`⚠️ "${marker}": NÃO ENCONTRADO.`);
        }
    });

    if (hasDuplication) {
        console.log('\n🚨 DIAGNÓSTICO: O arquivo contém múltiplas cópias de si mesmo ou de seções.');
        console.log('   Recomendação: Executar script de "Reset Total" para reescrever o arquivo do zero.');
    } else {
        console.log('\n✅ DIAGNÓSTICO: Nenhuma duplicação estrutural óbvia detectada.');
    }

    // 2. ANÁLISE DE SINTAXE JS (Busca rápida por erros comuns)
    console.log('\n--- 💻 VARREDURA DE SINTAXE ---');
    // Verificar fechamento de scripts
    const openScript = (content.match(/<script/g) || []).length;
    const closeScript = (content.match(/<\/script>/g) || []).length;

    if (openScript !== closeScript) {
        console.error(`❌ DESBALANÇO DE SCRIPTS: Abertos ${openScript} vs Fechados ${closeScript}`);
    } else {
        console.log(`✅ Tags de script balanceadas: ${openScript}`);
    }

} catch (err) {
    console.error("❌ Falha na auditoria:", err.message);
}
