#!/bin/bash
ollama serve &
sleep 15
ollama pull llama3.2
node /app/app.js

