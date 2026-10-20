// Requêtes Steam A2S (port de query UDP) vers le serveur Arma 3 [FR] Arcadia.
// L'API BattleMetrics est réservée aux abonnés, on interroge donc le serveur directement.
const dgram = require('dgram');

const HOST = process.env.A3_HOST || '141.94.98.217';
const QUERY_PORT = Number(process.env.A3_QPORT || 2403);

function query(payload, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const sock = dgram.createSocket('udp4');
    const timer = setTimeout(() => { sock.close(); reject(new Error('timeout')); }, timeoutMs);
    sock.on('message', (msg) => { clearTimeout(timer); sock.close(); resolve(msg); });
    sock.on('error', (e) => { clearTimeout(timer); sock.close(); reject(e); });
    sock.send(payload, QUERY_PORT, HOST);
  });
}

// Envoie une requête A2S en gérant le challenge (réponse 0x41).
async function a2s(header, body = Buffer.alloc(0)) {
  const pre = Buffer.from([0xff, 0xff, 0xff, 0xff, header]);
  let challenge = Buffer.from([0xff, 0xff, 0xff, 0xff]);
  for (let i = 0; i < 3; i++) {
    const msg = await query(Buffer.concat([pre, body, challenge]));
    if (msg[4] === 0x41) { challenge = msg.subarray(5, 9); continue; }
    return msg;
  }
  throw new Error('challenge refusé');
}

function reader(buf, off) {
  return {
    byte() { return buf[off++]; },
    short() { const v = buf.readInt16LE(off); off += 2; return v; },
    long() { const v = buf.readInt32LE(off); off += 4; return v; },
    float() { const v = buf.readFloatLE(off); off += 4; return v; },
    str() { const end = buf.indexOf(0, off); const s = buf.toString('utf8', off, end); off = end + 1; return s; },
    get off() { return off; },
  };
}

async function getInfo() {
  const msg = await a2s(0x54, Buffer.from('Source Engine Query\0', 'binary'));
  const r = reader(msg, 5);
  r.byte();
  const name = r.str(), map = r.str(); r.str();
  const mission = r.str();
  r.short();
  const players = r.byte(), maxPlayers = r.byte();
  return { name, map, mission, players, maxPlayers };
}

async function getPlayers() {
  const msg = await a2s(0x55);
  const r = reader(msg, 5);
  const count = r.byte();
  const list = [];
  for (let i = 0; i < count && r.off < msg.length; i++) {
    r.byte();
    const name = r.str();
    const score = r.long();
    const duration = r.float();
    if (name) list.push({ name, score, duration: Math.round(duration) });
  }
  return list.sort((a, b) => b.duration - a.duration);
}

async function snapshot() {
  const [info, list] = await Promise.all([getInfo(), getPlayers()]);
  return { ...info, list, updatedAt: new Date().toISOString() };
}

module.exports = { snapshot };
