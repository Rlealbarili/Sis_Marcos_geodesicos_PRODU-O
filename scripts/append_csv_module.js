const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../frontend/script.js');
console.log(`📝 Adicionando módulo CSV ao: ${targetFile}`);

const codigoCSV = `

// =========================================================
// MÓDULO DE IMPORTAÇÃO CSV/XLSX (Recuperado do Backup)
// =========================================================

// Ação 1: Abre a janela do sistema operacional para seleção de arquivo
window.acionarSeletorCSV = function(e) {
    if (e) e.stopPropagation();
    const input = document.getElementById('file-input-importar');
    if (input) input.click();
};

// Ação 2: Feedback visual ao selecionar arquivo
window.csvSelecionado = function(input) {
    const display = document.getElementById('nome-arquivo-csv');
    const btnAcao = document.getElementById('btn-executar-importacao');

    if (input.files && input.files[0]) {
        const nome = input.files[0].name;
        if (display) {
            display.style.display = 'flex';
            display.innerHTML = '<div style="display:flex;align-items:center;gap:10px;width:100%"><i data-lucide="file-check" style="color:var(--cogep-green)"></i><span style="font-weight:600">' + nome + '</span><span style="margin-left:auto;font-size:12px;color:#666">Pronto</span></div>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        if (btnAcao) {
            btnAcao.disabled = false;
            btnAcao.innerHTML = '<i data-lucide="flask-conical"></i> Executar Simulação';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
};

// Ação 3: Motor de envio para o backend
window.importarPlanilhaMarcos = async function(e, forcarProducao) {
    forcarProducao = forcarProducao || false;
    if (e) e.preventDefault();
    
    const fileInput = document.getElementById('file-input-importar');
    const checkboxSimulacao = document.getElementById('check-simulacao');
    const resultDiv = document.getElementById('resultado-importacao-planilha');
    const painelUpload = document.getElementById('painel-upload');
    const btnPrincipal = document.getElementById('btn-executar-importacao');
    
    if (!fileInput || !fileInput.files[0]) {
        alert("Selecione um arquivo.");
        return;
    }

    var isSimulacao = checkboxSimulacao ? checkboxSimulacao.checked : false;
    if (forcarProducao) isSimulacao = false;

    if (btnPrincipal) {
        btnPrincipal.disabled = true;
        btnPrincipal.innerHTML = '<i data-lucide="loader-2" class="animate-spin"></i> Processando...';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    
    if (painelUpload && !forcarProducao) painelUpload.style.display = 'none';
    
    if (resultDiv) {
        resultDiv.style.display = 'block';
        resultDiv.innerHTML = '<div style="padding:30px;text-align:center;background:var(--bg-secondary);border-radius:8px"><div class="spinner" style="margin:0 auto 15px auto"></div><h3 style="margin:0;font-size:16px">Processando dados...</h3></div>';
    }

    const formData = new FormData();
    formData.append('csvFile', fileInput.files[0]);
    formData.append('simulacao', isSimulacao);

    try {
        const baseUrl = (window.API_URL || '').replace(/\\/$/, '');
        const finalUrl = baseUrl + '/api/marcos/importar-csv';
        console.log('📡 Enviando para: ' + finalUrl);

        const response = await fetch(finalUrl, { method: 'POST', body: formData });

        var result;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        } else {
            throw new Error('Erro do Servidor (' + response.status + ')');
        }

        if (result.sucesso) {
            const icon = result.modo_simulacao ? 'flask-conical' : 'check-circle-2';
            const title = result.modo_simulacao ? 'Simulação Concluída' : 'Importação Finalizada';
            const corIcone = result.modo_simulacao ? '#3B82F6' : '#10B981';
            
            var htmlStats = '<div style="background:var(--bg-primary);border:1px solid var(--border-primary);border-radius:8px;padding:20px">';
            htmlStats += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:15px;border-bottom:1px solid var(--border-primary)">';
            htmlStats += '<i data-lucide="' + icon + '" style="color:' + corIcone + ';width:24px;height:24px"></i>';
            htmlStats += '<div><h3 style="margin:0;font-size:18px">' + title + '</h3>';
            htmlStats += '<p style="margin:2px 0 0 0;font-size:13px;color:var(--text-secondary)">' + result.mensagem + '</p></div></div>';
            htmlStats += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">';
            htmlStats += '<div style="text-align:center;padding:10px;background:var(--bg-secondary);border-radius:6px"><div style="font-size:11px;text-transform:uppercase">Total</div><div style="font-size:20px;font-weight:bold">' + result.estatisticas.total + '</div></div>';
            htmlStats += '<div style="text-align:center;padding:10px;background:rgba(16,185,129,0.1);border-radius:6px"><div style="font-size:11px;text-transform:uppercase;color:#059669">Válidos</div><div style="font-size:20px;font-weight:bold;color:#059669">' + result.estatisticas.validos + '</div></div>';
            htmlStats += '<div style="text-align:center;padding:10px;background:rgba(245,158,11,0.1);border-radius:6px"><div style="font-size:11px;text-transform:uppercase;color:#d97706">Pendentes</div><div style="font-size:20px;font-weight:bold;color:#d97706">' + result.estatisticas.pendentes + '</div></div>';
            htmlStats += '</div>';
            
            if (result.modo_simulacao) {
                htmlStats += '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">';
                htmlStats += '<button class="btn btn-secondary" onclick="window.cancelarImportacao()">Descartar</button>';
                htmlStats += '<button class="btn btn-primary" onclick="window.importarPlanilhaMarcos(null, true)" style="background:#10B981">Confirmar e Gravar</button>';
                htmlStats += '</div>';
            } else {
                htmlStats += '<div style="text-align:center;margin-top:20px"><button class="btn btn-secondary" onclick="window.fecharModal(\\'modal-importar-csv\\')">Fechar</button></div>';
            }
            htmlStats += '</div>';
            
            resultDiv.innerHTML = htmlStats;
            if (!result.modo_simulacao) {
                if (window.carregarMarcosLista) window.carregarMarcosLista(1);
                if (window.carregarMarcos) window.carregarMarcos();
                if (window.carregarEstatisticas) window.carregarEstatisticas();
            }
        } else {
            throw new Error(result.erro || "Erro no servidor");
        }
    } catch (error) {
        console.error("💥 Erro:", error);
        if (painelUpload) painelUpload.style.display = 'block';
        resultDiv.innerHTML = '<div style="padding:15px;background:#fef2f2;border:1px solid #fca5a5;border-radius:6px;color:#991b1b;display:flex;align-items:center;gap:10px"><i data-lucide="alert-triangle"></i><span>' + error.message + '</span></div>';
    } finally {
        if (typeof lucide !== 'undefined') lucide.createIcons();
        if (btnPrincipal) {
            btnPrincipal.disabled = false;
            btnPrincipal.innerHTML = '<i data-lucide="play"></i> Nova Análise';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
};

// Ação 4: Cancelar importação
window.cancelarImportacao = function() {
    window.fecharModal('modal-importar-csv');
};

// Ação 5: Fechar modal genérico
if (typeof window.fecharModal !== 'function') {
    window.fecharModal = function(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) { modal.style.display = 'none'; modal.classList.remove('active'); }
        if (modalId === 'modal-importar-csv') {
            const painel = document.getElementById('painel-upload');
            if (painel) painel.style.display = 'block';
            const result = document.getElementById('resultado-importacao-planilha');
            if (result) result.style.display = 'none';
        }
    };
}

console.log('✅ Módulo de Importação CSV carregado com sucesso!');
`;

try {
    fs.appendFileSync(targetFile, codigoCSV, 'utf8');
    console.log('✅ Módulo CSV adicionado com sucesso ao script.js!');
} catch (err) {
    console.error('❌ Erro:', err);
}
