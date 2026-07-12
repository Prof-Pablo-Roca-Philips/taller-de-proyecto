/* Cuaderno Digital — verificación de identidad en el SERVIDOR.
   El cliente jamás escribe puntajes directo: todo pasa por acá.
   Producción: ID token de Firebase (RS256) verificado contra las claves públicas
   de Google + chequeo de dominio escolar. Desarrollo: MODO_DEV=1 acepta el header
   X-Dev-Uid para probar sin proyecto Firebase. */

const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwksCache = { claves: null, hasta: 0 };

function b64urlAJson(seg) {
  const bin = atob(seg.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function b64urlABytes(seg) {
  const bin = atob(seg.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function obtenerClave(kid) {
  const ahora = Date.now();
  if (!jwksCache.claves || ahora > jwksCache.hasta) {
    const r = await fetch(JWKS_URL);
    if (!r.ok) throw new Error('No se pudo obtener JWKS');
    jwksCache = { claves: (await r.json()).keys, hasta: ahora + 60 * 60 * 1000 };
  }
  return jwksCache.claves.find(k => k.kid === kid) || null;
}

export async function verificarIdentidad(request, env) {
  if (env.MODO_DEV === '1') {
    const devUid = request.headers.get('X-Dev-Uid');
    if (devUid) return { uid: devUid, email: devUid + '@dev.local', nombre: devUid, modo: 'dev' };
  }

  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  const partes = token.split('.');
  if (partes.length !== 3) return null;

  let cabecera, cuerpo;
  try {
    cabecera = b64urlAJson(partes[0]);
    cuerpo = b64urlAJson(partes[1]);
  } catch (e) { return null; }

  if (cabecera.alg !== 'RS256') return null;

  const jwk = await obtenerClave(cabecera.kid);
  if (!jwk) return null;

  const clave = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const firmado = new TextEncoder().encode(partes[0] + '.' + partes[1]);
  const valida = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', clave, b64urlABytes(partes[2]), firmado);
  if (!valida) return null;

  const ahora = Math.floor(Date.now() / 1000);
  const proyecto = env.FIREBASE_PROJECT_ID;
  if (cuerpo.exp <= ahora) return null;
  if (cuerpo.aud !== proyecto) return null;
  if (cuerpo.iss !== 'https://securetoken.google.com/' + proyecto) return null;
  if (!cuerpo.sub) return null;

  const dominio = (env.DOMINIO_ESCOLAR || '').toLowerCase();
  const email = (cuerpo.email || '').toLowerCase();
  if (dominio && !email.endsWith('@' + dominio)) return null;

  return { uid: cuerpo.sub, email, nombre: cuerpo.name || email, modo: 'alumno' };
}
