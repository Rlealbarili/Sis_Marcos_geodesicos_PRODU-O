// Script para medir o tempo de resposta das operações de análise
// Este script vai ajudar a quantificar a melhoria de performance após as otimizações

async function medirTempoOperacao(descricao, operacao) {
    const inicio = Date.now();
    console.log(`⏱️  Iniciando: ${descricao}`);
    
    try {
        const resultado = await operacao();
        const fim = Date.now();
        const duracao = fim - inicio;
        
        console.log(`✅ Concluído: ${descricao} - ${duracao}ms`);
        return {
            sucesso: true,
            duracao: duracao,
            resultado: resultado
        };
    } catch (error) {
        const fim = Date.now();
        const duracao = fim - inicio;
        
        console.error(`❌ Erro: ${descricao} - ${duracao}ms - ${error.message}`);
        return {
            sucesso: false,
            duracao: duracao,
            erro: error.message
        };
    }
}

// Medir tempo de resposta de diferentes endpoints
async function testePerformanceAnalise() {
    const propriedadeId = 1; // Usando uma propriedade existente
    
    console.log("🚀 Iniciando teste de performance...");
    
    const resultados = {};
    
    // Medir tempo de sobreposições
    resultados.sobreposicoes = await medirTempoOperacao(
        "Análise de Sobreposições",
        () => fetch(`${API_URL}/api/analise/sobreposicoes/${propriedadeId}`)
            .then(res => res.json())
    );
    
    // Medir tempo de confrontantes
    resultados.confrontantes = await medirTempoOperacao(
        "Análise de Confrontantes",
        () => fetch(`${API_URL}/api/analise/confrontantes/${propriedadeId}`)
            .then(res => res.json())
    );
    
    // Medir tempo de score
    resultados.score = await medirTempoOperacao(
        "Cálculo de Score",
        () => fetch(`${API_URL}/api/analise/score/${propriedadeId}`)
            .then(res => res.json())
    );
    
    // Medir tempo de análise completa
    resultados.completa = await medirTempoOperacao(
        "Análise Completa",
        () => fetch(`${API_URL}/api/analise/completa/${propriedadeId}`, {method: 'POST'})
            .then(res => res.json())
    );
    
    // Resumo
    console.log("\n📊 RESUMO DE PERFORMANCE:");
    console.log(`   Sobreposições: ${resultados.sobreposicoes.duracao}ms`);
    console.log(`   Confrontantes: ${resultados.confrontantes.duracao}ms`);
    console.log(`   Score: ${resultados.score.duracao}ms`);
    console.log(`   Análise Completa: ${resultados.completa.duracao}ms`);
    
    return resultados;
}

// Executar teste
testePerformanceAnalise()
    .then(resultados => {
        window.performanceTestResults = resultados;
        console.log("✅ Teste de performance concluído. Resultados disponíveis em window.performanceTestResults");
    })
    .catch(error => {
        console.error("❌ Erro no teste de performance:", error);
    });