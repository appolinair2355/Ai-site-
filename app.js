const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Vérifier si Ollama est prêt
async function checkOllama() {
    try {
        const response = await fetch('http://127.0.0.1:11434/api/tags');
        return response.ok;
    } catch {
        return false;
    }
}

// Proxy vers Ollama
const ollamaProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:11434',
    changeOrigin: true,
    pathFilter: '/api',
    timeout: 120000,
    proxyTimeout: 120000,
    onError: (err, req, res) => {
        res.status(503).json({ error: 'Ollama non disponible' });
    }
});

app.use(ollamaProxy);

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Démarrer Ollama et le serveur
async function start() {
    console.log('🚀 Démarrage d\'Ollama...');
    
    // Lancer Ollama en arrière-plan
    const ollamaProcess = exec('ollama serve', {
        env: { ...process.env, OLLAMA_HOST: '127.0.0.1:11434' }
    });
    
    ollamaProcess.stdout.on('data', (data) => console.log(`Ollama: ${data}`));
    ollamaProcess.stderr.on('data', (data) => console.error(`Ollama: ${data}`));
    
    // Attendre qu'Ollama soit prêt
    let attempts = 0;
    while (attempts < 30) {
        if (await checkOllama()) {
            console.log('✅ Ollama est prêt !');
            break;
        }
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
    }
    
    // Télécharger le modèle par défaut si pas présent
    try {
        console.log('📥 Vérification du modèle llama3.2...');
        await execPromise('ollama pull llama3.2');
        console.log('✅ Modèle prêt !');
    } catch (err) {
        console.error('⚠️ Erreur téléchargement modèle:', err.message);
    }
    
    // Démarrer le serveur Express
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Serveur démarré sur le port ${PORT}`);
    });
}

start().catch(console.error);
