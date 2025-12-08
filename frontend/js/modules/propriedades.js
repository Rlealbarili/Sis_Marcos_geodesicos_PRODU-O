/**
 * propriedades.js
 * Funções para gerenciamento de propriedades com botões de edição e visualização no mapa
 */

// Variável para rastrear propriedade em edição
let propriedadeEmEdicao = null;

// ========================================
// CARREGAR LISTA DE PROPRIEDADES
// ========================================
window.carregarPropriedadesLista = async function () {
    console.log('🏢 Carregando lista de propriedades...');

    const container = document.getElementById('propriedades-grid');
    if (!container) {
        console.error('❌ Container propriedades-grid não encontrado');
        return;
    }

    // Mostrar loading
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <i data-lucide="loader-2" style="width: 32px; height: 32px; animation: spin 1s linear infinite;"></i>
            <p>Carregando propriedades...</p>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const response = await fetch(`${window.API_URL}/api/propriedades`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        const propriedades = result.data || [];

        console.log(`✅ ${propriedades.length} propriedades carregadas`);

        if (propriedades.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <i data-lucide="building-2" style="width: 64px; height: 64px; opacity: 0.3;"></i>
                    <h3 style="margin-top: 20px;">Nenhuma propriedade cadastrada</h3>
                    <p style="font-size: 0.9rem;">Clique em "Nova Propriedade" ou importe um memorial descritivo.</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        // Renderizar cards de propriedades
        container.innerHTML = `
            <div style="display: grid; gap: 15px; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));">
                ${propriedades.map(prop => renderCardPropriedade(prop)).join('')}
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        console.error('❌ Erro ao carregar propriedades:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #EF4444;">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px;"></i>
                <p>Erro ao carregar propriedades</p>
                <p style="font-size: 0.85rem;">${error.message}</p>
                <button class="btn btn-secondary" onclick="carregarPropriedadesLista()" style="margin-top: 15px;">
                    <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Tentar novamente
                </button>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

// ========================================
// RENDERIZAR CARD DE PROPRIEDADE
// ========================================
function renderCardPropriedade(prop) {
    // Cores baseadas no tipo
    const isRural = prop.tipo === 'RURAL';
    const corPrimaria = isRural ? '#10B981' : '#3B82F6'; // verde para rural, azul para urbana
    const corBg = isRural ? '#D1FAE5' : '#DBEAFE';
    const tipoLabel = isRural ? 'Rural' : (prop.tipo === 'URBANA' ? 'Urbana' : prop.tipo || 'N/A');

    // Verificar se tem geometria válida
    const temGeometria = prop.geometry !== null && prop.geometry !== undefined;

    return `
        <div class="card" style="
            padding: 20px; 
            border: 2px solid ${corPrimaria}20; 
            border-left: 4px solid ${corPrimaria};
            border-radius: 8px; 
            background: var(--bg-secondary);
            position: relative;
        ">
            ${!temGeometria ? `
                <div style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: #FEF3C7;
                    color: #D97706;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                ">
                    <i data-lucide="alert-triangle" style="width: 12px; height: 12px;"></i>
                    Sem coordenadas
                </div>
            ` : ''}
            
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div style="flex: 1; padding-right: 10px;">
                    <h3 style="margin: 0 0 8px 0; color: var(--text-primary); font-size: 1.1rem;">
                        ${prop.nome_propriedade || 'Sem nome'}
                    </h3>
                    <span style="
                        background: ${corBg}; 
                        color: ${corPrimaria}; 
                        padding: 3px 10px; 
                        border-radius: 4px; 
                        font-size: 0.75rem; 
                        font-weight: 600;
                    ">${tipoLabel}</span>
                </div>
            </div>
            
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">
                <div style="margin-bottom: 6px;">
                    <strong>📋 Matrícula:</strong> ${prop.matricula || 'N/A'}
                </div>
                <div style="margin-bottom: 6px;">
                    <strong>📍 Local:</strong> ${prop.municipio || 'N/A'} - ${prop.uf || 'N/A'}
                </div>
                ${prop.area_m2 ? `
                    <div style="margin-bottom: 6px;">
                        <strong>📐 Área:</strong> ${(prop.area_m2 / 10000).toFixed(4)} ha (${parseFloat(prop.area_m2).toLocaleString('pt-BR')} m²)
                    </div>
                ` : ''}
                ${prop.perimetro_m ? `
                    <div style="margin-bottom: 6px;">
                        <strong>📏 Perímetro:</strong> ${parseFloat(prop.perimetro_m).toLocaleString('pt-BR')} m
                    </div>
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn btn-secondary" style="padding: 8px 14px; font-size: 0.85rem; flex: 1;" 
                        onclick="editarPropriedade(${prop.id})">
                    <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i> Editar
                </button>
                ${temGeometria ? `
                    <button class="btn" style="
                        padding: 8px 14px; 
                        font-size: 0.85rem; 
                        flex: 1;
                        background: ${corPrimaria};
                        color: white;
                        border: none;
                    " onclick="verPropriedadeNoMapa(${prop.id})">
                        <i data-lucide="map" style="width: 14px; height: 14px;"></i> Ver no Mapa
                    </button>
                ` : `
                    <button class="btn btn-secondary" style="
                        padding: 8px 14px; 
                        font-size: 0.85rem; 
                        flex: 1;
                        opacity: 0.5;
                        cursor: not-allowed;
                    " disabled title="Esta propriedade não possui coordenadas válidas">
                        <i data-lucide="map-off" style="width: 14px; height: 14px;"></i> Sem Mapa
                    </button>
                `}
            </div>
        </div>
    `;
}

// ========================================
// EDITAR PROPRIEDADE
// ========================================
window.editarPropriedade = async function (propriedadeId) {
    console.log(`✏️ Editando propriedade ID: ${propriedadeId}`);

    try {
        const response = await fetch(`${window.API_URL}/api/propriedades/${propriedadeId}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Propriedade não encontrada');
        }

        const prop = result.data;
        propriedadeEmEdicao = prop;

        // Preencher o modal com os dados
        const form = document.getElementById('form-nova-propriedade');
        if (!form) {
            throw new Error('Formulário não encontrado');
        }

        // Preencher campos
        const nomeInput = document.getElementById('nova-prop-nome');
        if (nomeInput) nomeInput.value = prop.nome_propriedade || '';

        const matriculaInput = document.getElementById('nova-prop-matricula');
        if (matriculaInput) matriculaInput.value = prop.matricula || '';

        const tipoSelect = document.getElementById('nova-prop-tipo');
        if (tipoSelect) tipoSelect.value = prop.tipo || '';

        const municipioInput = document.getElementById('nova-prop-municipio');
        if (municipioInput) municipioInput.value = prop.municipio || '';

        const comarcaInput = document.getElementById('nova-prop-comarca');
        if (comarcaInput) comarcaInput.value = prop.comarca || '';

        const ufSelect = document.getElementById('nova-prop-uf');
        if (ufSelect) ufSelect.value = prop.uf || 'PR';

        const areaInput = document.getElementById('nova-prop-area');
        if (areaInput) areaInput.value = prop.area_m2 || '';

        const perimetroInput = document.getElementById('nova-prop-perimetro');
        if (perimetroInput) perimetroInput.value = prop.perimetro_m || '';

        const observacoesInput = document.getElementById('nova-prop-observacoes');
        if (observacoesInput) observacoesInput.value = prop.observacoes || '';

        // Atualizar título do modal
        const modalTitle = document.querySelector('#modal-nova-propriedade .modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i data-lucide="edit"></i> Editar Propriedade';
        }

        // Atualizar botão de submit
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i data-lucide="check"></i> Salvar Alterações';
        }

        // Carregar clientes no select
        if (typeof window.carregarClientesSelect === 'function') {
            await window.carregarClientesSelect();
        }

        // Selecionar cliente se existir
        const clienteSelect = document.getElementById('nova-prop-cliente');
        if (clienteSelect && prop.cliente_id) {
            clienteSelect.value = prop.cliente_id;
        }

        // Abrir modal
        if (typeof window.abrirModal === 'function') {
            window.abrirModal('modal-nova-propriedade');
        } else {
            document.getElementById('modal-nova-propriedade').style.display = 'flex';
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();

        console.log('✅ Modal de edição aberto para:', prop.nome_propriedade);

    } catch (error) {
        console.error('❌ Erro ao buscar propriedade:', error);
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('error', 'Erro', 'Erro ao buscar dados da propriedade: ' + error.message);
        } else {
            alert('Erro ao buscar dados da propriedade: ' + error.message);
        }
    }
};

// ========================================
// VER PROPRIEDADE NO MAPA
// ========================================
window.verPropriedadeNoMapa = async function (propriedadeId) {
    console.log(`🗺️ Visualizando propriedade ID ${propriedadeId} no mapa...`);

    try {
        // Navegar para o mapa
        const btnMapa = document.querySelector('.nav-link[data-view="mapa"]');
        if (btnMapa) {
            btnMapa.click();
        }

        // Aguardar um pouco para o mapa carregar
        await new Promise(resolve => setTimeout(resolve, 500));

        // Buscar dados da propriedade
        const response = await fetch(`${window.API_URL}/api/propriedades/${propriedadeId}`);
        const result = await response.json();

        if (!result.success || !result.data) {
            throw new Error('Propriedade não encontrada');
        }

        const prop = result.data;

        // Verificar se tem geometria
        if (!prop.geometry) {
            console.warn('⚠️ Propriedade sem geometria');
            if (typeof window.mostrarToast === 'function') {
                window.mostrarToast('warning', 'Aviso', 'Esta propriedade não possui coordenadas válidas para exibir no mapa.');
            }
            return;
        }

        // Converter geometria para GeoJSON se necessário
        let geoJson;
        if (typeof prop.geometry === 'string') {
            geoJson = JSON.parse(prop.geometry);
        } else {
            geoJson = prop.geometry;
        }

        // Criar layer do polígono
        const isRural = prop.tipo === 'RURAL';
        const cor = isRural ? '#10B981' : '#3B82F6';

        // Limpar layer anterior de destaque se existir
        if (window.highlightLayer) {
            window.map.removeLayer(window.highlightLayer);
        }

        // Criar novo layer
        window.highlightLayer = L.geoJSON(geoJson, {
            style: {
                color: cor,
                weight: 3,
                opacity: 1,
                fillColor: cor,
                fillOpacity: 0.3
            }
        }).addTo(window.map);

        // Popup com informações
        window.highlightLayer.bindPopup(`
            <div style="min-width: 200px;">
                <h4 style="margin: 0 0 10px 0; color: ${cor};">${prop.nome_propriedade || 'Propriedade'}</h4>
                <div style="font-size: 0.9rem;">
                    <strong>Tipo:</strong> ${prop.tipo === 'RURAL' ? 'Rural' : 'Urbana'}<br>
                    <strong>Matrícula:</strong> ${prop.matricula || 'N/A'}<br>
                    <strong>Local:</strong> ${prop.municipio || 'N/A'} - ${prop.uf || 'N/A'}<br>
                    ${prop.area_m2 ? `<strong>Área:</strong> ${(prop.area_m2 / 10000).toFixed(4)} ha` : ''}
                </div>
            </div>
        `).openPopup();

        // Centralizar mapa no polígono
        window.map.fitBounds(window.highlightLayer.getBounds(), {
            padding: [50, 50],
            maxZoom: 15
        });

        console.log('✅ Propriedade exibida no mapa:', prop.nome_propriedade);

    } catch (error) {
        console.error('❌ Erro ao exibir propriedade no mapa:', error);
        if (typeof window.mostrarToast === 'function') {
            window.mostrarToast('error', 'Erro', 'Erro ao exibir propriedade no mapa: ' + error.message);
        }
    }
};

// ========================================
// GETTER PARA PROPRIEDADE EM EDIÇÃO
// ========================================
window.getPropriedadeEmEdicao = function () {
    return propriedadeEmEdicao;
};

// Limpar estado de edição quando modal fecha
const originalFecharModalProp = window.fecharModal;
window.fecharModal = function (modalId) {
    if (modalId === 'modal-nova-propriedade') {
        propriedadeEmEdicao = null;

        // Restaurar título e botão originais
        const modalTitle = document.querySelector('#modal-nova-propriedade .modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i data-lucide="building-2"></i> Nova Propriedade';
        }

        const submitBtn = document.querySelector('#form-nova-propriedade button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i data-lucide="check"></i> Cadastrar Propriedade';
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Chamar função original
    if (originalFecharModalProp) {
        originalFecharModalProp(modalId);
    } else {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    }
};

console.log('✅ propriedades.js carregado');
