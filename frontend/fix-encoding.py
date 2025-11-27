#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import codecs

print('📝 Corrigindo encoding UTF-8...')

# Ler arquivo com encoding UTF-8
with codecs.open('frontend/analise-fundiaria-backup.html', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'📄 Lido: {len(content)} caracteres')

# 1. Adicionar script car-layers.js
old_script = '    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'
new_script = '    <script src="car-layers.js"></script>\r\n    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>'

if old_script in content:
    content = content.replace(old_script, new_script)
    print('✅ Script CAR adicionado')
else:
    print('⚠️  Tag script Leaflet não encontrada')

# 2. Adicionar verificação CAR
old_load = 'await carregarNoMapa(propriedadeId, resultado);'
new_load = '''await carregarNoMapa(propriedadeId, resultado);

                // Verificar camadas CAR disponíveis
                await verificarCamadasCAR(propriedadeId);'''

if old_load in content:
    content = content.replace(old_load, new_load)
    print('✅ Verificação CAR adicionada')
else:
    print('⚠️  carregarNoMapa não encontrado')

# Salvar com UTF-8 BOM
with codecs.open('frontend/analise-fundiaria.html', 'w', encoding='utf-8-sig') as f:
    f.write(content)

print('✅ Arquivo salvo com UTF-8 BOM')

# Verificar
with codecs.open('frontend/analise-fundiaria.html', 'r', encoding='utf-8-sig') as f:
    verify = f.read()
    
has_car_script = 'car-layers.js' in verify
has_emoji = '🔍' in verify
has_verify_car = 'verificarCamadasCAR' in verify

print('\n📊 Verificações:')
print(f'   Script CAR: {"✅" if has_car_script else "❌"}')
print(f'   Emojis OK: {"✅" if has_emoji else "❌"}')  
print(f'   Função verify: {"✅" if has_verify_car else "❌"}')
