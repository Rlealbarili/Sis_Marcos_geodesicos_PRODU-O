import os
import codecs

file_path = 'frontend/analise-fundiaria.html'

print(f"🔍 Diagnosticando {file_path}...")

# Ler como binário para ver os bytes reais
with open(file_path, 'rb') as f:
    raw_bytes = f.read()

print(f"📄 Tamanho (bytes): {len(raw_bytes)}")
print(f"🔍 Início (hex): {raw_bytes[:20].hex()}")

content = ""
encoding_used = ""

# Tentar detectar e corrigir
try:
    # Tentar decodificar como UTF-8
    text = raw_bytes.decode('utf-8')
    
    # Verificar se parece Mojibake (UTF-8 interpretado como Latin1)
    # Padrão: Ã¡ (á), Ã£ (ã), ðŸ (emoji)
    if 'Ã¡' in text or 'Ã£' in text or 'ðŸ' in text:
        print("⚠️ Detectado Mojibake (UTF-8 -> Latin1). Tentando corrigir...")
        try:
            # A correção é: codificar como Latin1 (recuperar os bytes originais) e decodificar como UTF-8
            fixed_text = text.encode('latin1').decode('utf-8')
            print("✅ Correção aplicada com sucesso!")
            content = fixed_text
        except Exception as e:
            print(f"❌ Falha ao corrigir Mojibake: {e}")
            content = text # Manter original se falhar
    else:
        print("ℹ️ Texto parece OK (não é Mojibake óbvio).")
        content = text

except UnicodeDecodeError:
    print("⚠️ Falha ao ler como UTF-8. Tentando Latin1...")
    content = raw_bytes.decode('latin1')

# Remover BOM se existir (ZERO WIDTH NO-BREAK SPACE)
if content.startswith('\ufeff'):
    print("➖ Removendo BOM (UTF-8)...")
    content = content[1:]

# Aplicar modificações CAR
print("🛠️ Aplicando modificações CAR...")

# 1. Adicionar script car-layers.js
if 'car-layers.js' not in content:
    print("➕ Adicionando script car-layers.js...")
    leaflet_script = '<script src="https://unpkg.com/leaflet'
    if leaflet_script in content:
        content = content.replace(leaflet_script, '<script src="car-layers.js"></script>\n    ' + leaflet_script)
    else:
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

# 3. Remover legenda redundante (HTML)
start_marker = '<div class="map-legend">'
if start_marker in content:
    print("➖ Removendo legenda redundante...")
    start_idx = content.find(start_marker)
    # Heurística simples: encontrar o fechamento do div map-legend
    # O conteúdo tem divs aninhados?
    # <div class="legend-item">...</div>
    # Vamos contar
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
        content = content[:start_idx] + content[idx:]
        print("✅ Legenda removida.")

# Salvar
print("💾 Salvando arquivo limpo...")
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Processo concluído.")
