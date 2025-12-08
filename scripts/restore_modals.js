const fs = require('fs');
const path = require('path');

// Esta tarefa é complexa - vou criar os modais completos diretamente
const targetFile = path.join(__dirname, '../frontend/index.html');
console.log(`📝 Restaurando modais completos: ${targetFile}`);

let content = fs.readFileSync(targetFile, 'utf8');

// =============================================
// MODAL 1: NOVO MARCO (Completo)
// =============================================
const modalMarcoSimples = /<div id="modal-novo-marco" class="modal">.*?<\/div><\/div><\/div>/s;

const modalMarcoCompleto = `<div id="modal-novo-marco" class="modal" style="display: none;">
        <div class="modal-backdrop" onclick="fecharModal('modal-novo-marco')"></div>
        <div class="modal-container" style="max-width: 700px;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i data-lucide="plus-circle"></i>
                    Novo Marco Geodésico
                </h2>
                <button class="btn-icon close-modal" onclick="fecharModal('modal-novo-marco')">
                    <i data-lucide="x"></i>
                </button>
            </div>

            <form id="form-novo-marco" onsubmit="return false;">
                <div class="modal-body">
                    <!-- Tipo e Código -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label class="form-label">Tipo de Marco *</label>
                            <select name="tipo" class="input" required>
                                <option value="">Selecione o tipo</option>
                                <option value="V">V - Vértice (Divisa)</option>
                                <option value="M">M - Marco de Referência</option>
                                <option value="P">P - Ponto Auxiliar</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Código *</label>
                            <input type="text" name="codigo" class="input" placeholder="Ex: FHV-M-0001" required>
                        </div>
                    </div>

                    <!-- Localização -->
                    <div class="form-group">
                        <label class="form-label">Localização *</label>
                        <input type="text" name="localizacao" class="input" placeholder="Ex: ITESP - Reage Brasil" required>
                    </div>

                    <!-- Município e Estado -->
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label class="form-label">Município *</label>
                            <input type="text" name="municipio" class="input" placeholder="Ex: Curitiba" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Estado *</label>
                            <select name="estado" class="input" required>
                                <option value="PR" selected>Paraná</option>
                                <option value="SP">São Paulo</option>
                                <option value="SC">Santa Catarina</option>
                                <option value="RS">Rio Grande do Sul</option>
                                <option value="MG">Minas Gerais</option>
                            </select>
                        </div>
                    </div>

                    <!-- Coordenadas UTM -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label class="form-label">Coord. E (m) *</label>
                            <input type="number" name="coordenada_e" class="input" placeholder="687234.56" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Coord. N (m) *</label>
                            <input type="number" name="coordenada_n" class="input" placeholder="7123456.78" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Altitude (m)</label>
                            <input type="number" name="altitude" class="input" placeholder="830.43" step="0.001">
                        </div>
                    </div>

                    <!-- Observações -->
                    <div class="form-group">
                        <label class="form-label">Observações</label>
                        <textarea name="observacoes" class="input" rows="2" placeholder="Informações adicionais..."></textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="fecharModal('modal-novo-marco')">Cancelar</button>
                    <button type="submit" class="btn btn-primary" onclick="salvarNovoMarco(event)">
                        <i data-lucide="check"></i> Criar Marco
                    </button>
                </div>
            </form>
        </div>
    </div>`;

// =============================================
// MODAL 2: NOVA PROPRIEDADE (Completo)
// =============================================
const modalPropSimples = /<div id="modal-nova-propriedade" class="modal">.*?<\/div><\/div><\/div>/s;

const modalPropCompleto = `<div id="modal-nova-propriedade" class="modal" style="display: none;">
        <div class="modal-backdrop" onclick="fecharModal('modal-nova-propriedade')"></div>
        <div class="modal-container" style="max-width: 700px;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i data-lucide="building-2"></i>
                    Nova Propriedade
                </h2>
                <button class="btn-icon close-modal" onclick="fecharModal('modal-nova-propriedade')">
                    <i data-lucide="x"></i>
                </button>
            </div>

            <form id="form-nova-propriedade" onsubmit="salvarNovaPropriedade(event)">
                <div class="modal-body">
                    <!-- Cliente -->
                    <div class="form-group">
                        <label class="form-label">Cliente</label>
                        <select class="input" id="nova-prop-cliente" name="cliente_id">
                            <option value="">Selecione o cliente (opcional)</option>
                        </select>
                    </div>

                    <!-- Nome da Propriedade -->
                    <div class="form-group">
                        <label class="form-label">Nome da Propriedade *</label>
                        <input type="text" class="input" id="nova-prop-nome" name="nome_propriedade" placeholder="Ex: Fazenda Santa Rita" required>
                    </div>

                    <!-- Matrícula e Tipo -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label class="form-label">Matrícula *</label>
                            <input type="text" class="input" id="nova-prop-matricula" name="matricula" placeholder="Ex: 12.345" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo *</label>
                            <select class="input" id="nova-prop-tipo" name="tipo" required>
                                <option value="">Selecione...</option>
                                <option value="RURAL">Rural</option>
                                <option value="URBANA">Urbana</option>
                            </select>
                        </div>
                    </div>

                    <!-- Município, Comarca, UF -->
                    <div style="display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label class="form-label">Município *</label>
                            <input type="text" class="input" id="nova-prop-municipio" name="municipio" placeholder="Ex: Campo Largo" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Comarca *</label>
                            <input type="text" class="input" id="nova-prop-comarca" name="comarca" placeholder="Ex: Campo Largo" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">UF *</label>
                            <select class="input" id="nova-prop-uf" name="uf" required>
                                <option value="PR" selected>PR</option>
                                <option value="SC">SC</option>
                                <option value="RS">RS</option>
                                <option value="SP">SP</option>
                            </select>
                        </div>
                    </div>

                    <!-- Área e Perímetro -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label class="form-label">Área (m²)</label>
                            <input type="number" step="0.01" class="input" id="nova-prop-area" name="area_m2" placeholder="Ex: 50000.00">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Perímetro (m)</label>
                            <input type="number" step="0.01" class="input" id="nova-prop-perimetro" name="perimetro_m" placeholder="Ex: 900.50">
                        </div>
                    </div>

                    <!-- Observações -->
                    <div class="form-group">
                        <label class="form-label">Observações</label>
                        <textarea class="input" id="nova-prop-observacoes" name="observacoes" rows="2" placeholder="Informações adicionais..."></textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="fecharModal('modal-nova-propriedade')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">
                        <i data-lucide="check"></i> Cadastrar Propriedade
                    </button>
                </div>
            </form>
        </div>
    </div>`;

// =============================================
// MODAL 3: NOVO CLIENTE (Completo)
// =============================================
const modalClienteSimples = /<div id="modal-novo-cliente" class="modal">.*?<\/div><\/div><\/div>/s;

const modalClienteCompleto = `<div id="modal-novo-cliente" class="modal" style="display: none;">
        <div class="modal-backdrop" onclick="fecharModal('modal-novo-cliente')"></div>
        <div class="modal-container" style="max-width: 600px;">
            <div class="modal-header">
                <h2 class="modal-title">
                    <i data-lucide="user-plus"></i>
                    Novo Cliente
                </h2>
                <button class="btn-icon close-modal" onclick="fecharModal('modal-novo-cliente')">
                    <i data-lucide="x"></i>
                </button>
            </div>

            <form id="form-novo-cliente" onsubmit="salvarNovoCliente(event)">
                <div class="modal-body">
                    <!-- Tipo de Pessoa -->
                    <div class="form-group">
                        <label class="form-label">Tipo de Pessoa *</label>
                        <div style="display: flex; gap: 20px;">
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="radio" name="tipo_pessoa" value="fisica" checked>
                                <span>Pessoa Física</span>
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                                <input type="radio" name="tipo_pessoa" value="juridica">
                                <span>Pessoa Jurídica</span>
                            </label>
                        </div>
                    </div>

                    <!-- Nome -->
                    <div class="form-group">
                        <label class="form-label">Nome Completo / Razão Social *</label>
                        <input type="text" class="input" id="novo-cliente-nome" name="nome" placeholder="Ex: João Silva ou Empresa XYZ Ltda" required>
                    </div>

                    <!-- CPF/CNPJ -->
                    <div class="form-group">
                        <label class="form-label">CPF / CNPJ</label>
                        <input type="text" class="input" id="novo-cliente-cpf-cnpj" name="cpf_cnpj" placeholder="000.000.000-00 ou 00.000.000/0000-00">
                    </div>

                    <!-- Email e Telefone -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="input" id="novo-cliente-email" name="email" placeholder="cliente@email.com">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Telefone</label>
                            <input type="tel" class="input" id="novo-cliente-telefone" name="telefone" placeholder="(00) 00000-0000">
                        </div>
                    </div>

                    <!-- Endereço -->
                    <div class="form-group">
                        <label class="form-label">Endereço Completo</label>
                        <textarea class="input" id="novo-cliente-endereco" name="endereco" rows="2" placeholder="Rua, número, bairro, cidade..."></textarea>
                    </div>

                    <!-- Observações -->
                    <div class="form-group">
                        <label class="form-label">Observações</label>
                        <textarea class="input" id="novo-cliente-observacoes" name="observacoes" rows="2" placeholder="Informações adicionais..."></textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="fecharModal('modal-novo-cliente')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">
                        <i data-lucide="check"></i> Criar Cliente
                    </button>
                </div>
            </form>
        </div>
    </div>`;

// Aplicar substituições
let count = 0;

if (content.match(modalMarcoSimples)) {
    content = content.replace(modalMarcoSimples, modalMarcoCompleto);
    console.log('✅ Modal Novo Marco atualizado');
    count++;
}

if (content.match(modalPropSimples)) {
    content = content.replace(modalPropSimples, modalPropCompleto);
    console.log('✅ Modal Nova Propriedade atualizado');
    count++;
}

if (content.match(modalClienteSimples)) {
    content = content.replace(modalClienteSimples, modalClienteCompleto);
    console.log('✅ Modal Novo Cliente atualizado');
    count++;
}

if (count > 0) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log(`\n🏁 ${count} modais atualizados com sucesso!`);
} else {
    console.log('⚠️ Nenhum modal foi atualizado. Verificando estrutura...');

    // Verificar se os modais existem
    if (content.includes('modal-novo-marco')) console.log('   - modal-novo-marco encontrado');
    if (content.includes('modal-nova-propriedade')) console.log('   - modal-nova-propriedade encontrado');
    if (content.includes('modal-novo-cliente')) console.log('   - modal-novo-cliente encontrado');
}
