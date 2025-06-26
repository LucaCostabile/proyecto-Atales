FROM node:16

WORKDIR /app

# Copia package.json primero para cachear dependencias
COPY package*.json ./

# Instala dependencias
RUN npm install

# Copia TODO el código del backend
COPY . .

# Puerto que usa Express (3000)
EXPOSE 3000

# Comando para iniciar el servidor
CMD ["node", "server.js"]
