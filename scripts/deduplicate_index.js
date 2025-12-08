const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../frontend/index.html');
const backupFile = path.join(__dirname, '../frontend/index.html.bak_dedup');

console.log(`🧹 INICIANDO LIMPEZA DE DUPLICATAS EM: ${targetFile}`);

try {
    let content = fs.readFileSync(targetFile, 'utf8');
    fs.writeFileSync(backupFile, content); // Backup

    // 1. CORREÇÃO DE DUPLICIDADE DE APPSTATE
    // Estratégia: Encontrar todas as definições de AppState, manter a última, comentar as anteriores.
    const appStateRegex = /window\.AppState\s*=\s*\{[\s\S]*?\};/g;
    let matches = [...content.matchAll(appStateRegex)];

    if (matches.length > 1) {
        console.log(`⚠️ Encontradas ${matches.length} definições de AppState. Mantendo a última.`);
        // Substituir todas, exceto a última, por comentário
        for (let i = 0; i < matches.length - 1; i++) {
            const match = matches[i];
            const replacement = `/* DUPLICATA REMOVIDA (AppState) */`;
            // Precisamos fazer replace manual cuidadoso para não alterar índices
            content = content.substring(0, match.index) +
                replacement +
                content.substring(match.index + match[0].length);

            // Recalcular regex após modificação (string mudou de tamanho)
            matches = [...content.matchAll(appStateRegex)];
            i--; // Voltar índice para reprocessar
        }
    }

    // 2. CORREÇÃO DE DESBALANÇO DE SCRIPTS
    // Contar tags
    const openScripts = (content.match(/<script/g) || []).length;
    const closeScripts = (content.match(/<\/script>/g) || []).length;

    if (closeScripts > openScripts) {
        const diff = closeScripts - openScripts;
        console.log(`⚠️ Detectados ${diff} fechamentos de script extras. Removendo do final.`);

        // Remove os últimos X fechamentos de script que não têm par
        let currentContent = content;
        for (let i = 0; i < diff; i++) {
            const lastIndex = currentContent.lastIndexOf('</script>');
            if (lastIndex !== -1) {
                currentContent = currentContent.substring(0, lastIndex) +
                    '' +
                    currentContent.substring(lastIndex + 9);
            }
        }
        content = currentContent;
    }

    // 3. REMOÇÃO DE FUNÇÕES DUPLICADAS (Ex: importarPlanilhaMarcos)
    // Se houver múltiplas definições de window.importarPlanilhaMarcos, mantém a última
    const funcRegex = /window\.importarPlanilhaMarcos\s*=\s*async\s*function/g;
    matches = [...content.matchAll(funcRegex)];
    if (matches.length > 1) {
        console.log(`⚠️ Encontradas ${matches.length} funções de importação. Mantendo a última.`);
        for (let i = 0; i < matches.length - 1; i++) {
            const match = matches[i];
            // FIX: Replace with modified name to avoid regex match loop and syntax errors
            const replacement = "// DUPLICATA_REMOVIDA: window.OLD_importarPlanilhaMarcos = async function";
            content = content.substring(0, match.index) +
                replacement +
                content.substring(match.index + match[0].length);
            matches = [...content.matchAll(funcRegex)];
            i--;
        }
    }

    // Gravar
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log(`✅ Limpeza concluída. Arquivo salvo.`);

} catch (err) {
    console.error("❌ Erro no script:", err);
}
