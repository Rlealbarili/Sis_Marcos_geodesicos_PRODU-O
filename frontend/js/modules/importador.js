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
                // Tenta usar alert nativo se mostrarToast não estiver disponível no escopo
                if (typeof this.mostrarToast === 'function') this.mostrarToast('Nenhum arquivo selecionado.', 'error');
                else alert('Nenhum arquivo selecionado.');
                return;
            }

            const arquivo = this.arquivoSelecionado;
            const docxStatus = document.getElementById(CONFIG.ids.docxStatus || 'status-importacao'); // Fallback de segurança
            // Garante que a URL não tenha barra duplicada
            const baseUrl = (window.API_URL || '').replace(/\/$/, '');

            // UI: Feedback Inicial
            if (docxStatus) {
                docxStatus.innerHTML = `
                    <div style="text-align:center;padding:20px;">
                        <div class="spinner" style="margin:0 auto 15px auto; border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite;"></div>
                        <p><strong>Etapa 1/3:</strong> Extraindo dados do memorial...</p>
                    </div>
                    <style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style>
                `;
            }

            try {
                // ---------------------------------------------------------
                // ETAPA 1: Extração (Upload)
                // ---------------------------------------------------------
                const formData = new FormData();
                formData.append(CONFIG.fieldName || 'memorial', arquivo);

                const resUpload = await fetch(baseUrl + CONFIG.endpoint, {
                    method: 'POST',
                    body: formData
                });

                if (!resUpload.ok) {
                    let erroMsg = 'Erro desconhecido';
                    try { const err = await resUpload.json(); erroMsg = err.erro || err.message; } catch (e) { }
                    throw new Error(`Falha no upload: ${erroMsg}`);
                }

                const dados = await resUpload.json();
                if (!dados.sucesso) throw new Error(dados.erro || 'Falha na extração dos dados.');

                console.log('✅ [Importador] Dados extraídos:', dados);

                // ---------------------------------------------------------
                // ETAPA 2: Verificação (Duplicatas)
                // ---------------------------------------------------------
                if (docxStatus) docxStatus.querySelector('p').innerText = "Etapa 2/3: Verificando conflitos...";

                const payloadVerificacao = {
                    propriedade: {
                        nome_propriedade: dados.propriedade?.nome,
                        matricula: dados.propriedade?.matricula,
                        municipio: dados.propriedade?.municipio
                    },
                    vertices: dados.vertices || []
                };

                const resCheck = await fetch(baseUrl + '/api/verificar-memorial', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadVerificacao)
                });

                const checkResult = await resCheck.json();

                // Lógica de Confirmação de Conflito
                if (checkResult.verificacao?.requer_confirmacao) {
                    const listaDuplicatas = checkResult.verificacao.duplicatas.map(d => `⚠️ ${d.mensagem}`).join('\n');
                    const listaSobreposicoes = checkResult.verificacao.sobreposicoes.map(s => `📍 ${s.mensagem}`).join('\n');

                    const msg = `ATENÇÃO: Conflitos Detectados!\n\n${listaDuplicatas}\n${listaSobreposicoes}\n\nDeseja continuar e salvar mesmo assim?`;

                    if (!confirm(msg)) {
                        if (docxStatus) docxStatus.innerHTML = `<div style="padding:15px; color:#856404; background-color:#fff3cd; border:1px solid #ffeeba; border-radius:4px;">Operação cancelada pelo usuário.</div>`;
                        return; // Aborta
                    }
                }

                // ---------------------------------------------------------
                // ETAPA 3: Persistência (Salvar)
                // ---------------------------------------------------------
                if (docxStatus) docxStatus.querySelector('p').innerText = "Etapa 3/3: Salvando no banco de dados...";

                const payloadFinal = {
                    cliente: {
                        nome: dados.cliente?.nome || 'Cliente Importação Automática',
                        novo: true
                    },
                    propriedade: {
                        nome_propriedade: dados.propriedade?.nome || 'Propriedade Importada',
                        matricula: dados.propriedade?.matricula,
                        tipo: 'RURAL',
                        municipio: dados.propriedade?.municipio,
                        uf: dados.propriedade?.uf,
                        area_m2: dados.area_m2,
                        perimetro_m: dados.perimetro_m
                    },
                    vertices: (dados.vertices || []).map((v, idx) => ({
                        nome: v.nome || `V${idx + 1}`,
                        ordem: v.ordem || idx + 1,
                        coordenadas: {
                            e: v.coordenadas?.e || v.e,
                            n: v.coordenadas?.n || v.n,
                            lat_original: v.coordenadas?.lat,
                            lon_original: v.coordenadas?.lng,
                            utm_zona: v.coordenadas?.zona || '22S',
                            datum: v.coordenadas?.datum || 'SIRGAS2000'
                        }
                    }))
                };

                const resSave = await fetch(baseUrl + '/api/salvar-memorial-completo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payloadFinal)
                });

                const saveResult = await resSave.json();

                if (!saveResult.success) {
                    throw new Error(saveResult.message || 'O servidor recusou o salvamento.');
                }

                // ---------------------------------------------------------
                // SUCESSO FINAL
                // ---------------------------------------------------------
                console.log('💾 [Importador] Salvo com sucesso:', saveResult);

                const propId = saveResult.data?.propriedade_id;
                const totalV = saveResult.data?.vertices_criados || 0;

                if (docxStatus) {
                    docxStatus.innerHTML = `
                        <div style="background:#d4edda; color:#155724; border:1px solid #c3e6cb; border-radius:8px; padding:20px; text-align:center;">
                            <h3 style="margin-top:0;">✅ Memorial Salvo!</h3>
                            <p>Propriedade <strong>#${propId}</strong> criada com <strong>${totalV}</strong> vértices.</p>
                            <div style="margin-top:15px;">
                                <button id="btn-ver-mapa-final" class="btn btn-primary" style="margin-right:10px;">🗺️ Ver no Mapa</button>
                                <button id="btn-nova-importacao" class="btn btn-secondary">Nova Importação</button>
                            </div>
                        </div>
                    `;

                    // Reatribui eventos aos novos botões
                    document.getElementById('btn-ver-mapa-final')?.addEventListener('click', () => {
                        // Usa a mesma função da lista de propriedades - já funciona perfeitamente!
                        if (window.verPropriedadeNoMapa) {
                            console.log('🎯 [Importador] Chamando verPropriedadeNoMapa(' + propId + ')');
                            window.verPropriedadeNoMapa(propId);
                        } else {
                            // Fallback: apenas navega para o mapa
                            console.warn('[Importador] verPropriedadeNoMapa não disponível, navegando para mapa');
                            const abaMapa = document.querySelector('[data-view="mapa"]') || document.querySelector('a[href="#mapa"]');
                            if (abaMapa) abaMapa.click();
                        }
                    });

                    document.getElementById('btn-nova-importacao')?.addEventListener('click', () => {
                        if (typeof this.cancelar === 'function') this.cancelar();
                        else docxStatus.innerHTML = ''; // Fallback
                    });
                }

                // Atualiza apenas lista de propriedades (seguro mesmo fora da aba mapa)
                try {
                    if (window.carregarPropriedadesLista) window.carregarPropriedadesLista();
                } catch (e) {
                    console.warn('[Importador] Aviso ao atualizar lista:', e.message);
                }

            } catch (erro) {
                console.error('❌ [Importador] Erro:', erro);
                if (docxStatus) {
                    docxStatus.innerHTML = `
                        <div style="background:#f8d7da; color:#721c24; border:1px solid #f5c6cb; border-radius:8px; padding:15px; text-align:center;">
                            <strong>Erro no Processamento:</strong><br>${erro.message}
                            <br><br>
                            <button onclick="this.parentElement.innerHTML=''" class="btn btn-sm btn-outline-danger">Fechar</button>
                        </div>
                    `;
                }
                if (typeof this.mostrarToast === 'function') this.mostrarToast(erro.message, 'error');
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
