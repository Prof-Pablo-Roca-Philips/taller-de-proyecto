/* Cuaderno Digital — cliente REST mínimo de Firestore.
   Cloudflare Workers no tiene el Admin SDK de Node, así que hablamos con la REST API
   directo (fetch). Nos autenticamos reenviando el ID token del ALUMNO (ya verificado
   en auth.js) como Bearer — Firestore acepta tokens de Firebase Auth nativamente y
   aplica las Security Rules según su uid. Sin service account, sin secreto nuevo:
   la identidad ya verificada es la misma que usa Firestore para autorizar. */

const BASE = 'https://firestore.googleapis.com/v1';

function urlDocs(projectId, ruta) {
  return `${BASE}/projects/${projectId}/databases/(default)/documents/${ruta}`;
}

/* Firestore representa cada valor con un wrapper tipado: {stringValue}, {doubleValue}, etc.
   Estas dos funciones son la ida y vuelta entre eso y objetos JS planos. */
function aValorFirestore(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(aValorFirestore) } };
  if (typeof v === 'object') {
    const fields = {};
    for (const k of Object.keys(v)) fields[k] = aValorFirestore(v[k]);
    return { mapValue: { fields } };
  }
  return { stringValue: String(v) };
}

function deValorFirestore(fv) {
  if (!fv) return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('doubleValue' in fv) return fv.doubleValue;
  if ('integerValue' in fv) return Number(fv.integerValue);
  if ('nullValue' in fv) return null;
  if ('arrayValue' in fv) return (fv.arrayValue.values || []).map(deValorFirestore);
  if ('mapValue' in fv) {
    const out = {};
    const fields = fv.mapValue.fields || {};
    for (const k of Object.keys(fields)) out[k] = deValorFirestore(fields[k]);
    return out;
  }
  return null;
}

function aDocumentoFirestore(obj) {
  const fields = {};
  for (const k of Object.keys(obj)) fields[k] = aValorFirestore(obj[k]);
  return { fields };
}

function deDocumentoFirestore(doc) {
  const out = {};
  const fields = doc.fields || {};
  for (const k of Object.keys(fields)) out[k] = deValorFirestore(fields[k]);
  return out;
}

async function llamar(token, url, opciones) {
  const r = await fetch(url, {
    ...opciones,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opciones && opciones.headers) }
  });
  if (!r.ok) {
    const cuerpo = await r.text().catch(() => '');
    throw new Error(`Firestore ${r.status}: ${cuerpo.slice(0, 300)}`);
  }
  return r.status === 204 ? null : r.json();
}

export async function crearDocumento(token, projectId, coleccion, id, datos) {
  const url = urlDocs(projectId, coleccion) + `?documentId=${encodeURIComponent(id)}`;
  await llamar(token, url, { method: 'POST', body: JSON.stringify(aDocumentoFirestore(datos)) });
  return datos;
}

export async function listarDocumentos(token, projectId, coleccion) {
  let url = urlDocs(projectId, coleccion) + '?pageSize=300';
  const docs = [];
  while (url) {
    const pagina = await llamar(token, url).catch((e) => {
      /* Colección todavía vacía → Firestore devuelve 404 la primera vez. No es error real. */
      if (String(e.message).includes('404')) return { documents: [] };
      throw e;
    });
    docs.push(...(pagina.documents || []).map(deDocumentoFirestore));
    url = pagina.nextPageToken
      ? urlDocs(projectId, coleccion) + `?pageSize=300&pageToken=${encodeURIComponent(pagina.nextPageToken)}`
      : null;
  }
  return docs;
}
