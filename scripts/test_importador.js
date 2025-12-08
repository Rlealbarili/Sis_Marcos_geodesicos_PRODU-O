const { chromium } = require('playwright');
const path = require('path');

(async () => {
    console.log("🧪 TESTE: MÓDULO IMPORTADOR DE MEMORIAL DOCX");
    console.log("=".repeat(60));

    const browser = await chromium.launch({ headless: false }); // headless: false para ver
    const page = await browser.newPage();

    const erros = [];
    const logs = [];

    // Captura console do browser
    page.on('console', msg => {
        const text = msg.text();
        logs.push(`[${msg.type()}] ${text}`);
        if (msg.type() === 'error') {
            console.error(`🔴 [CONSOLE ERROR] ${text}`);
            erros.push(text);
        } else if (text.includes('Importador') || text.includes('📦') || text.includes('🚀')) {
            console.log(`🟢 [CONSOLE] ${text}`);
        }
    });

    // Captura erros de rede
    page.on('response', async response => {
        if (response.status() >= 400) {
            const url = response.url();
            let body = '';
            try { body = await response.text(); } catch { }
            console.error(`🔴 [HTTP ${response.status()}] ${url}`);
            console.error(`   Body: ${body.substring(0, 200)}`);
            erros.push(`HTTP ${response.status()}: ${url}`);
        }
    });

    // Captura requisições POST
    page.on('request', request => {
        if (request.method() === 'POST') {
            console.log(`➡️ [POST] ${request.url()}`);
        }
    });

    const BASE_URL = 'http://localhost:3002';
    const TEST_FILE = path.resolve(__dirname, '../Memorial Descritivo - LOTE C.docx');

    try {
        console.log(`\n📡 Navegando para ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        console.log("✅ Página carregada.");

        // ETAPA 1: Navegar para aba Importar
        console.log("\n📂 ETAPA 1: Navegando para aba Importar...");
        const abaImportar = await page.$('[data-view="importar"]');
        if (abaImportar) {
            await abaImportar.click();
            await page.waitForTimeout(500);
            console.log("✅ Aba Importar clicada.");
        } else {
            throw new Error("Aba Importar não encontrada!");
        }

        // ETAPA 2: Verificar se o módulo inicializou
        console.log("\n🔍 ETAPA 2: Verificando inicialização do módulo...");
        const importadorExiste = await page.evaluate(() => typeof window.Importador !== 'undefined');
        console.log(`   window.Importador existe: ${importadorExiste}`);

        if (!importadorExiste) {
            console.error("❌ MÓDULO NÃO CARREGADO! Verificando erros de script...");
        }

        // ETAPA 3: Procurar input de arquivo
        console.log("\n📂 ETAPA 3: Procurando input de arquivo...");

        // Lista todos os inputs file na página
        const inputsFile = await page.$$eval('input[type="file"]', inputs =>
            inputs.map(i => ({ id: i.id, accept: i.accept, display: getComputedStyle(i).display }))
        );
        console.log("   Inputs file encontrados:", JSON.stringify(inputsFile, null, 2));

        // Tenta encontrar o input correto
        let fileInput = await page.$('#file-input-docx');
        if (!fileInput) {
            console.log("   ⚠️ #file-input-docx não encontrado, tentando alternativas...");
            fileInput = await page.$('input[type="file"][accept*=".docx"]');
        }
        if (!fileInput) {
            fileInput = await page.$('input[type="file"]');
        }

        if (fileInput) {
            console.log("✅ Input de arquivo encontrado.");

            // ETAPA 4: Upload do arquivo
            console.log(`\n📤 ETAPA 4: Enviando arquivo: ${TEST_FILE}`);
            await fileInput.setInputFiles(TEST_FILE);
            await page.waitForTimeout(1000);
            console.log("✅ Arquivo selecionado.");

            // ETAPA 5: Verificar se botão foi habilitado ou area de preview apareceu
            console.log("\n🔍 ETAPA 5: Verificando UI após seleção...");

            const btnProcessar = await page.$('#btn-processar-docx');
            const btnEnviar = await page.$('#btn-enviar-importacao');

            if (btnProcessar) {
                console.log("✅ Botão 'Processar Memorial' encontrado. Clicando...");
                await btnProcessar.click();
                console.log("⏳ Aguardando resposta do backend (10s)...");
                await page.waitForTimeout(10000);
            } else if (btnEnviar) {
                const disabled = await btnEnviar.evaluate(b => b.disabled);
                console.log(`   Botão 'Enviar' encontrado, disabled: ${disabled}`);
                if (!disabled) {
                    await btnEnviar.click();
                    await page.waitForTimeout(10000);
                }
            } else {
                console.log("⚠️ Nenhum botão de envio encontrado após upload.");
            }

        } else {
            console.error("❌ Nenhum input de arquivo encontrado na página!");
        }

        // ETAPA 6: Screenshot final
        console.log("\n📸 ETAPA 6: Capturando screenshot...");
        await page.screenshot({ path: 'test-importador-result.png', fullPage: true });
        console.log("✅ Screenshot salvo: test-importador-result.png");

    } catch (error) {
        console.error("\n❌ FALHA NO TESTE:", error.message);
        erros.push(error.message);
    }

    // RELATÓRIO FINAL
    console.log("\n" + "=".repeat(60));
    console.log("📊 RELATÓRIO DO TESTE");
    console.log("=".repeat(60));

    if (erros.length > 0) {
        console.log(`\n🔴 ERROS DETECTADOS: ${erros.length}`);
        erros.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    } else {
        console.log("\n✅ Nenhum erro crítico detectado.");
    }

    console.log("\n📜 LOGS DO BROWSER (últimos 20):");
    logs.slice(-20).forEach(l => console.log(`   ${l}`));

    await browser.close();
    console.log("\n🏁 Teste finalizado.");
})();
