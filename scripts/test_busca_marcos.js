const { chromium } = require('playwright');

(async () => {
    console.log("🧪 DIAGNÓSTICO: BUSCA DE MARCOS");
    console.log("=".repeat(60));

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    const logs = [];
    const errors = [];

    // Captura console
    page.on('console', msg => {
        const text = msg.text();
        logs.push(`[${msg.type()}] ${text}`);
        if (msg.type() === 'error') {
            console.error(`🔴 ${text}`);
            errors.push(text);
        } else if (text.includes('carregarMarcosLista') || text.includes('busca') || text.includes('📍')) {
            console.log(`🟢 ${text}`);
        }
    });

    const BASE_URL = 'http://localhost:3002';

    try {
        console.log(`\n📡 Navegando para ${BASE_URL}...`);
        await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
        console.log("✅ Página carregada.");

        // ETAPA 1: Navegar para aba Marcos
        console.log("\n📂 ETAPA 1: Navegando para aba Marcos...");
        const abaMarcos = await page.$('[data-view="marcos"]');
        if (abaMarcos) {
            await abaMarcos.click();
            await page.waitForTimeout(2000);
            console.log("✅ Aba Marcos ativada.");
        } else {
            throw new Error("Aba Marcos não encontrada!");
        }

        // ETAPA 2: Verificar se o input de busca existe
        console.log("\n🔍 ETAPA 2: Verificando campo de busca...");
        const inputBusca = await page.$('#busca-marcos');
        if (!inputBusca) {
            throw new Error("Input #busca-marcos não encontrado!");
        }
        console.log("✅ Campo de busca encontrado.");

        // ETAPA 3: Verificar se o botão existe
        const btnBuscar = await page.$('#btn-buscar-marcos');
        if (!btnBuscar) {
            throw new Error("Botão #btn-buscar-marcos não encontrado!");
        }
        console.log("✅ Botão de busca encontrado.");

        // ETAPA 4: Verificar event listeners no DOM
        console.log("\n🔧 ETAPA 4: Verificando event listeners...");
        const hasListeners = await page.evaluate(() => {
            const input = document.getElementById('busca-marcos');
            const btn = document.getElementById('btn-buscar-marcos');

            // Tenta detectar listeners (limitado, mas útil)
            const inputInfo = {
                id: input?.id,
                value: input?.value,
                parentId: input?.parentElement?.id,
                onclick: input?.onclick?.toString() || 'null'
            };
            const btnInfo = {
                id: btn?.id,
                textContent: btn?.textContent?.trim(),
                onclick: btn?.onclick?.toString() || 'null'
            };

            return { inputInfo, btnInfo, carregarMarcosListaExists: typeof window.carregarMarcosLista === 'function' };
        });
        console.log("   Input:", JSON.stringify(hasListeners.inputInfo, null, 2));
        console.log("   Botão:", JSON.stringify(hasListeners.btnInfo, null, 2));
        console.log("   carregarMarcosLista existe:", hasListeners.carregarMarcosListaExists);

        // ETAPA 5: Digitar termo de busca
        console.log("\n⌨️ ETAPA 5: Digitando termo de busca 'FHV-M'...");
        await inputBusca.fill('FHV-M');
        await page.waitForTimeout(500);
        console.log("✅ Termo digitado.");

        // ETAPA 6: Clicar no botão
        console.log("\n🖱️ ETAPA 6: Clicando no botão Buscar...");
        await btnBuscar.click();
        await page.waitForTimeout(3000);
        console.log("✅ Botão clicado, aguardando resposta...");

        // ETAPA 7: Verificar se a lista foi atualizada
        console.log("\n📊 ETAPA 7: Verificando resultados...");
        const gridContent = await page.evaluate(() => {
            const grid = document.getElementById('marcos-grid');
            return {
                childCount: grid?.children?.length || 0,
                innerHTMLPreview: grid?.innerHTML?.substring(0, 500) || 'VAZIO'
            };
        });
        console.log(`   Elementos no grid: ${gridContent.childCount}`);
        console.log(`   Preview: ${gridContent.innerHTMLPreview.substring(0, 200)}...`);

        // ETAPA 8: Testar Enter
        console.log("\n⌨️ ETAPA 8: Testando tecla Enter...");
        await inputBusca.fill('MARCO');
        await inputBusca.press('Enter');
        await page.waitForTimeout(3000);

        const gridAfterEnter = await page.evaluate(() => {
            return document.getElementById('marcos-grid')?.children?.length || 0;
        });
        console.log(`   Elementos após Enter: ${gridAfterEnter}`);

        // ETAPA 9: Screenshot
        await page.screenshot({ path: 'test-busca-marcos.png', fullPage: true });
        console.log("\n📸 Screenshot salvo: test-busca-marcos.png");

    } catch (error) {
        console.error("\n❌ ERRO:", error.message);
        errors.push(error.message);
    }

    // RELATÓRIO
    console.log("\n" + "=".repeat(60));
    console.log("📊 RELATÓRIO");
    console.log("=".repeat(60));

    if (errors.length > 0) {
        console.log(`\n🔴 ERROS: ${errors.length}`);
        errors.forEach((e, i) => console.log(`   ${i + 1}. ${e}`));
    }

    console.log("\n📜 ÚLTIMOS 15 LOGS:");
    logs.slice(-15).forEach(l => console.log(`   ${l}`));

    await browser.close();
    console.log("\n🏁 Teste finalizado.");
})();
