const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../frontend/index.html');
const backupFile = path.join(__dirname, '../frontend/index.html.bak');

console.log(`🚑 INICIANDO CIRURGIA ESTRUTURAL EM: ${targetFile}`);

try {
    let content = fs.readFileSync(targetFile, 'utf8');

    // 1. Criar Backup de Segurança (Obrigatório)
    fs.writeFileSync(backupFile, content);
    console.log(`💾 Backup de segurança criado: ${backupFile}`);

    // 2. Algoritmo de Pilha para Remoção de Órfãos
    let fixedContent = '';
    let openDivs = 0;
    let removedCount = 0;
    let lastIndex = 0;

    // Regex para capturar todas as tags div (abertura e fechamento)
    // Case insensitive
    const regex = /<\/?div[^>]*>/gi;
    let match;

    while ((match = regex.exec(content)) !== null) {
        // Adiciona o conteúdo de texto entre as tags (preserva tudo)
        fixedContent += content.substring(lastIndex, match.index);

        const tag = match[0];
        const isClosing = tag.toLowerCase().startsWith('</div');

        if (isClosing) {
            if (openDivs > 0) {
                // Fechamento válido: tem um par aberto
                openDivs--;
                fixedContent += tag;
            } else {
                // Fechamento INVÁLIDO: não tem par aberto (Saldo seria negativo)
                console.warn(`🚩 Órfão detectado e removido na posição ${match.index}: ${tag}`);
                // Não adicionamos a tag ao fixedContent
                removedCount++;
            }
        } else {
            // Abertura: incrementa saldo
            openDivs++;
            fixedContent += tag;
        }

        lastIndex = regex.lastIndex;
    }

    // Adiciona o restante do arquivo após a última tag
    fixedContent += content.substring(lastIndex);

    // 3. Relatório Final
    console.log(`\n--- RELATÓRIO DE OPERAÇÃO ---`);
    console.log(`Tags '</div>' removidas: ${removedCount}`);
    console.log(`Saldo final de Divs Abertas: ${openDivs} (Ideal: 0)`);

    // 4. Gravação
    if (removedCount > 0) {
        fs.writeFileSync(targetFile, fixedContent, 'utf8');
        console.log(`✅ Arquivo corrigido salvo com sucesso!`);
    } else {
        console.log(`✅ Nenhuma tag órfã encontrada pela lógica de pilha.`);
    }

} catch (err) {
    console.error("❌ Falha crítica na operação:", err.message);
}
