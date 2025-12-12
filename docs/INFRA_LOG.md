# INFRA_LOG.md - Registro de Infraestrutura AWS

> **Última Atualização:** 2025-12-11
> **Status:** ✅ Produção Ativa

## Arquitetura de Produção

### Domínio e Rede
| Item | Valor |
|------|-------|
| **Domínio** | geo.cogep.eng.br |
| **IP Elástico** | 98.93.78.28 |
| **Região AWS** | us-east-1 |
| **Tipo EC2** | t3.medium |

### Banco de Dados (RDS)
| Item | Valor |
|------|-------|
| **Engine** | PostgreSQL 16 + PostGIS 3.4 |
| **Identificador** | sis-marcos-db |
| **Porta** | 5432 |
| **Endpoint** | Configurado em `/home/ubuntu/deploy_aws/.env` |

### SSL/TLS
| Item | Valor |
|------|-------|
| **Provedor** | Let's Encrypt |
| **Certificado** | /etc/letsencrypt/live/geo.cogep.eng.br/ |
| **Validade** | 2026-03-11 |
| **Renovação** | Automática via container `certbot_renewer` |

---

## Containers Docker

| Container | Função | Porta Interna | Porta Externa |
|-----------|--------|---------------|---------------|
| `app_inventario_aws` | API Node.js | 3002 | - |
| `nginx_proxy_aws` | Proxy Reverso | - | 80, 443 |
| `unstructured_api_aws` | Worker Python (OCR) | 8000 | - |
| `certbot_renewer` | Renovação SSL | - | - |

---

## Estrutura de Arquivos no Servidor

```
/home/ubuntu/
├── backend/           # Código backend Node.js
├── frontend/          # Código frontend (estático)
├── Dockerfile         # Build da imagem Node
├── package.json       # Dependências
└── deploy_aws/        # Infraestrutura Docker
    ├── docker-compose.yml
    ├── .env           # Variáveis de ambiente (SENSÍVEL)
    ├── init-ssl.sh    # Script de inicialização SSL
    ├── nginx/conf.d/  # Configurações Nginx
    └── certbot/       # Certificados SSL (volume)
```

---

## Comandos Úteis

### Monitoramento
```bash
# Status dos containers
cd /home/ubuntu/deploy_aws && sudo docker-compose ps

# Logs em tempo real
sudo docker logs -f app_inventario_aws

# Health check PostgreSQL
sudo docker exec app_inventario_aws node -e "require('./backend/database/postgres-connection').healthCheck().then(console.log)"
```

### Manutenção
```bash
# Reiniciar container específico
sudo docker-compose restart app_inventario

# Limpar imagens não utilizadas
sudo docker system prune -f
```

---

## ⚠️ Notas de Segurança

- **NUNCA** commitar `.env` ou chaves `.pem` no repositório
- Arquivo `.env` contém credenciais RDS e JWT_SECRET
- Chave SSH `sis_marcos_key.pem` deve ter permissão 400
- Backups RDS configurados automaticamente pela AWS
