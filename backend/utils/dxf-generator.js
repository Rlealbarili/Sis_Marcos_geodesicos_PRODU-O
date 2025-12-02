/**
 * Gerador de arquivos DXF para marcos geodésicos
 * Formato DXF R12 para máxima compatibilidade
 */

function gerarDXF(marcos) {
    // Início do arquivo DXF
    let dxfContent = `0
SECTION
2
HEADER
9
$ACADVER
1
AC1009
0
ENDSEC
`;

    // Tabelas
    dxfContent += `0
SECTION
2
TABLES
0
TABLE
2
LAYER
70
2
0
LAYER
2
MARCOS
70
0
62
7
6
CONTINUOUS
0
LAYER
2
CODIGOS
70
0
62
3
6
CONTINUOUS
0
ENDTAB
0
ENDSEC
`;

    // Entidades
    dxfContent += `0
SECTION
2
ENTITIES
`;

    // Adiciona pontos e textos para cada marco
    marcos.forEach(marco => {
        // Ponto (POINT)
        dxfContent += `0
POINT
8
MARCOS
10
${marco.coordenada_e}
20
${marco.coordenada_n}
30
${marco.altitude || 0}
`;

        // Texto do código (TEXT)
        dxfContent += `0
TEXT
8
CODIGOS
10
${marco.coordenada_e + 0.5}  // Deslocamento leve para evitar sobreposição
20
${marco.coordenada_n + 0.5}
30
0.0
40
0.5
1
${marco.codigo}
7
STANDARD
50
0.0
`;

    });

    dxfContent += `0
ENDSEC
0
EOF
`;

    return dxfContent;
}

module.exports = { gerarDXF };