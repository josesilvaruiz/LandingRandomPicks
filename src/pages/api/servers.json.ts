import type { APIRoute } from 'astro';
import { getServersStatus } from '../../lib/servers';

// Estado en vivo de los servidores (lo consume la sección "Servidores" de la landing).
// No recibe parámetros: solo consulta la lista fija de src/lib/servers.ts.
export const prerender = false;

export const GET: APIRoute = async () => {
  const servers = await getServersStatus();
  return new Response(JSON.stringify({ servers }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=30',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
