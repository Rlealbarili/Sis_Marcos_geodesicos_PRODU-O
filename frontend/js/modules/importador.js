/* js/modules/importador.js */
(function (window, document) {
    'use strict';
    console.log("📦 Módulo Importador: Inicializando (Integração Real)...");

    const CONFIG = {
        ids: {
            input: 'file-input-docx',
            btnEnviar: 'btn-enviar-importacao',
            listaStatus: 'lista-status-upload',
            uploadArea: 'upload-area-docx',
            previewArea: 'preview-area-docx',
            fileName: 'file-name-docx',
            docxStatus: 'docx-status'
        },
        endpoint: '/api/memorial/upload',
        fieldName: 'memorial'
    };

    const Importador = {
        arquivoSelecionado: null,

        init: function () {
            console.log("🔧 [Importador] Inicializando listeners...");

            const input = document.getElementById(CONFIG.ids.input);
            if (!input) {
                console.warn(`⚠️ [Importador] Input #${CONFIG.ids.input} não encontrado. Tentando criar...`);
                return;
            }

            // Garante input limpo (Clone Hack para remover listeners antigos)
            const novoInput = input.cloneNode(true);
            input.parentNode.replaceChild(novoInput, input);

            novoInput.addEventListener('change', (e) => this.handleSelecao(e));

            // Click na área de upload
            const uploadArea = document.getElementById(CONFIG.ids.uploadArea);
            if (uploadArea) {
                uploadArea.addEventListener('click', () => novoInput.click());
            }

            console.log("✅ [Importador] Módulo carregado com sucesso!");
        },

        handleSelecao: function (e) {
            const arquivo = e.target.files[0];
            if (!arquivo) return;

            console.log(`📄 Arquivo selecionado: ${arquivo.name}`);

            // Validação local rápida
            if (!arquivo.name.match(/\.(docx|doc)$/i)) {
                this.mostrarToast('O Backend aceita apenas formatos .DOC ou .DOCX para processamento.', 'error');
                e.target.value = '';
                return;
            }

            this.arquivoSelecionado = arquivo;

            // Atualiza UI
            const previewArea = document.getElementById(CONFIG.ids.previewArea);
            const uploadArea = document.getElementById(CONFIG.ids.uploadArea);
            const fileName = document.getElementById(CONFIG.ids.fileName);
            const docxStatus = document.getElementById(CONFIG.ids.docxStatus);

            if (uploadArea) uploadArea.style.display = 'none';
            if (previewArea) previewArea.style.display = 'block';
            if (fileName) fileName.textContent = arquivo.name;
            if (docxStatus) {
                docxStatus.innerHTML = `
                    <div style="display:flex;align-items:center;gap:10px;justify-content:center;margin-top:15px;">
                        <button class="btn btn-primary" id="btn-processar-docx">
                            <i data-lucide="send"></i> Processar Memorial
                        </button>
                        <button class="btn btn-secondary" id="btn-cancelar-docx">
                            Cancelar
                        </button>
                    </div>
                `;
                if (typeof lucide !== 'undefined') lucide.createIcons();

                // Listeners dos botões
                document.getElementById('btn-processar-docx')?.addEventListener('click', () => this.uploadReal());
                document.getElementById('btn-cancelar-docx')?.addEventListener('click', () => this.cancelar());
            }
        },

        cancelar: function () {
            this.arquivoSelecionado = null;
            const previewArea = document.getElementById(CONFIG.ids.previewArea);
            const uploadArea = document.getElementById(CONFIG.ids.uploadArea);
            const input = document.getElementById(CONFIG.ids.input);

            if (previewArea) previewArea.style.display = 'none';
            if (uploadArea) uploadArea.style.display = 'block';
            if (input) input.value = '';
        },

        uploadReal: async function () {
            if (!this.arquivoSelecionado) {
                this.mostrarToast('Nenhum arquivo selecionado.', 'error');
                return;
            }

            const arquivo = this.arquivoSelecionado;
            console.log(`🚀 Enviando "${arquivo.name}" para ${CONFIG.endpoint}...`);

            const docxStatus = document.getElementById(CONFIG.ids.docxStatus);
            if (docxStatus) {
                docxStatus.innerHTML = `
                    <div style="text-align:center;padding:20px;">
                        <div class="spinner" style="margin:0 auto 15px auto;"></div>
                        <p>Processando memorial descritivo...</p>
                        <p style="font-size:12px;color:var(--text-secondary);">Extraindo coordenadas e geometria...</p>
                    </div>
                `;
            }

            const formData = new FormData();
            formData.append(CONFIG.fieldName, arquivo);

            try {
                const baseUrl = (window.API_URL || '').replace(/\/$/, '');
                const response = await fetch(baseUrl + CONFIG.endpoint, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    let erro;
                    try {
                        erro = await response.json();
                    } catch {
                        erro = { erro: `Erro ${response.status}` };
                    }
                    throw new Error(erro.erro || 'Erro desconhecido no servidor');
                }

                const dados = await response.json();
                console.log("✅ Sucesso! Retorno do Backend:", dados);

                // Exibe resultado
                if (docxStatus) {
                    const vertices = dados.total_vertices || dados.vertices?.length || 0;
                    const propNome = dados.propriedade?.nome || dados.nome_propriedade || 'N/A';

                    docxStatus.innerHTML = `
                        <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:20px;text-align:center;">
                            <i data-lucide="check-circle-2" style="color:#16a34a;width:48px;height:48px;"></i>
                            <h3 style="color:#16a34a;margin:10px 0;">Processamento Concluído!</h3>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:15px 0;">
                                <div style="background:white;padding:10px;border-radius:6px;">
                                    <div style="font-size:24px;font-weight:bold;color:#16a34a;">${vertices}</div>
                                    <div style="font-size:12px;color:#666;">Vértices Extraídos</div>
                                </div>
                                <div style="background:white;padding:10px;border-radius:6px;">
                                    <div style="font-size:14px;font-weight:bold;color:#333;word-break:break-word;">${propNome}</div>
                                    <div style="font-size:12px;color:#666;">Propriedade</div>
                                </div>
                            </div>
                            <button class="btn btn-secondary" onclick="window.Importador.cancelar()">Nova Importação</button>
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }

                // Dispara evento para atualizar mapa
                window.dispatchEvent(new CustomEvent('memorialProcessado', { detail: dados }));

                // Recarrega propriedades se a função existir
                if (window.carregarPropriedadesLista) window.carregarPropriedadesLista();
                if (window.carregarPoligonosNoMapa) window.carregarPoligonosNoMapa();

            } catch (erro) {
                console.error("❌ Erro no upload:", erro);

                if (docxStatus) {
                    docxStatus.innerHTML = `
                        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:20px;text-align:center;">
                            <i data-lucide="alert-triangle" style="color:#dc2626;width:48px;height:48px;"></i>
                            <h3 style="color:#dc2626;margin:10px 0;">Erro no Processamento</h3>
                            <p style="color:#991b1b;">${erro.message}</p>
                            <button class="btn btn-secondary" onclick="window.Importador.cancelar()">Tentar Novamente</button>
                        </div>
                    `;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        },

        mostrarToast: function (mensagem, tipo) {
            if (window.showToast) {
                window.showToast(mensagem, tipo);
            } else {
                alert(mensagem);
            }
        }
    };

    // Expõe globalmente para acesso via onclick
    window.Importador = Importador;

    // Inicialização
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => Importador.init());
    } else {
        Importador.init();
    }

})(window, document);
