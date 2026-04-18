const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(path.join(__dirname)));

// Proxy vers Ollama (qui tourne déjà grâce au Dockerfile)
app.use('/api', createProxyMiddleware({
    target: 'http://127.0.0.1:11434',
    changeOrigin: true,
    timeout: 300000,
    proxyTimeout: 300000,
    onError: (err, req, res) => {
        console.error('Proxy error:', err.message);
        res.status(503).json({ error: 'Ollama non disponible' });
    }
}));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Serveur démarré sur port ${PORT}`);
});
