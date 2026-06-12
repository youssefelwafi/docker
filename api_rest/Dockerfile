# Etape 1 : image de base — node version 22
FROM NODE:22

# Etape 2 : definir le repertoire de travail dans le container
WORKDIR /app

# Etape 3 : copier package.json en premier (optimisation cache)
COPY package*.json ./

# Etape 4 : installer les dependances
RUN npm install

# Etape 5 : copier tout le reste du code
COPY . .

# Etape 6 : declarer le port utilise par l'application
EXPOSE 3000

# Etape 7 : commande de demarrage de l'application
CMD ["node", "index.js"]