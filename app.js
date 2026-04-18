const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 10000;

// Servir le fichier HTML statique
app.use(express.static(path.join(__dirname)));

// Proxy API Ollama
app.use('/api', createProxyMiddleware({
    target: 'http://127.0.0.1:11434',
    changeOrigin: true,
    timeout: 120000,
    proxyTimeout: 120000
}));

// Lancer Ollama
const ollama = exec('ollama serve', {
    env: { ...process.env, OLLAMA_HOST: '127.0.0.1:11434' }
});

ollama.stdout.on('data', d => console.log('Ollama:', d));
ollama.stderr.on('data', d => console.error('Ollama:', d));

// Attendre Ollama puis démarrer
setTimeout(() => {
    exec('ollama pull llama3.2', (err) => {
        if (err) console.error('Erreur pull:', err);
        else console.log('✅ Modèle prêt');
    });
    
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Serveur sur port ${PORT}`);
    });
}, 8000);
