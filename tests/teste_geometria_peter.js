const fetch = require('node-fetch'); // Requer node-fetch instalado

// CONFIGURAÇÃO
const API_URL = 'http://localhost:3002/api'; 

// DADOS REAIS EXTRAÍDOS DE: "Memorial-Peter.docx"
// Loteamento Carmery II - Pontal do Paraná
const TEST_DATA = {
    cliente: {
        novo: true,
        nome: "Christopher Peter Bueno Netto (TESTE AUTOMATIZADO)", //
        cpf_cnpj: "000.111.222-33", 
        telefone: "41988887777",
        email: "peter.carmery@teste.com",
        endereco: "Loteamento Carmery II, Pontal do Paraná - PR"
    },
    propriedade: {
        nome_propriedade: "LOTEAMENTO CARMERY II (MATRÍCULA 843)", //
        matricula: "843", //
        tipo: "URBANA", // Loteamento/Urbano
        municipio: "Pontal do Paraná", //
        uf: "PR",
        area_m2: 28966.53, //
        perimetro_m: 1259.28 //
    },
    // Extração dos 4 primeiros vértices para formar um polígono de teste
    // O backend deve fechar o polígono automaticamente
    vertices: [
        {
            nome: "M01",
            ordem: 1,
            coordenadas: { 
                tipo: "UTM", 
                e: 757919.735, //
                n: 7162638.648, 
                utm_zona: "22S", 
                datum: "SIRGAS2000"
            }
        },
        {
            nome: "M02",
            ordem: 2,
            coordenadas: { 
                tipo: "UTM", 
                e: 757930.367, //
                n: 7162649.590, 
                utm_zona: "22S", 
                datum: "SIRGAS2000" 
            }
        },
        {
            nome: "M03",
            ordem: 3,
            coordenadas: { 
                tipo: "UTM", 
                e: 757992.290, //
                n: 7162710.944, 
                utm_zona: "22S", 
                datum: "SIRGAS2000" 
            }
        },
        {
            nome: "M04",
            ordem: 4,
            coordenadas: { 
                tipo: "UTM", 
                e: 758015.514, //
                n: 7162691.151, 
                utm_zona: "22S", 
                datum: "SIRGAS2000" 
            }
        }
    ]
};

async function executarTestePeter() {
    console.log('\n🌊 INICIANDO PROTOCOLO "CARMERY II" (VALIDAÇÃO LITORÂNEA)');
    console.log('=======================================================');
    console.log(`📄 Arquivo Fonte: Memorial-Peter.docx`);
    console.log(`📍 Município: ${TEST_DATA.propriedade.municipio}/${TEST_DATA.propriedade.uf}`);
    console.log(`🏗️ Tipo: ${TEST_DATA.propriedade.tipo}`);

    try {
        // 1. ENVIAR MEMORIAL
        console.log('\n📤 1. Injetando dados no sistema...');
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
        console.log('✅ Memorial processado e salvo!');
        console.log(`   🆔 ID Gerado: ${saveData.data.propriedade_id}`);

        const propId = saveData.data.propriedade_id;

        // 2. CONSULTAR E VERIFICAR GEOMETRIA
        console.log('\n🕵️ 2. Auditando geometria no PostGIS...');
        const getResponse = await fetch(`${API_URL}/propriedades/${propId}`);
        const propResponse = await getResponse.json();
        
        const propriedade = propResponse.data || propResponse;

        if (!propriedade || !propriedade.id) {
             throw new Error('API retornou vazio. O fantasma dos dados perdidos retornou?');
        }

        // 3. ANÁLISE FORENSE
        console.log('\n📐 3. Análise Estrutural do GeoJSON:');
        
        if (propriedade.geometry || propriedade.geojson) {
            const geoRaw = propriedade.geojson || propriedade.geometry; 
            const geo = typeof geoRaw === 'string' ? JSON.parse(geoRaw) : geoRaw;

            console.log(`   ✅ Geometria presente`);
            console.log(`   🧩 Tipo: ${geo.type}`);
            
            if (geo.type === 'Polygon') {
                // Um polígono fechado com 4 vértices de entrada deve ter 5 coordenadas (4 + fechamento)
                const numPontos = geo.coordinates[0].length;
                console.log(`   🔢 Pontos no anel: ${numPontos}`);
                
                if (numPontos >= 5) {
                    console.log('\n🏆 VEREDITO: SISTEMA OPERACIONAL.');
                    console.log('   Polígono "Peter" criado com sucesso.');
                    console.log('   O fechamento automático de geometria funcionou.');
                } else {
                     console.log('\n⚠️ ALERTA: Polígono criado, mas contagem de pontos suspeita.');
                }
            } else {
                console.log(`\n❌ FALHA: Esperado Polygon, recebido ${geo.type}.`);
            }
        } else {
            console.log('\n❌ ERRO FATAL: Propriedade salva SEM geometria.');
        }

    } catch (error) {
        console.error('\n💥 FALHA NO TESTE:', error.message);
    }
    console.log('=======================================================\n');
}

executarTestePeter();