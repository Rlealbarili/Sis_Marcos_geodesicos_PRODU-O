const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targetFile = path.join(__dirname, '../frontend/index.html');

console.log(`🔍 INICIANDO AUDITORIA TÁTICA EM: ${targetFile}`);

try {
    const content = fs.readFileSync(targetFile, 'utf8');
    const lines = content.split('\n');
    console.log(`📄 Total de Linhas: ${lines.length}`);

    // 1. AUDITORIA DE ESTRUTURA (TAGS)
    console.log('\n--- 🏗️ ESTRUTURA HTML ---');
    const countOpenDiv = (content.match(/<div/g) || []).length;
    const countCloseDiv = (content.match(/<\/div>/g) || []).length;
    console.log(`Divs Abertas: ${countOpenDiv} | Divs Fechadas: ${countCloseDiv}`);
    if (countOpenDiv !== countCloseDiv) {
        console.error(`❌ DESBALANÇO CRÍTICO: Diferença de ${Math.abs(countOpenDiv - countCloseDiv)} divs!`);
    } else {
        console.log('✅ Estrutura de DIVs balanceada.');
    }

    // 2. AUDITORIA DE JAVASCRIPT (SINTAXE)
    console.log('\n--- 💻 SINTAXE JAVASCRIPT ---');

    // Regex para capturar scripts, mantendo controle de linhas
    // Nota: Isso é uma aproximação. Scripts muito complexos podem precisar de parser real.
    let scriptMatches = [];
    let regex = /<script[^>]*>([\s\S]*?)<\/script>/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        // Calcular linha inicial do script
        const code = match[1];
        const textUntilMatch = content.substring(0, match.index);
        const startLine = textUntilMatch.split('\n').length;

        try {
            // Tenta compilar o código para achar erros de sintaxe
            new vm.Script(code);
            console.log(`✅ Script na linha ${startLine}: OK`);
        } catch (e) {
            console.error(`❌ ERRO FATAL NO SCRIPT (Início linha ${startLine}):`);
            // Tentar localizar a linha relativa do erro
            if (e.stack) {
                // O stack do vm geralmente não dá a linha correta relativa ao arquivo todo,
                // mas dá a linha relativa ao bloco. Vamos tentar extrair.
                console.error(`   Mensagem: ${e.message}`);
                console.error(`   Dica: Verifique o código entre as linhas ${startLine} e ${startLine + code.split('\n').length}`);
            }
        }
    }

    // 3. AUDITORIA DE CARACTERES PERIGOSOS
    console.log('\n--- ⚠️ CARACTERES DE RISCO ---');
    const backticks = (content.match(/`/g) || []).length;
    if (backticks % 2 !== 0) {
        console.error(`❌ PERIGO: Número ímpar de crases (\`) encontradas (${backticks}). Possível Template String não fechada!`);
    } else {
        console.log(`✅ Crases balanceadas (${backticks}).`);
    }

} catch (err) {
    console.error("Erro ao ler arquivo:", err.message);
}
