// Version locale du site : node server.js puis http://localhost:3939
const http = require('http');
const fs = require('fs');
const path = require('path');
const { snapshot } = require('./a2s');

const WEB_PORT = Number(process.env.PORT || 3939);

let cache = null, cacheAt = 0;
async function cached() {
  if (cache && Date.now() - cacheAt < 10000) return cache;
  cache = await snapshot();
  cacheAt = Date.now();
  return cache;
}

const page = path.join(__dirname, 'index.html');
http.createServer(async (req, res) => {
  if (req.url.startsWith('/players.json')) {
    let data;
    try { data = await cached(); } catch (e) { data = { error: `Serveur injoignable (${e.message})` }; }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(page).pipe(res);
}).listen(WEB_PORT, () => console.log(`Joueurs en direct : http://localhost:${WEB_PORT}`));
