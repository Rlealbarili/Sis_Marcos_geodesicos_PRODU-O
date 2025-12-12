const bcrypt = require('bcryptjs');
const { Client } = require('pg');

async function criarAdmin() {
    const client = new Client({
        host: process.env.RDS_HOST,
        user: process.env.RDS_USER || 'postgres',
        password: process.env.RDS_PASSWORD,
        database: 'marcos_geodesicos',
        port: 5432,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Conectado ao banco!');

        // Verificar se já existe admin
        const existe = await client.query("SELECT id FROM usuarios WHERE cargo = 'admin' LIMIT 1");
        if (existe.rows.length > 0) {
            console.log('Admin já existe! ID:', existe.rows[0].id);
            return;
        }

        // Hash da senha
        const senhaHash = await bcrypt.hash('CogepAdmin2024', 10);

        // Inserir admin
        const result = await client.query(
            `INSERT INTO usuarios (nome, email, senha_hash, cargo, deve_trocar_senha, ativo) 
             VALUES ($1, $2, $3, 'admin', false, true) 
             RETURNING id, nome, email, cargo`,
            ['Administrador COGEP', 'admin@cogep.eng.br', senhaHash]
        );

        console.log('Admin criado com sucesso!');
        console.log(result.rows[0]);
        console.log('\nCredenciais:');
        console.log('Email: admin@cogep.eng.br');
        console.log('Senha: CogepAdmin2024');

    } catch (error) {
        console.error('Erro:', error.message);
    } finally {
        await client.end();
    }
}

criarAdmin();
