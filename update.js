// Écrit players.json (lancé toutes les 5 minutes par GitHub Actions).
const fs = require('fs');
const path = require('path');
const { snapshot } = require('./a2s');

const out = path.join(__dirname, 'players.json');

snapshot()
  .then((data) => {
    fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
    console.log(`${data.players}/${data.maxPlayers} joueurs`);
  })
  .catch((e) => {
    // Serveur injoignable : on garde la dernière liste et on signale l'erreur.
    let prev = {};
    try { prev = JSON.parse(fs.readFileSync(out, 'utf8')); } catch {}
    fs.writeFileSync(out, JSON.stringify({ ...prev, error: `Serveur injoignable (${e.message})`, checkedAt: new Date().toISOString() }, null, 2) + '\n');
    console.error(e.message);
  });
