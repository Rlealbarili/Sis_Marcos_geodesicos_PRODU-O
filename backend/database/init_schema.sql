-- Habilitar extensão PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabela clientes
CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(1000) NOT NULL,  -- Aumentado para acomodar nomes mais longos
    tipo_pessoa VARCHAR(10) CHECK (tipo_pessoa IN ('fisica', 'juridica')),
    cpf_cnpj VARCHAR(50) UNIQUE,  -- Aumentado para acomodar possíveis variações
    email VARCHAR(1000),  -- Aumentado para acomodar e-mails mais longos
    telefone VARCHAR(50),  -- Aumentado para acomodar formatos variados
    endereco TEXT,
    observacoes TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela propriedades
CREATE TABLE IF NOT EXISTS propriedades (
    id SERIAL PRIMARY KEY,
    nome_propriedade VARCHAR(1000) NOT NULL,  -- Aumentado para acomodar nomes mais longos
    cliente_id INTEGER REFERENCES clientes(id),
    matricula VARCHAR(500),  -- Aumentado para acomodar matrículas mais longas
    tipo VARCHAR(20) CHECK (tipo IN ('RURAL', 'URBANA', 'INDUSTRIAL', 'COMERCIAL')),
    municipio VARCHAR(500),  -- Aumentado para acomodar nomes mais longos
    comarca VARCHAR(500),  -- Aumentado para acomodar nomes mais longos
    uf VARCHAR(10),  -- Aumentado para acomodar possíveis variações
    area_m2 NUMERIC,
    perimetro_m NUMERIC,
    endereco TEXT,
    observacoes TEXT,
    geometry GEOMETRY(POLYGON, 31982),
    area_calculada NUMERIC,
    perimetro_calculado NUMERIC,
    ativo BOOLEAN DEFAULT true,
    exibir_no_mapa BOOLEAN DEFAULT true,  -- Coluna identificada na migração
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela marcos_levantados
CREATE TABLE IF NOT EXISTS marcos_levantados (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(200) UNIQUE NOT NULL,  -- Aumentado para acomodar códigos mais longos
    tipo VARCHAR(10) CHECK (tipo IN ('V', 'M', 'P')),  -- Aumentado para acomodar variações
    localizacao TEXT,
    coordenada_e NUMERIC,
    coordenada_n NUMERIC,
    altitude NUMERIC,
    geometry GEOMETRY(POINT, 31982),
    data_levantamento DATE,
    metodo VARCHAR(500),  -- Aumentado para acomodar métodos mais longos
    limites TEXT,
    precisao_e NUMERIC,
    precisao_n NUMERIC,
    precisao_h NUMERIC,
    validado BOOLEAN DEFAULT false,
    fonte VARCHAR(500),  -- Aumentado para acomodar fontes mais longas
    observacoes TEXT,
    lote VARCHAR(200),  -- Aumentado para acomodar lotes mais longos
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela vertices
CREATE TABLE IF NOT EXISTS vertices (
    id SERIAL PRIMARY KEY,
    propriedade_id INTEGER REFERENCES propriedades(id),
    nome VARCHAR(200),  -- Aumentado para acomodar nomes mais longos
    ordem INTEGER,
    utm_e NUMERIC,
    utm_n NUMERIC,
    latitude NUMERIC,
    longitude NUMERIC,
    utm_zona VARCHAR(20) DEFAULT '22S',  -- Aumentado para acomodar variações
    datum VARCHAR(50) DEFAULT 'SIRGAS2000',  -- Aumentado para acomodar variações
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices espaciais
CREATE INDEX IF NOT EXISTS idx_propriedades_geom ON propriedades USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_marcos_geom ON marcos_levantados USING GIST (geometry);

-- Índices comuns para performance
CREATE INDEX IF NOT EXISTS idx_marcos_codigo ON marcos_levantados (codigo);
CREATE INDEX IF NOT EXISTS idx_marcos_tipo ON marcos_levantados (tipo);
CREATE INDEX IF NOT EXISTS idx_propriedades_cliente ON propriedades (cliente_id);
CREATE INDEX IF NOT EXISTS idx_propriedades_municipio ON propriedades (municipio);