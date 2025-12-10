/**
 * ============================================
 * ADMIN PANEL - Gestão de Usuários
 * Sistema COGEP - Protocolo Bunker
 * ============================================
 */

const AdminPanel = {
    initialized: false,

    /**
     * Inicializa o painel de administração
     */
    async init() {
        if (this.initialized) return;

        console.log('[AdminPanel] Inicializando painel de gestão...');

        // Verificar se o usuário é admin
        const user = AuthClient.getCurrentUser();
        if (!user || user.cargo !== 'admin') {
            console.log('[AdminPanel] Usuário não é admin, painel desativado');
            return;
        }

        // Mostrar menu de admin na sidebar
        this.showAdminMenu();

        // Carregar lista de usuários
        await this.loadUsers();

        this.initialized = true;
        console.log('[AdminPanel] Painel inicializado ✅');
    },

    /**
     * Mostra o menu de administração na sidebar
     */
    showAdminMenu() {
        const menuAdmin = document.getElementById('menu-admin');
        if (menuAdmin) {
            menuAdmin.style.display = 'flex';
        }
    },

    /**
     * Carrega a lista de usuários
     */
    async loadUsers() {
        try {
            const response = await fetch(`${window.API_URL}/api/auth/users`);
            const data = await response.json();

            if (response.ok) {
                this.renderUsersTable(data.usuarios);
            } else {
                console.error('[AdminPanel] Erro ao carregar usuários:', data.error);
            }
        } catch (error) {
            console.error('[AdminPanel] Erro de conexão:', error);
        }
    },

    /**
     * Renderiza a tabela de usuários
     */
    renderUsersTable(usuarios) {
        const container = document.getElementById('admin-users-grid');
        if (!container) return;

        if (!usuarios || usuarios.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">Nenhum usuário cadastrado.</p>';
            return;
        }

        container.innerHTML = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Cargo</th>
                        <th>Status</th>
                        <th>Último Login</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${usuarios.map(u => this.renderUserRow(u)).join('')}
                </tbody>
            </table>
        `;

        // Adicionar event listeners
        container.querySelectorAll('.btn-toggle-active').forEach(btn => {
            btn.addEventListener('click', () => this.toggleUserActive(btn.dataset.id));
        });

        container.querySelectorAll('.btn-reset-password').forEach(btn => {
            btn.addEventListener('click', () => this.resetUserPassword(btn.dataset.id, btn.dataset.nome));
        });
    },

    /**
     * Renderiza uma linha da tabela de usuário
     */
    renderUserRow(usuario) {
        const statusClass = usuario.ativo ? 'status-active' : 'status-inactive';
        const statusText = usuario.ativo ? 'Ativo' : 'Inativo';
        const ultimoLogin = usuario.ultimo_login
            ? new Date(usuario.ultimo_login).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
            : 'Nunca';

        const cargoClass = {
            'admin': 'cargo-admin',
            'operador': 'cargo-operador',
            'visualizador': 'cargo-visualizador'
        }[usuario.cargo] || '';

        const needsPasswordChange = usuario.deve_trocar_senha
            ? '<span class="badge-warning" title="Precisa trocar senha">🔑</span>'
            : '';

        return `
            <tr>
                <td><strong>${usuario.nome}</strong> ${needsPasswordChange}</td>
                <td>${usuario.email}</td>
                <td><span class="cargo-badge ${cargoClass}">${usuario.cargo}</span></td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${ultimoLogin}</td>
                <td class="actions-cell">
                    <button class="btn btn-small btn-secondary btn-reset-password" 
                            data-id="${usuario.id}" data-nome="${usuario.nome}"
                            title="Resetar Senha">
                        🔄
                    </button>
                    <button class="btn btn-small ${usuario.ativo ? 'btn-danger' : 'btn-success'} btn-toggle-active" 
                            data-id="${usuario.id}"
                            title="${usuario.ativo ? 'Desativar' : 'Ativar'}">
                        ${usuario.ativo ? '🚫' : '✅'}
                    </button>
                </td>
            </tr>
        `;
    },

    /**
     * Abre modal para criar novo usuário
     */
    openNewUserModal() {
        const modal = document.getElementById('modal-novo-usuario');
        if (modal) {
            modal.classList.add('active');
            // Limpar form
            document.getElementById('form-novo-usuario').reset();
            document.getElementById('novo-usuario-error').textContent = '';
        }
    },

    /**
     * Fecha modal de novo usuário
     */
    closeNewUserModal() {
        const modal = document.getElementById('modal-novo-usuario');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Cria um novo usuário
     */
    async createUser(event) {
        event.preventDefault();

        const form = document.getElementById('form-novo-usuario');
        const errorDiv = document.getElementById('novo-usuario-error');
        const btn = document.getElementById('btn-salvar-usuario');

        const nome = document.getElementById('novo-usuario-nome').value.trim();
        const email = document.getElementById('novo-usuario-email').value.trim();
        const cargo = document.getElementById('novo-usuario-cargo').value;

        if (!nome || !email) {
            errorDiv.textContent = 'Preencha todos os campos';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Criando...';
        errorDiv.textContent = '';

        try {
            const response = await fetch(`${window.API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, cargo })
            });

            const data = await response.json();

            if (response.ok) {
                // Sucesso - mostrar senha temporária
                this.closeNewUserModal();
                this.showTempPasswordModal(data.usuario, data.tempPassword);
                await this.loadUsers(); // Recarregar lista
            } else {
                errorDiv.textContent = data.error || 'Erro ao criar usuário';
            }
        } catch (error) {
            errorDiv.textContent = 'Erro de conexão';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Criar Usuário';
        }
    },

    /**
     * Mostra modal com senha temporária
     */
    showTempPasswordModal(usuario, tempPassword) {
        // Criar modal dinâmico
        const existingModal = document.getElementById('modal-temp-password');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-temp-password';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="AdminPanel.closeTempPasswordModal()"></div>
            <div class="modal-container" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">
                        <i data-lucide="check-circle" style="color: #10B981;"></i>
                        Usuário Criado!
                    </h2>
                    <button class="btn-icon close-modal" onclick="AdminPanel.closeTempPasswordModal()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 15px;">
                        <strong>${usuario.nome}</strong> foi cadastrado com sucesso.
                    </p>
                    
                    <div class="temp-password-box">
                        <label>Senha Temporária:</label>
                        <div class="password-display">
                            <code id="temp-password-value">${tempPassword}</code>
                            <button class="btn btn-small btn-secondary" onclick="AdminPanel.copyPassword('${tempPassword}')">
                                📋 Copiar
                            </button>
                        </div>
                    </div>
                    
                    <div class="alert-warning" style="margin-top: 15px;">
                        <strong>⚠️ Importante:</strong> Copie esta senha e envie ao usuário. 
                        Ela será exibida apenas uma vez. O usuário deverá alterá-la no primeiro login.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="AdminPanel.closeTempPasswordModal()">
                        Entendi
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        lucide.createIcons();
    },

    /**
     * Fecha modal de senha temporária
     */
    closeTempPasswordModal() {
        const modal = document.getElementById('modal-temp-password');
        if (modal) modal.remove();
    },

    /**
     * Copia senha para clipboard
     */
    copyPassword(password) {
        navigator.clipboard.writeText(password).then(() => {
            alert('Senha copiada para a área de transferência!');
        }).catch(() => {
            // Fallback para navegadores antigos
            const input = document.createElement('input');
            input.value = password;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert('Senha copiada!');
        });
    },

    /**
     * Ativa/desativa um usuário
     */
    async toggleUserActive(id) {
        if (!confirm('Deseja alterar o status deste usuário?')) return;

        try {
            const response = await fetch(`${window.API_URL}/api/auth/users/${id}/toggle-active`, {
                method: 'PUT'
            });

            const data = await response.json();

            if (response.ok) {
                await this.loadUsers();
            } else {
                alert(data.error || 'Erro ao alterar status');
            }
        } catch (error) {
            alert('Erro de conexão');
        }
    },

    /**
     * Reseta a senha de um usuário
     */
    async resetUserPassword(id, nome) {
        if (!confirm(`Resetar a senha de "${nome}"?\n\nUma nova senha temporária será gerada.`)) return;

        try {
            const response = await fetch(`${window.API_URL}/api/auth/admin/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });

            const data = await response.json();

            if (response.ok) {
                this.showTempPasswordModal(data.usuario, data.tempPassword);
            } else {
                alert(data.error || 'Erro ao resetar senha');
            }
        } catch (error) {
            alert('Erro de conexão');
        }
    },

    // ============================================
    // PROVISIONAMENTO DE TENANT (Protocolo Petrovich)
    // ============================================

    /**
     * Abre modal para provisionar novo tenant (Empresa + Usuário)
     */
    openProvisionTenantModal() {
        const existingModal = document.getElementById('modal-provision-tenant');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-provision-tenant';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="AdminPanel.closeProvisionTenantModal()"></div>
            <div class="modal-container" style="max-width: 550px;">
                <div class="modal-header">
                    <h2 class="modal-title">
                        🏢 Novo Inquilino (Empresa + Admin)
                    </h2>
                    <button class="btn-icon close-modal" onclick="AdminPanel.closeProvisionTenantModal()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form id="form-provision-tenant" onsubmit="AdminPanel.provisionTenant(event)">
                    <div class="modal-body">
                        <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 0.9rem;">
                            Este fluxo cria a EMPRESA e o USUÁRIO ADMIN simultaneamente, garantindo vínculo imediato.
                        </p>

                        <h4 style="margin-bottom: 10px; color: var(--accent);">📋 Dados da Empresa</h4>
                        <div class="form-group">
                            <label for="tenant-empresa-nome">Nome da Empresa *</label>
                            <input type="text" id="tenant-empresa-nome" required placeholder="Ex: Construtora João Ltda">
                        </div>
                        <div class="form-group">
                            <label for="tenant-empresa-cnpj">CPF/CNPJ (opcional)</label>
                            <input type="text" id="tenant-empresa-cnpj" placeholder="00.000.000/0000-00">
                        </div>
                        <div class="form-group">
                            <label for="tenant-empresa-email">Email da Empresa (opcional)</label>
                            <input type="email" id="tenant-empresa-email" placeholder="contato@empresa.com.br">
                        </div>

                        <hr style="margin: 20px 0; border-color: var(--border-color);">

                        <h4 style="margin-bottom: 10px; color: var(--accent);">👤 Dados do Usuário Admin</h4>
                        <div class="form-group">
                            <label for="tenant-usuario-nome">Nome do Usuário *</label>
                            <input type="text" id="tenant-usuario-nome" required placeholder="Ex: João Silva">
                        </div>
                        <div class="form-group">
                            <label for="tenant-usuario-email">Email do Usuário *</label>
                            <input type="email" id="tenant-usuario-email" required placeholder="joao@empresa.com.br">
                        </div>

                        <div id="provision-tenant-error" class="form-error" style="color: #EF4444;"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="AdminPanel.closeProvisionTenantModal()">
                            Cancelar
                        </button>
                        <button type="submit" id="btn-provision-tenant" class="btn btn-primary">
                            🚀 Provisionar Tenant
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Fecha modal de provisionamento
     */
    closeProvisionTenantModal() {
        const modal = document.getElementById('modal-provision-tenant');
        if (modal) modal.remove();
    },

    /**
     * Executa provisionamento de tenant
     */
    async provisionTenant(event) {
        event.preventDefault();

        const errorDiv = document.getElementById('provision-tenant-error');
        const btn = document.getElementById('btn-provision-tenant');

        const nome_empresa = document.getElementById('tenant-empresa-nome').value.trim();
        const cpf_cnpj = document.getElementById('tenant-empresa-cnpj').value.trim();
        const email_empresa = document.getElementById('tenant-empresa-email').value.trim();
        const nome_usuario = document.getElementById('tenant-usuario-nome').value.trim();
        const email_usuario = document.getElementById('tenant-usuario-email').value.trim();

        if (!nome_empresa || !nome_usuario || !email_usuario) {
            errorDiv.textContent = 'Preencha os campos obrigatórios';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Provisionando...';
        errorDiv.textContent = '';

        try {
            const response = await fetch(`${window.API_URL}/api/auth/provision-tenant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome_empresa, cpf_cnpj, email_empresa, nome_usuario, email_usuario })
            });

            const data = await response.json();

            if (response.ok) {
                this.closeProvisionTenantModal();
                this.showProvisionSuccessModal(data);
                await this.loadUsers();
            } else {
                errorDiv.textContent = data.error || 'Erro ao provisionar tenant';
            }
        } catch (error) {
            errorDiv.textContent = 'Erro de conexão';
        } finally {
            btn.disabled = false;
            btn.textContent = '🚀 Provisionar Tenant';
        }
    },

    /**
     * Mostra modal de sucesso do provisionamento
     */
    showProvisionSuccessModal(data) {
        const existingModal = document.getElementById('modal-provision-success');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'modal-provision-success';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="AdminPanel.closeProvisionSuccessModal()"></div>
            <div class="modal-container" style="max-width: 550px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #10B981, #059669);">
                    <h2 class="modal-title" style="color: white;">
                        ✅ Tenant Provisionado!
                    </h2>
                    <button class="btn-icon close-modal" onclick="AdminPanel.closeProvisionSuccessModal()" style="color: white;">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <p style="margin: 5px 0;"><strong>🏢 Empresa:</strong> ${data.empresa.nome} (ID: ${data.empresa.id})</p>
                        <p style="margin: 5px 0;"><strong>👤 Usuário:</strong> ${data.usuario.nome}</p>
                        <p style="margin: 5px 0;"><strong>📧 Email:</strong> ${data.usuario.email}</p>
                    </div>
                    
                    <div class="temp-password-box" style="background: #FEF3C7; padding: 15px; border-radius: 8px; border: 2px solid #F59E0B;">
                        <label style="color: #92400E; font-weight: bold;">🔑 Senha Temporária:</label>
                        <div class="password-display" style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
                            <code style="background: white; padding: 10px 15px; border-radius: 4px; font-size: 1.2rem; font-weight: bold;">${data.tempPassword}</code>
                            <button class="btn btn-small btn-secondary" onclick="AdminPanel.copyPassword('${data.tempPassword}')">
                                📋 Copiar
                            </button>
                        </div>
                    </div>
                    
                    <div class="alert-warning" style="margin-top: 15px; padding: 10px; background: #FEE2E2; border-radius: 8px;">
                        <strong>⚠️ IMPORTANTE:</strong> Copie e envie esta senha ao cliente. 
                        Esta informação <strong>NÃO será exibida novamente</strong>.
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="AdminPanel.closeProvisionSuccessModal()">
                        ✅ Entendi, senha copiada!
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Fecha modal de sucesso
     */
    closeProvisionSuccessModal() {
        const modal = document.getElementById('modal-provision-success');
        if (modal) modal.remove();
    },

    /**
     * Carrega lista de clientes para select
     */
    async loadClientesList() {
        try {
            const response = await fetch(`${window.API_URL}/api/auth/clientes-list`);
            const data = await response.json();

            if (response.ok) {
                return data.data || [];
            }
            return [];
        } catch (error) {
            console.error('[AdminPanel] Erro ao carregar clientes:', error);
            return [];
        }
    },

    /**
     * Abre modal para adicionar usuário a empresa existente
     */
    async openAddUserToClientModal() {
        const clientes = await this.loadClientesList();

        if (clientes.length === 0) {
            alert('Nenhuma empresa cadastrada. Use "Novo Inquilino" para criar uma empresa primeiro.');
            return;
        }

        const existingModal = document.getElementById('modal-add-user-client');
        if (existingModal) existingModal.remove();

        const clientesOptions = clientes.map(c =>
            `<option value="${c.id}">${c.nome}${c.cpf_cnpj ? ` (${c.cpf_cnpj})` : ''}</option>`
        ).join('');

        const modal = document.createElement('div');
        modal.id = 'modal-add-user-client';
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-backdrop" onclick="AdminPanel.closeAddUserToClientModal()"></div>
            <div class="modal-container" style="max-width: 500px;">
                <div class="modal-header">
                    <h2 class="modal-title">👤 Adicionar Usuário à Empresa</h2>
                    <button class="btn-icon close-modal" onclick="AdminPanel.closeAddUserToClientModal()">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <form id="form-add-user-client" onsubmit="AdminPanel.addUserToClient(event)">
                    <div class="modal-body">
                        <div class="form-group">
                            <label for="add-user-cliente">Empresa *</label>
                            <select id="add-user-cliente" required>
                                <option value="">-- Selecione a Empresa --</option>
                                ${clientesOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="add-user-nome">Nome do Usuário *</label>
                            <input type="text" id="add-user-nome" required placeholder="Ex: Carlos Engenheiro">
                        </div>
                        <div class="form-group">
                            <label for="add-user-email">Email *</label>
                            <input type="email" id="add-user-email" required placeholder="carlos@empresa.com.br">
                        </div>
                        <div class="form-group">
                            <label for="add-user-cargo">Cargo</label>
                            <select id="add-user-cargo">
                                <option value="operador">Operador</option>
                                <option value="visualizador">Visualizador</option>
                            </select>
                        </div>
                        <div id="add-user-client-error" class="form-error" style="color: #EF4444;"></div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="AdminPanel.closeAddUserToClientModal()">
                            Cancelar
                        </button>
                        <button type="submit" id="btn-add-user-client" class="btn btn-primary">
                            Adicionar Usuário
                        </button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();
    },

    /**
     * Fecha modal de adicionar usuário
     */
    closeAddUserToClientModal() {
        const modal = document.getElementById('modal-add-user-client');
        if (modal) modal.remove();
    },

    /**
     * Adiciona usuário a empresa existente
     */
    async addUserToClient(event) {
        event.preventDefault();

        const errorDiv = document.getElementById('add-user-client-error');
        const btn = document.getElementById('btn-add-user-client');

        const cliente_id = document.getElementById('add-user-cliente').value;
        const nome = document.getElementById('add-user-nome').value.trim();
        const email = document.getElementById('add-user-email').value.trim();
        const cargo = document.getElementById('add-user-cargo').value;

        if (!cliente_id || !nome || !email) {
            errorDiv.textContent = 'Preencha todos os campos obrigatórios';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Adicionando...';
        errorDiv.textContent = '';

        try {
            const response = await fetch(`${window.API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, cargo, cliente_id: parseInt(cliente_id) })
            });

            const data = await response.json();

            if (response.ok) {
                this.closeAddUserToClientModal();
                this.showTempPasswordModal(data.usuario, data.tempPassword);
                await this.loadUsers();
            } else {
                errorDiv.textContent = data.error || 'Erro ao adicionar usuário';
            }
        } catch (error) {
            errorDiv.textContent = 'Erro de conexão';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Adicionar Usuário';
        }
    }
};

// Inicializar quando AuthClient estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Aguardar um momento para o AuthClient inicializar primeiro
    setTimeout(() => {
        if (window.AuthClient && AuthClient.isAuthenticated()) {
            AdminPanel.init();
        }
    }, 500);
});

// Exportar para uso global
window.AdminPanel = AdminPanel;
