/**
 * clientes.js
 * Funções para gerenciamento de clientes
 */

// ========================================
// CARREGAR LISTA DE CLIENTES
// ========================================
window.carregarClientes = async function () {
    console.log('📥 Carregando clientes do banco...');

    const grid = document.getElementById('clientes-grid');
    if (!grid) {
        console.error('❌ Grid de clientes não encontrado');
        return;
    }

    // Mostrar loading
    grid.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <i data-lucide="loader-2" style="width: 32px; height: 32px; animation: spin 1s linear infinite;"></i>
            <p>Carregando clientes...</p>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const response = await fetch(`${window.API_URL}/api/clientes`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Erro ao carregar clientes');
        }

        const clientes = result.data;
        console.log(`✅ ${clientes.length} clientes carregados`);

        if (clientes.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <i data-lucide="users" style="width: 48px; height: 48px; opacity: 0.5;"></i>
                    <p>Nenhum cliente cadastrado</p>
                    <p style="font-size: 0.9rem;">Clique em "Novo Cliente" para adicionar</p>
                </div>
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        // Renderizar cards de clientes
        grid.innerHTML = clientes.map(cliente => `
            <div class="card" style="padding: 20px; margin-bottom: 15px; border: 1px solid var(--border-primary); border-radius: 8px; background: var(--bg-secondary);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 8px 0; color: var(--text-primary); font-size: 1.1rem;">
                            ${cliente.nome}
                        </h3>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                            <span style="background: ${cliente.tipo_pessoa === 'fisica' ? 'var(--cogep-green-light)' : '#EFF6FF'}; 
                                         color: ${cliente.tipo_pessoa === 'fisica' ? 'var(--cogep-green)' : '#3B82F6'}; 
                                         padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500;">
                                ${cliente.tipo_pessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                            </span>
                            ${cliente.cpf_cnpj ? `
                                <span style="color: var(--text-secondary); font-size: 0.85rem;">
                                    ${cliente.cpf_cnpj}
                                </span>
                            ` : ''}
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-secondary);">
                            ${cliente.email ? `<div style="margin-bottom: 4px;">📧 ${cliente.email}</div>` : ''}
                            ${cliente.telefone ? `<div style="margin-bottom: 4px;">📞 ${cliente.telefone}</div>` : ''}
                            ${cliente.endereco ? `<div style="margin-bottom: 4px;">📍 ${cliente.endereco}</div>` : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;" 
                                onclick="editarCliente(${cliente.id})">
                            <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem; color: #EF4444;" 
                                onclick="excluirCliente(${cliente.id}, '${cliente.nome.replace(/'/g, "\\'")}')">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </div>
                ${cliente.observacoes ? `
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-primary); font-size: 0.85rem; color: var(--text-secondary);">
                        ${cliente.observacoes}
                    </div>
                ` : ''}
            </div>
        `).join('');

        if (typeof lucide !== 'undefined') lucide.createIcons();

    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
        grid.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #EF4444;">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px;"></i>
                <p>Erro ao carregar clientes</p>
                <p style="font-size: 0.85rem;">${error.message}</p>
                <button class="btn btn-secondary" onclick="carregarClientes()" style="margin-top: 15px;">
                    <i data-lucide="refresh-cw" style="width: 14px; height: 14px;"></i> Tentar novamente
                </button>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

// Variável para rastrear se estamos editando
let clienteEmEdicao = null;

window.editarCliente = async function (clienteId) {
    console.log(`✏️ Editando cliente ID: ${clienteId}`);

    try {
        const response = await fetch(`${window.API_URL}/api/clientes/${clienteId}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Cliente não encontrado');
        }

        const cliente = result.data;
        clienteEmEdicao = cliente;

        // Preencher o modal com os dados do cliente
        const form = document.getElementById('form-novo-cliente');
        if (!form) {
            throw new Error('Formulário não encontrado');
        }

        // Preencher campos
        const tipoPessoaRadio = form.querySelector(`input[name="tipo_pessoa"][value="${cliente.tipo_pessoa}"]`);
        if (tipoPessoaRadio) tipoPessoaRadio.checked = true;

        const nomeInput = document.getElementById('novo-cliente-nome');
        if (nomeInput) nomeInput.value = cliente.nome || '';

        const cpfCnpjInput = document.getElementById('novo-cliente-cpf-cnpj');
        if (cpfCnpjInput) cpfCnpjInput.value = cliente.cpf_cnpj || '';

        const emailInput = document.getElementById('novo-cliente-email');
        if (emailInput) emailInput.value = cliente.email || '';

        const telefoneInput = document.getElementById('novo-cliente-telefone');
        if (telefoneInput) telefoneInput.value = cliente.telefone || '';

        const enderecoInput = document.getElementById('novo-cliente-endereco');
        if (enderecoInput) enderecoInput.value = cliente.endereco || '';

        const observacoesInput = document.getElementById('novo-cliente-observacoes');
        if (observacoesInput) observacoesInput.value = cliente.observacoes || '';

        // Atualizar título do modal
        const modalTitle = document.querySelector('#modal-novo-cliente .modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i data-lucide="edit"></i> Editar Cliente';
        }

        // Atualizar botão de submit
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i data-lucide="check"></i> Salvar Alterações';
        }

        // Abrir modal
        abrirModal('modal-novo-cliente');
        if (typeof lucide !== 'undefined') lucide.createIcons();

        console.log('✅ Modal de edição aberto para:', cliente.nome);

    } catch (error) {
        console.error('❌ Erro ao buscar cliente:', error);
        mostrarToast('error', 'Erro', 'Erro ao buscar dados do cliente: ' + error.message);
    }
};

// Limpar estado de edição quando modal fecha
const originalFecharModal = window.fecharModal;
window.fecharModal = function (modalId) {
    if (modalId === 'modal-novo-cliente') {
        clienteEmEdicao = null;

        // Restaurar título e botão originais
        const modalTitle = document.querySelector('#modal-novo-cliente .modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i data-lucide="user-plus"></i> Novo Cliente';
        }

        const submitBtn = document.querySelector('#form-novo-cliente button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i data-lucide="check"></i> Criar Cliente';
        }

        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Chamar função original
    if (originalFecharModal) {
        originalFecharModal(modalId);
    } else {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            const form = modal.querySelector('form');
            if (form) form.reset();
        }
    }
};

// Getter para verificar se está editando
window.getClienteEmEdicao = function () {
    return clienteEmEdicao;
};

// ========================================
// EXCLUIR CLIENTE
// ========================================
window.excluirCliente = async function (clienteId, nomeCliente) {
    if (!confirm(`Tem certeza que deseja excluir o cliente "${nomeCliente}"?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    console.log(`🗑️ Excluindo cliente ID: ${clienteId}`);

    try {
        const response = await fetch(`${window.API_URL}/api/clientes/${clienteId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Erro ao excluir cliente');
        }

        console.log('✅ Cliente excluído');
        mostrarToast('success', 'Sucesso', 'Cliente excluído com sucesso');

        // Recarregar lista
        await carregarClientes();

    } catch (error) {
        console.error('❌ Erro ao excluir cliente:', error);
        mostrarToast('error', 'Erro', error.message);
    }
};

console.log('✅ clientes.js carregado');
