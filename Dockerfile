FROM ollama/ollama:latest

RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
RUN npm install
COPY . .

# Créer le script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# Désactiver l'entrypoint par défaut d'Ollama
ENTRYPOINT ["/bin/bash"]
CMD ["/start.sh"]
