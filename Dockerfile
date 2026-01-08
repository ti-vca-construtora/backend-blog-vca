FROM node:20-alpine

# Diretório de trabalho dentro do container
WORKDIR /app

# Copiamos primeiro dependências (melhor cache)
COPY package*.json ./
COPY prisma ./prisma

# Instala dependências
RUN npm install

# Gera o client do Prisma
RUN npx prisma generate

# Copia o resto do código
COPY . .

# Build do NestJS
RUN npm run build

# Porta padrão da API
EXPOSE 3000

# Comando de produção
CMD ["node", "dist/main.js"]
