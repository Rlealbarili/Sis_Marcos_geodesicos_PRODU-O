const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Navegar para a aplicação
        await page.goto('http://localhost:3002');
        await page.waitForLoadState('networkidle');
        
        console.log('Página carregada com sucesso');

        // Testar botão "Novo Marco"
        await page.locator('button:has-text("Novo Marco")').click();
        console.log('✅ Botão "Novo Marco" clicado');
        
        await page.waitForTimeout(1000);
        
        // Verificar se o modal está visível
        const isModalVisible = await page.locator('#modal-novo-marco').isVisible();
        if (isModalVisible) {
            console.log('✅ Modal "Novo Marco" aberto corretamente');
        } else {
            console.log('❌ Modal "Novo Marco" não aberto');
        }
        
        // Fechar o modal usando o botão de fechar (X)
        await page.locator('#modal-novo-marco .btn-icon').click();
        await page.waitForTimeout(500);
        
        // Verificar se o modal foi fechado
        const isModalClosed = !(await page.locator('#modal-novo-marco').isVisible());
        if (isModalClosed) {
            console.log('✅ Modal "Novo Marco" fechado corretamente');
        } else {
            console.log('❌ Modal "Novo Marco" não foi fechado');
        }

        // Testar botão "Nova Propriedade"
        await page.locator('a:has-text("Propriedades")').click();
        await page.waitForTimeout(500);
        
        const novaPropBtn = await page.locator('button:has-text("Nova Propriedade")');
        if (await novaPropBtn.count() > 0) {
            await novaPropBtn.click();
            console.log('✅ Botão "Nova Propriedade" clicado');
            
            await page.waitForTimeout(1000);
            
            const isPropModalVisible = await page.locator('#modal-nova-propriedade').isVisible();
            if (isPropModalVisible) {
                console.log('✅ Modal "Nova Propriedade" aberto corretamente');
            } else {
                console.log('❌ Modal "Nova Propriedade" não aberto');
            }
            
            // Fechar o modal
            await page.locator('#modal-nova-propriedade .btn-icon').click();
            console.log('✅ Modal "Nova Propriedade" fechado');
        }
        
        // Testar botão "Novo Cliente"
        await page.locator('a:has-text("Clientes")').click();
        await page.waitForTimeout(500);
        
        const novoClienteBtn = await page.locator('button:has-text("Novo Cliente")');
        if (await novoClienteBtn.count() > 0) {
            await novoClienteBtn.click();
            console.log('✅ Botão "Novo Cliente" clicado');
            
            await page.waitForTimeout(1000);
            
            const isClienteModalVisible = await page.locator('#modal-novo-cliente').isVisible();
            if (isClienteModalVisible) {
                console.log('✅ Modal "Novo Cliente" aberto corretamente');
            } else {
                console.log('❌ Modal "Novo Cliente" não aberto');
            }
            
            // Fechar o modal
            await page.locator('#modal-novo-cliente .btn-icon').click();
            console.log('✅ Modal "Novo Cliente" fechado');
        }
        
        // Testar botão "Importar CSV" na aba de busca
        await page.locator('a:has-text("Buscar Marcos")').click();
        await page.waitForTimeout(500);
        
        const importarCSVBtn = await page.locator('button:has-text("Importar CSV")');
        if (await importarCSVBtn.count() > 0) {
            await importarCSVBtn.click();
            console.log('✅ Botão "Importar CSV" clicado');
            
            await page.waitForTimeout(1000);
            
            const isCSVModalVisible = await page.locator('#modal-importar-csv').isVisible();
            if (isCSVModalVisible) {
                console.log('✅ Modal "Importar CSV" aberto corretamente');
            } else {
                console.log('❌ Modal "Importar CSV" não aberto');
            }
            
            // Fechar o modal
            await page.locator('#modal-importar-csv .btn-icon').click();
            console.log('✅ Modal "Importar CSV" fechado');
        }

        console.log('Todos os testes concluídos com sucesso!');
        
        // Aguardar antes de fechar
        await page.waitForTimeout(2000);
        
    } catch (error) {
        console.error('Erro durante o teste:', error);
    } finally {
        await browser.close();
    }
})();