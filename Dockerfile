# Estágio 1: Imagem Base Leve
FROM node:18-alpine

# Diretório de trabalho
WORKDIR /app

# Copiar apenas arquivos de dependência primeiro (para cache do Docker)
COPY package*.json ./

# Instalar dependências de produção (menos lixo)
RUN npm install --production

# Copiar o restante do código fonte
COPY . .

# Expor a porta definida no .env (3002)
EXPOSE 3002

# Comando de inicialização do servidor
CMD ["node", "backend/server.js"]