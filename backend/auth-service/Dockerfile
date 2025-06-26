FROM node:16-alpine
WORKDIR /app

# 1. Copiar solo lo necesario para npm install
COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001
CMD ["node", "server.js"]
