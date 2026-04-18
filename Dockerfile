FROM ollama/ollama:latest

# Installer Node.js
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Script de démarrage qui attend Ollama
RUN echo '#!/bin/bash\n\
ollama serve &\n\
sleep 10\n\
ollama pull llama3.2\n\
node app.js\n\
' > /start.sh && chmod +x /start.sh

EXPOSE 10000

CMD ["/start.sh"]
