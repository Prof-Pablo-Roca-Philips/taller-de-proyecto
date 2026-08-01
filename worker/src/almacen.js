/* Cuaderno Digital — puerto `Almacen` (ver CONTRATO.md).
   El router SOLO usa este puerto. Cada método recibe `token` como último parámetro:
   lo necesita el adaptador `firestore` (reenvía el ID token del alumno a la REST API
   de Firestore en cada llamada — no hay credencial fija que guardar al crear el
   almacén). El adaptador `memoria` lo ignora, es solo desarrollo local. */

import { crearDocumento, listarDocumentos } from './firestore.js';

function AdaptadorMemoria() {
  const porUid = new Map();

  return {
    nombre: 'memoria',
    async guardarIntento(intento) {
      if (!porUid.has(intento.uid)) porUid.set(intento.uid, []);
      porUid.get(intento.uid).push(intento);
      return intento;
    },
    async listarIntentos(uid, unidad) {
      const todos = porUid.get(uid) || [];
      return unidad ? todos.filter(i => i.unidad === unidad) : todos;
    },
    async exportar(uid) {
      return { v: 1, exportadoEn: new Date().toISOString(), uid, intentos: porUid.get(uid) || [] };
    }
  };
}

function AdaptadorFirestore(env) {
  const projectId = env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('AdaptadorFirestore: falta FIREBASE_PROJECT_ID en el Worker');

  return {
    nombre: 'firestore',
    async guardarIntento(intento, token) {
      await crearDocumento(token, projectId, `usuarios/${intento.uid}/intentos`, intento.id, intento);
      return intento;
    },
    async listarIntentos(uid, unidad, token) {
      const todos = await listarDocumentos(token, projectId, `usuarios/${uid}/intentos`);
      return unidad ? todos.filter(i => i.unidad === unidad) : todos;
    },
    async exportar(uid, token) {
      const intentos = await listarDocumentos(token, projectId, `usuarios/${uid}/intentos`);
      return { v: 1, exportadoEn: new Date().toISOString(), uid, intentos };
    }
  };
}

const FABRICAS = { memoria: AdaptadorMemoria, firestore: AdaptadorFirestore };
let instancia = null;

export function crearAlmacen(env) {
  if (instancia) return instancia;
  const nombre = env.ALMACEN || 'memoria';
  const fabrica = FABRICAS[nombre];
  if (!fabrica) throw new Error('Almacen desconocido: ' + nombre);
  instancia = fabrica(env);
  return instancia;
}
