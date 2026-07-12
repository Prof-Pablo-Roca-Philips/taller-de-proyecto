/* Cuaderno Digital — API (Cloudflare Worker). Implementa el contrato v1
   (ver cuaderno/CONTRATO.md). El router habla con los puertos `Almacen` y
   `verificarIdentidad`; los proveedores son intercambiables. */

import { crearAlmacen } from './almacen.js';
import { verificarIdentidad } from './auth.js';
import { calcularProgreso } from './niveles.js';

function json(datos, estado, env) {
  return new Response(JSON.stringify(datos), {
    status: estado || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': env.ORIGEN_PERMITIDO || '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Dev-Uid',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    }
  });
}

async function competenciasDe(unidad, env) {
  const r = await fetch(env.COMPETENCIAS_BASE + '/cuaderno/competencias/' + unidad + '.json');
  if (!r.ok) return null;
  return r.json();
}

function generarId() {
  return 'it_' + Date.now().toString(36) + crypto.randomUUID().slice(0, 8);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return json({}, 204, env);

    const url = new URL(request.url);
    const ruta = url.pathname.replace(/\/+$/, '');
    const almacen = crearAlmacen(env);

    if (ruta === '/api/salud') {
      return json({ ok: true, contrato: 1, almacen: almacen.nombre }, 200, env);
    }

    const quien = await verificarIdentidad(request, env);
    if (!quien) return json({ error: 'no-autorizado' }, 401, env);

    if (ruta === '/api/intentos' && request.method === 'POST') {
      let datos;
      try { datos = await request.json(); }
      catch (e) { return json({ error: 'json-invalido' }, 400, env); }
      if (!datos.ejercicio || !datos.unidad || typeof datos.puntaje !== 'number') {
        return json({ error: 'faltan-campos', requeridos: ['ejercicio', 'unidad', 'puntaje'] }, 400, env);
      }
      const intento = {
        v: 1,
        id: generarId(),
        uid: quien.uid,
        ejercicio: String(datos.ejercicio),
        unidad: String(datos.unidad),
        puntaje: Math.max(0, Math.min(1, datos.puntaje)),
        detalle: datos.detalle || {},
        ts: new Date().toISOString(),
        origen: 'api'
      };
      await almacen.guardarIntento(intento);
      return json(intento, 201, env);
    }

    if (ruta === '/api/intentos' && request.method === 'GET') {
      const intentos = await almacen.listarIntentos(quien.uid, url.searchParams.get('unidad') || undefined);
      return json({ intentos }, 200, env);
    }

    const mProgreso = ruta.match(/^\/api\/progreso\/([a-z0-9-]+)$/);
    if (mProgreso && request.method === 'GET') {
      const unidad = mProgreso[1];
      const def = await competenciasDe(unidad, env);
      if (!def) return json({ error: 'unidad-desconocida', unidad }, 404, env);
      const intentos = await almacen.listarIntentos(quien.uid, unidad);
      return json({ unidad, progreso: calcularProgreso(intentos, def.ejercicios, def.competencias) }, 200, env);
    }

    if (ruta === '/api/boletin' && request.method === 'GET') {
      const unidades = (env.UNIDADES || 'u1').split(',').map(u => u.trim()).filter(Boolean);
      const boletin = { alumno: { uid: quien.uid, nombre: quien.nombre }, generado: new Date().toISOString(), unidades: [] };
      for (const unidad of unidades) {
        const def = await competenciasDe(unidad, env);
        if (!def) continue;
        const intentos = await almacen.listarIntentos(quien.uid, unidad);
        const conIntento = new Set(intentos.map(i => i.ejercicio));
        const todos = Object.keys(def.ejercicios || {});
        boletin.unidades.push({
          unidad,
          nombre: def.nombre,
          progreso: calcularProgreso(intentos, def.ejercicios, def.competencias),
          pendientes: todos.filter(e => !conIntento.has(e)),
          ejerciciosHechos: todos.filter(e => conIntento.has(e)).length,
          ejerciciosTotales: todos.length
        });
      }
      return json(boletin, 200, env);
    }

    if (ruta === '/api/exportar' && request.method === 'GET') {
      return json(await almacen.exportar(quien.uid), 200, env);
    }

    return json({ error: 'ruta-desconocida' }, 404, env);
  }
};
