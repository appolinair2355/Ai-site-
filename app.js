const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const response = await fetch('http://127.0.0.1:11434/api/tags');
        if (response.ok) {
            res.json({ status: 'ok', ollama: 'connected' });
        } else {
            res.status(503).json({ status: 'error', ollama: 'not ready' });
        }
    } catch (error) {
        res.status(503).json({ status: 'error', ollama: 'offline' });
    }
});

// Proxy vers Ollama avec retry
const ollamaProxy = createProxyMiddleware({
    target: 'http://127.0.0.1:11434',
    changeOrigin: true,
    pathFilter: '/api',
    timeout: 300000, // 5 minutes pour le téléchargement du modèle
    proxyTimeout: 300000,
    onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(503).json({ error: 'Ollama non disponible. Veuillez réessayer dans quelques secondes.' });
    },
    onProxyReq: (proxyReq, req, res) => {
        console.log(`Proxying ${req.method} ${req.path} -> Ollama`);
    }
});

app.use(ollamaProxy);

// Page principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Fonction pour attendre qu'Ollama soit prêt
async function waitForOllama(maxAttempts = 60) {
    console.log('⏳ Attente du démarrage d\'Ollama...');
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch('http://127.0.0.1:11434/api/tags');
            if (response.ok) {
                console.log('✅ Ollama est prêt !');
                return true;
            }
        } catch (error) {
            // Ollama n'est pas encore prêt
        }
        await new Promise(r => setTimeout(r, 1000));
        process.stdout.write('.');
    }
    throw new Error('Ollama ne démarre pas');
}

// Démarrer tout
async function start() {
    // Lancer Ollama en arrière-plan
    console.log('🚀 Lancement d\'Ollama...');
    
    const ollamaProcess = spawn('ollama', ['serve'], {
        env: { 
            ...process.env, 
            OLLAMA_HOST: '127.0.0.1:11434',
            OLLAMA_ORIGINS: '*'
        },
        detached: false
    });

    ollamaProcess.stdout.on('data', (data) => {
        console.log(`[Ollama] ${data.toString().trim()}`);
    });

    ollamaProcess.stderr.on('data', (data) => {
        console.error(`[Ollama] ${data.toString().trim()}`);
    });

    ollamaProcess.on('error', (err) => {
        console.error('Erreur Ollama:', err);
    });

    // Attendre qu'Ollama soit prêt
    try {
        await waitForOllama();
    } catch (error) {
        console.error('❌ Impossible de démarrer Ollama:', error);
        process.exit(1);
    }

    // Télécharger le modèle si nécessaire
    console.log('📥 Vérification/Téléchargement du modèle llama3.2...');
    try {
        const pullProcess = spawn('ollama', ['pull', 'llama3.2'], {
            stdio: 'inherit'
        });
        
        await new Promise((resolve, reject) => {
            pullProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Modèle llama3.2 prêt !');
                    resolve();
                } else {
                    reject(new Error(`Pull failed with code ${code}`));
                }
            });
        });
    } catch (err) {
        console.error('⚠️ Erreur téléchargement modèle:', err.message);
        // On continue quand même, peut-être que le modèle existe déjà
    }

    // Démarrer le serveur Express
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Serveur démarré sur http://0.0.0.0:${PORT}`);
        console.log('✨ L\'assistant IA est prêt !');
    });
}

start().catch(err => {
    console.error('Erreur fatale:', err);
    process.exit(1);
});
                      
