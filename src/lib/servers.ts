// Estado de los servidores de CS2 para la sección "Servidores" de la landing.
//
// Se consulta cada servidor con A2S_INFO (el protocolo UDP de Valve que usa el
// navegador de servidores del juego). Por seguridad:
//   - La lista es fija aquí: el endpoint no acepta hosts ni puertos del cliente,
//     así no se puede usar la web para lanzar consultas UDP a terceros.
//   - El resultado se cachea CACHE_MS y las peticiones simultáneas comparten la
//     misma consulta: por muchas visitas que haya, cada servidor recibe como
//     mucho una consulta cada CACHE_MS.
//   - Del servidor solo se usa el mapa (recortado, y en el navegador se pinta
//     con textContent, nunca como HTML) y el número de jugadores.
import dgram from 'node:dgram';

export interface GameServer {
  id: string;
  name: string;
  mode: string;
  modeEn: string;
  host: string;
  port: number;
  /** IP para el botón de conectar: steam://connect no resuelve nombres de dominio de forma fiable. */
  ip: string;
}

export const SERVERS: GameServer[] = [
  {
    id: 'main',
    name: 'RandomPicks · Minigames',
    mode: 'Minigames · Bhop · Rangos',
    modeEn: 'Minigames · Bhop · Ranks',
    host: 'cs2.randompicks.es',
    ip: '159.195.150.62',
    port: 27015,
  },
  {
    id: 'surf',
    name: 'RandomPicks · Surf',
    mode: 'Surf · Rangos',
    modeEn: 'Surf · Ranks',
    host: 'cs2.randompicks.es',
    ip: '159.195.150.62',
    port: 27016,
  },
];

export interface ServerStatus {
  id: string;
  online: boolean;
  map?: string;
  players?: number;
  maxPlayers?: number;
}

const TIMEOUT_MS = 2000;
const CACHE_MS = 30_000;
const MAX_TEXT = 64;

const HEADER = Buffer.from([0xff, 0xff, 0xff, 0xff]);
const INFO_REQUEST = Buffer.concat([HEADER, Buffer.from('TSource Engine Query\0', 'latin1')]);

function readString(buf: Buffer, offset: number): [string, number] {
  const end = buf.indexOf(0, offset);
  if (end === -1) throw new Error('A2S: cadena sin terminar');
  return [buf.toString('utf8', offset, end).slice(0, MAX_TEXT), end + 1];
}

function parseInfo(buf: Buffer): Omit<ServerStatus, 'id' | 'online'> {
  // FF FF FF FF 'I' protocol name map folder game appid(2) players max bots ...
  let o = 6;
  let map: string;
  [, o] = readString(buf, o); // name
  [map, o] = readString(buf, o);
  [, o] = readString(buf, o); // folder
  [, o] = readString(buf, o); // game
  o += 2; // appid
  if (buf.length < o + 3) throw new Error('A2S: respuesta corta');
  const players = buf[o];
  const maxPlayers = buf[o + 1];
  const bots = buf[o + 2];
  return { map, players: Math.max(0, players - bots), maxPlayers };
}

function queryInfo(host: string, port: number): Promise<Omit<ServerStatus, 'id' | 'online'>> {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    let challenged = false;
    const finish = (err: Error | null, value?: Omit<ServerStatus, 'id' | 'online'>) => {
      clearTimeout(timer);
      socket.close();
      if (err) reject(err);
      else resolve(value!);
    };
    const timer = setTimeout(() => finish(new Error('A2S: timeout')), TIMEOUT_MS);

    socket.on('error', (err) => finish(err));
    socket.on('message', (msg, rinfo) => {
      // Solo respuestas del puerto consultado. No se filtra por IP: los servidores corren en el
      // mismo nodo con hostNetwork y la respuesta llega desde la IP interna del nodo (10.42.0.1),
      // no desde la pública, así que un socket "conectado" a la IP pública las descartaría todas.
      if (rinfo.port !== port) return;
      try {
        if (msg.length < 5 || !msg.subarray(0, 4).equals(HEADER)) throw new Error('A2S: cabecera inválida');
        const type = msg[4];
        if (type === 0x41 && msg.length >= 9 && !challenged) {
          // El servidor pide repetir la consulta con su challenge.
          challenged = true;
          socket.send(Buffer.concat([INFO_REQUEST, msg.subarray(5, 9)]), port, host);
          return;
        }
        if (type !== 0x49) throw new Error(`A2S: tipo inesperado 0x${type.toString(16)}`);
        finish(null, parseInfo(msg));
      } catch (err) {
        finish(err as Error);
      }
    });
    socket.send(INFO_REQUEST, port, host);
  });
}

let cache: { at: number; data: ServerStatus[] } | null = null;
let inflight: Promise<ServerStatus[]> | null = null;

export async function getServersStatus(): Promise<ServerStatus[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  if (!inflight) {
    inflight = Promise.all(
      SERVERS.map(async (s): Promise<ServerStatus> => {
        try {
          return { id: s.id, online: true, ...(await queryInfo(s.host, s.port)) };
        } catch (err) {
          console.error(`[servers] ${s.id} sin respuesta:`, (err as Error).message);
          return { id: s.id, online: false };
        }
      }),
    )
      .then((data) => {
        cache = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
