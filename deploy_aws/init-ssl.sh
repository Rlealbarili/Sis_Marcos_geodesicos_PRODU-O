#!/bin/bash

if [ ! -f .env ]; then
  echo "❌ Erro: Arquivo .env não encontrado. Renomeie .env.example e configure-o."
  exit 1
fi

# Carregar variáveis
export $(grep -v '^#' .env | xargs)

if [ -z "$DOMAIN_NAME" ]; then
  echo "❌ Erro: DOMAIN_NAME não definido no .env"
  exit 1
fi

echo "🔒 Solicitando certificado SSL para $DOMAIN_NAME..."

# 1. Subir apenas o Nginx para responder ao desafio ACME
docker-compose up -d nginx

# 2. Rodar Certbot para obter o certificado
docker-compose run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    --email $EMAIL_SSL \
    -d $DOMAIN_NAME \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal" certbot

echo "🔄 Reiniciando Nginx para aplicar certificado..."
docker-compose restart nginx

echo "✅ Processo concluído! Acesse https://$DOMAIN_NAME"
