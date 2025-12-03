const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    console.log('🕵️ INICIANDO DIAGNÓSTICO FORENSE DE FRONTEND (PLAYWRIGHT)');
    console.log('=========================================================');

    const browser = await chromium.launch({ headless: true }); // Headless para CI, false para ver
    const page = await browser.newPage();

    // 1. MONITORAMENTO DE CONSOLE (A "Caixa Preta")
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        if (type === 'error') {
            console.log(`🔴 [CONSOLE BROWSER ERROR]: ${text}`);
        } else if (type === 'warning') {
            console.log(`🟡 [CONSOLE BROWSER WARN]: ${text}`);
        } else {
            // Filtrar logs comuns para reduzir ruído, focar em erros
            // console.log(`⚪ [CONSOLE]: ${text}`); 
        }
    });

    // 2. MONITORAMENTO DE ERROS DE PÁGINA
    page.on('pageerror', exception => {
        console.log(`💥 [CRASH JS NA PÁGINA]: ${exception}`);
    });

    // 3. MONITORAMENTO DE REDE
    page.on('requestfailed', request => {
        console.log(`❌ [REDE FALHA]: ${request.url()} - ${request.failure().errorText}`);
    });
    
    page.on('response', response => {
        if (response.status() >= 400) {
            console.log(`⚠️ [REDE ERRO HTTP]: ${response.url()} retornou ${response.status()}`);
        }
        if (response.url().includes('/api/propriedades/geojson')) {
            console.log(`🌐 [REDE]: Requisição de GeoJSON detectada. Status: ${response.status()}`);
        }
    });

    try {
        // A. CARREGAMENTO
        console.log('\n--- ETAPA A: CARREGAMENTO INICIAL ---');
        await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
        console.log('✅ Página carregada.');

        // B. TESTE DE MAPEAMENTO
        console.log('\n--- ETAPA B: VERIFICAÇÃO DO MAPA ---');
        // Verificar se o container do mapa existe
        const mapExists = await page.locator('#map').count() > 0;
        console.log(`   Container #map existe? ${mapExists ? 'SIM' : 'NÃO'}`);
        
        // Esperar um pouco para ver se carrega polígonos (requisição monitorada pelos listeners acima)
        await page.waitForTimeout(3000);

        // C. TESTE DE IMPORTAÇÃO
        console.log('\n--- ETAPA C: SIMULAÇÃO DE UPLOAD ---');
        
        // Tentar clicar na aba importar
        const tabImportar = page.locator('button[data-tab="importar"]');
        if (await tabImportar.isVisible()) {
            await tabImportar.click();
            console.log('✅ Clicou na aba Importar.');
        } else {
            console.log('❌ Aba Importar não encontrada ou invisível.');
        }

        // Criar arquivo dummy
        const dummyPath = path.join(__dirname, 'dummy_memorial.docx');
        fs.writeFileSync(dummyPath, 'DUMMY CONTENT FOR TEST');

        // Localizar input file (mesmo que oculto)
        const fileInput = page.locator('input#file-input-docx'); // Ajuste o seletor conforme seu HTML exato

        if (await fileInput.count() > 0) {
            console.log('   Input de arquivo encontrado. Tentando upload...');
            await fileInput.setInputFiles(dummyPath);
            console.log('   Arquivo anexado ao input.');
            
            // Verificar se algo mudou na UI (ex: nome do arquivo apareceu)
            await page.waitForTimeout(1000);
            const fileNameDisplay = await page.locator('#file-name-docx').textContent();
            console.log(`   UI Atualizada? Nome do arquivo visível: "${fileNameDisplay}"`);
            
            if (!fileNameDisplay) {
                console.log('❌ ERRO CRÍTICO: O evento "change" do input não disparou ou a função handleFileSelectDOCX falhou.');
            }
        } else {
            console.log('❌ Input de arquivo (#file-input-docx) NÃO ENCONTRADO no DOM.');
        }

        // Limpar
        fs.unlinkSync(dummyPath);

    } catch (error) {
        console.error('🔥 ERRO NA EXECUÇÃO DO TESTE:', error);
    } finally {
        await browser.close();
        console.log('\n=========================================================');
        console.log('DIAGNÓSTICO CONCLUÍDO.');
    }
})();