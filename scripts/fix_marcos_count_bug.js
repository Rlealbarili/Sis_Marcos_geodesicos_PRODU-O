const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../backend/routes/marcos.js');
console.log(`📝 Corrigindo bug de contagem: ${targetFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// Bloco problemático (usa sqlQuery ao invés de countSql)
const buggyBlock = `        // Contar total para paginação
        const countSql = 'SELECT COUNT(*) as total FROM marcos_levantados WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;

        if (tipo && tipo !== 'todos') {
            sqlQuery += \` AND tipo = \$\${countParamIndex}\`;
            countParams.push(tipo);
            countParamIndex++;
        }

        if (municipio) {
            sqlQuery += \` AND municipio ILIKE \$\${countParamIndex}\`;
            countParams.push(\`%\${municipio}%\`);
            countParamIndex++;
        }

        if (estado) {
            sqlQuery += \` AND estado = \$\${countParamIndex}\`;
            countParams.push(estado);
            countParamIndex++;
        }

        if (status) {
            sqlQuery += \` AND validado = \$\${countParamIndex}\`;
            countParams.push(status === 'true');
            countParamIndex++;
        }

        if (busca) {
            sqlQuery += \` AND (codigo ILIKE \$\${countParamIndex} OR localizacao ILIKE \$\${countParamIndex} OR observacoes ILIKE \$\${countParamIndex})\`;
            countParams.push(\`%\${busca}%\`);
            countParamIndex++;
        }

        const countResult = await query(countSql, countParams);`;

// Bloco corrigido (usa countSql)
const fixedBlock = `        // Contar total para paginação (COM FILTROS)
        let countSql = 'SELECT COUNT(*) as total FROM marcos_levantados WHERE 1=1';
        const countParams = [];
        let countParamIndex = 1;

        if (tipo && tipo !== 'todos') {
            countSql += \` AND tipo = \$\${countParamIndex}\`;
            countParams.push(tipo);
            countParamIndex++;
        }

        if (municipio) {
            countSql += \` AND municipio ILIKE \$\${countParamIndex}\`;
            countParams.push(\`%\${municipio}%\`);
            countParamIndex++;
        }

        if (estado) {
            countSql += \` AND estado = \$\${countParamIndex}\`;
            countParams.push(estado);
            countParamIndex++;
        }

        if (status) {
            countSql += \` AND validado = \$\${countParamIndex}\`;
            countParams.push(status === 'true');
            countParamIndex++;
        }

        if (busca) {
            countSql += \` AND (codigo ILIKE \$\${countParamIndex} OR localizacao ILIKE \$\${countParamIndex} OR observacoes ILIKE \$\${countParamIndex})\`;
            countParams.push(\`%\${busca}%\`);
            countParamIndex++;
        }

        const countResult = await query(countSql, countParams);`;

if (content.includes(buggyBlock)) {
    content = content.replace(buggyBlock, fixedBlock);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('✅ Bug corrigido! Agora countSql usa os filtros corretamente.');
} else {
    console.log('⚠️ Bloco exato não encontrado. Tentando correção parcial...');

    // Correção parcial - substituir cada ocorrência errada
    let fixed = false;

    // Procura por linhas com o padrão errado e corrige
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        // Verifica se estamos na seção de contagem (após "Contar total para paginação")
        if (i > 70 && i < 110) {
            if (lines[i].includes('sqlQuery +=') && lines[i].includes('countParamIndex')) {
                lines[i] = lines[i].replace('sqlQuery +=', 'countSql +=');
                fixed = true;
            }
        }
    }

    if (fixed) {
        content = lines.join('\n');

        // Também muda const countSql para let countSql
        content = content.replace(
            "const countSql = 'SELECT COUNT(*) as total FROM marcos_levantados WHERE 1=1';",
            "let countSql = 'SELECT COUNT(*) as total FROM marcos_levantados WHERE 1=1';"
        );

        fs.writeFileSync(targetFile, content, 'utf8');
        console.log('✅ Bug corrigido via substituição linha a linha!');
    } else {
        console.error('❌ Não foi possível corrigir o bug automaticamente.');
    }
}
