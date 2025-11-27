import os

file_path = 'frontend/analise-fundiaria.html'

print(f"📖 Lendo {file_path}...")
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print(f"📄 Tamanho original: {len(content)} caracteres")

# 1. Adicionar script car-layers.js
if 'car-layers.js' not in content:
    print("➕ Adicionando script car-layers.js...")
    # Encontrar onde inserir (antes do Leaflet)
    leaflet_script = '<script src="https://unpkg.com/leaflet'
    if leaflet_script in content:
        content = content.replace(leaflet_script, '<script src="car-layers.js"></script>\n    ' + leaflet_script)
    else:
        print("⚠️ Script Leaflet não encontrado! Adicionando ao final do body.")
        content = content.replace('</body>', '    <script src="car-layers.js"></script>\n</body>')

# 2. Adicionar verificação CAR
verify_code = """
                // Verificar camadas CAR disponíveis
                if (typeof verificarCamadasCAR === 'function') {
                    await verificarCamadasCAR(propriedadeId);
                }"""

if 'verificarCamadasCAR' not in content:
    print("➕ Adicionando chamada verificarCamadasCAR...")
    target = 'await carregarNoMapa(propriedadeId, resultado);'
    if target in content:
        content = content.replace(target, target + '\n' + verify_code)
    else:
        print("⚠️ Ponto de inserção 'carregarNoMapa' não encontrado!")

# 3. Remover legenda redundante (HTML)
# Procurar pelo bloco <div class="map-legend">
start_marker = '<div class="map-legend">'
if start_marker in content:
    print("➖ Removendo legenda redundante...")
    start_idx = content.find(start_marker)
    # Encontrar o fechamento deste div.
    # Assumindo estrutura simples ou contagem de divs
    # Vamos tentar achar o fechamento do div map-legend
    
    # Método de contagem de balanceamento
    idx = start_idx + len(start_marker)
    balance = 1
    while balance > 0 and idx < len(content):
        if content[idx:].startswith('<div'):
            balance += 1
            idx += 4
        elif content[idx:].startswith('</div>'):
            balance -= 1
            idx += 6
        else:
            idx += 1
            
    if balance == 0:
        # Remover o bloco
        content = content[:start_idx] + content[idx:]
        print("✅ Legenda removida.")
    else:
        print("⚠️ Não foi possível determinar o fim do bloco da legenda.")

# Salvar com UTF-8
print("💾 Salvando arquivo...")
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Concluído com sucesso!")
