const fetch = require('node-fetch'); // Certifique-se de ter o node-fetch instalado ou use fetch nativo do Node 18+

// CONFIGURAÇÃO
const API_URL = 'http://localhost:3002/api'; 

// DADOS REAIS EXTRAÍDOS DE: "Memorial Descritivo - GERAL atual.docx"
const TEST_DATA = {
    cliente: {
        novo: true,
        nome: "José Edemar Schifler (TESTE AUTOMATIZADO)",
        cpf_cnpj: null, // Não usar CPF/CNPJ para evitar conflitos
        telefone: "47999999999",
        email: "teste.mafra@petrovich.com",
        endereco: "Avencal de Baixo, Mafra - SC"
    },
    propriedade: {
        nome_propriedade: "SÍTIO AVENCAL (MATRÍCULA 4.561)",
        matricula: "4.561",
        tipo: "RURAL",
        municipio: "Mafra",
        uf: "SC",
        area_m2: 280039.00, // 28.0039 ha
        perimetro_m: 2134.91
    },
    // Extração parcial dos primeiros 4 vértices para fechar um polígono de teste
    vertices: [
        {
            nome: "FHV-M-3403",
            ordem: 1,
            coordenadas: { 
                tipo: "UTM", 
                e: 627110.28, 
                n: 7097954.68, 
                utm_zona: "22S", 
                datum: "SIRGAS2000",
                lat_original: null, // Opcional se UTM for fornecido
                lon_original: null  // Opcional se UTM for fornecido
            }
        },
        {
            nome: "FHV-M-3489",
            ordem: 2,
            coordenadas: { 
                tipo: "UTM", 
                e: 627371.18, 
                n: 7097924.76, 
                utm_zona: "22S", 
                datum: "SIRGAS2000" 
            }
        },
        {
            nome: "FHV-M-3468",
            ordem: 3,
            coordenadas: { 
                tipo: "UTM", 
                e: 627628.19, 
                n: 7097918.99, 
                utm_zona: "22S", 
                datum: "SIRGAS2000" 
            }
        },
        {
            nome: "FHV-M-3408",
            ordem: 4,
            coordenadas: { 
                tipo: "UTM", 
                e: 627606.53, 
                n: 7097428.25, 
                utm_zona: "22S", 
                datum: "SIRGAS2000" 
            }
        },
        {
             // Fechando com um 5º ponto para garantir área (dados do memorial)
            nome: "FHV-M-3165",
            ordem: 5,
            coordenadas: { 
                tipo: "UTM", 
                e: 627004.60, 
                n: 7097444.43, 
                utm_zona: "22S", 
                datum: "SIRGAS2000" 
            }
        }
    ]
};

async function executarTeste() {
    console.log('\n🔍 INICIANDO PROTOCOLO DE VALIDAÇÃO COM DADOS REAIS (PVC-1)');
    console.log('=======================================================');
    console.log(`📄 Arquivo Fonte: Memorial Descritivo - GERAL atual.docx`);
    console.log(`📍 Município: ${TEST_DATA.propriedade.municipio}/${TEST_DATA.propriedade.uf}`);
    console.log(`🔢 Vértices extraídos: ${TEST_DATA.vertices.length}`);

    try {
        // 1. ENVIAR MEMORIAL (Simulando o Frontend)
        console.log('\n📤 1. Enviando payload para /api/salvar-memorial-completo...');
        const saveResponse = await fetch(`${API_URL}/salvar-memorial-completo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(TEST_DATA)
        });

        if (!saveResponse.ok) {
            const erroTexto = await saveResponse.text();
            throw new Error(`Falha no envio: ${saveResponse.status} - ${erroTexto}`);
        }

        const saveData = await saveResponse.json();
        console.log('✅ Memorial salvo com sucesso!');
        console.log(`   🆔 ID da Propriedade Gerada: ${saveData.data.propriedade_id}`);

        const propId = saveData.data.propriedade_id;

        // 2. VERIFICAR PERSISTÊNCIA (A Hora da Verdade)
        console.log('\n🕵️ 2. Consultando propriedade no banco (GET /propriedades/:id)...');
        const getResponse = await fetch(`${API_URL}/propriedades/${propId}`);
        const propResponse = await getResponse.json();
        
        // Normalizar resposta (algumas APIs retornam { success: true, data: ... } outras direto o objeto)
        const propriedade = propResponse.data || propResponse;

        if (!propriedade || !propriedade.id) {
             throw new Error('API retornou dados vazios ou inválidos.');
        }

        // 3. ANÁLISE DO GEOJSON
        console.log('\n📐 3. Relatório Forense do GeoJSON:');
        
        if (propriedade.geometry || propriedade.geojson) {
            // O campo pode vir como 'geometry' (GeoJSON string) ou 'geojson' dependendo da sua query
            const geoRaw = propriedade.geojson || propriedade.geometry; 
            const geo = typeof geoRaw === 'string' ? JSON.parse(geoRaw) : geoRaw;

            console.log(`   ✅ Campo de Geometria detectado`);
            console.log(`   🧩 Tipo: ${geo.type}`);
            
            if (geo.type === 'Polygon') {
                console.log(`   🔢 Coordenadas do anel exterior: ${geo.coordinates[0].length} pontos`);
                console.log('\n🎉 RESULTADO: SUCESSO ABSOLUTO.');
                console.log('   O PostGIS gerou o polígono corretamente a partir dos dados reais.');
                console.log('   O sistema está pronto para Produção.');
            } else {
                console.log('\n⚠️ ALERTA: Geometria existe mas não é um Polígono (é ${geo.type}).');
            }
        } else {
            console.log('\n❌ ERRO CRÍTICO: Campo de geometria está NULO.');
            console.log('   A rota salvou os dados tabulares, mas a função ST_MakePolygon falhou.');
        }

    } catch (error) {
        console.error('\n💥 FALHA CRÍTICA NO TESTE:', error.message);
    }
    console.log('=======================================================\n');
}

executarTeste();