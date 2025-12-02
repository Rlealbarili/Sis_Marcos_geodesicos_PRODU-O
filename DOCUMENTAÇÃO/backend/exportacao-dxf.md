# Documentação da Exportação CAD (DXF) - Marcos Geodésicos

## Visão Geral

A funcionalidade de exportação CAD (DXF) permite gerar arquivos no formato Drawing Exchange Format (DXF) contendo a localização e identificação dos marcos geodésicos validados. Este formato é compatível com softwares CAD como AutoCAD, MicroStation, entre outros, permitindo a integração com fluxos de trabalho de engenharia.

## Endpoint da API

### GET /api/marcos/exportar-dxf

Endpoint responsável por gerar e retornar o arquivo DXF com os marcos geodésicos validados.

#### Parâmetros

Nenhum parâmetro de consulta é necessário. A API exporta automaticamente todos os marcos com `validado = true` e `geometry IS NOT NULL`.

#### Resposta

- **Status 200**: Arquivo DXF gerado com sucesso
  - Content-Type: `application/dxf`
  - Content-Disposition: `attachment; filename=marcos_inventario_[timestamp].dxf`
  - Corpo: Conteúdo do arquivo DXF

- **Status 404**: Nenhum marco validado encontrado
  - Corpo: `Nenhum marco validado para exportar.`

- **Status 500**: Erro interno no servidor
  - Corpo: `{ error: "Erro interno na geração do DXF" }`

## Estrutura do Arquivo DXF

O arquivo DXF gerado segue o padrão R12 (Release 12) para máxima compatibilidade com softwares CAD:

### Seções

1. **HEADER**: Informações de versão do AutoCAD
2. **TABLES**: Definições de layers
3. **ENTITIES**: Entidades geométricas dos marcos

### Layers

O arquivo contém dois layers principais:

- **MARCOS**: Contém os pontos representando a localização dos marcos
- **CODIGOS**: Contém os textos com os códigos dos marcos

### Entidades

Para cada marco validado, são criadas duas entidades:

1. **POINT**: Representa a localização do marco
   - Coordenadas: X (Easting), Y (Northing), Z (Altitude)
   - Layer: MARCOS

2. **TEXT**: Representa o código do marco
   - Posição: Levemente deslocada do ponto (X+0.5, Y+0.5) para evitar sobreposição
   - Conteúdo: Código do marco
   - Tamanho: 0.5
   - Layer: CODIGOS

## Formato dos Dados

### Consulta SQL

A exportação utiliza a seguinte consulta SQL:

```sql
SELECT codigo, coordenada_e, coordenada_n, altitude 
FROM marcos_levantados 
WHERE validado = true AND geometry IS NOT NULL
ORDER BY codigo
```

### Filtros Aplicados

- Apenas marcos com `validado = true` são exportados
- Apenas marcos com coordenadas válidas (`geometry IS NOT NULL`) são exportados
- Resultados ordenados por código do marco

## Acesso no Frontend

### Botão de Exportação

O botão de exportação DXF está disponível na aba de busca de marcos (`/frontend/index.html`):

- Texto: "Exportar DXF (CAD)"
- Ação: Chama a função `exportarMarcosDXF()`
- Exibe-se ao lado do botão "Exportar Excel"

### Função JavaScript

A função `exportarMarcosDXF()` no arquivo `frontend/script.js` executa:

1. Redireciona o navegador para `/api/marcos/exportar-dxf`
2. O navegador automaticamente inicia o download do arquivo

## Integração com o Sistema

- A exportação considera apenas marcos que passaram por validação
- A funcionalidade complementa o módulo de inventário de marcos
- Arquivos DXF gerados podem ser utilizados em softwares CAD para projetos técnicos

## Limitações

- O sistema não exporta marcos que não foram validados
- O sistema não exporta marcos sem coordenadas geográficas válidas
- O formato DXF R12 é usado para compatibilidade, podendo não suportar todos os recursos avançados de versões mais recentes

## Exemplo de Uso

1. Usuário acessa a aba "Buscar Marcos" no frontend
2. Clica no botão "Exportar DXF (CAD)"
3. O sistema consulta o backend para marcos validados
4. O backend gera o arquivo DXF
5. O arquivo é baixado automaticamente para o computador do usuário
6. O usuário pode abrir o arquivo em seu software CAD preferido