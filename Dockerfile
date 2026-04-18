# Utiliser l'image officielle Ollama qui contient déjà le binaire
FROM ollama/ollama:latest

# Installer Node.js 18 LTS
RUN apt-get update && apt-get install -y curl ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Créer le dossier de l'app
WORKDIR /app

# Copier et installer les dépendances Node.js
COPY package.json ./
RUN npm install

# Copier tous les fichiers du projet
COPY . .

# Créer le dossier public si besoin
RUN mkdir -p /app/public

# Script de démarrage qui lance Ollama ET Node.js
RUN echo '#!/bin/bash\n\
echo "🚀 Démarrage Ollama..."\n\
ollama serve &\n\
OLLAMA_PID=$!\n\
\n\
# Attendre qu Ollama soit prêt\n\
sleep 15\n\
\n\
# Télécharger le modèle\n\
echo "📥 Téléchargement modèle..."\n\
ollama pull llama3.2\n\
\n\
# Démarrer le serveur Node.js\n\
echo "🌐 Démarrage serveur web..."\n\
exec node app.js\n\
' > /start.sh && chmod +x /start.sh

# Exposer le port (Render détecte automatiquement)
EXPOSE 10000

# Commande de démarrage
CMD ["/start.sh"]
