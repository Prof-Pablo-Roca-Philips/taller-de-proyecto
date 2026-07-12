/* Cuaderno Digital — puerto `Almacen` (ver CONTRATO.md).
   El router SOLO usa este puerto. v0 trae el adaptador `memoria` (desarrollo local:
   los datos viven en el aislado y se pierden al reiniciar — dev only). En fase 1 se
   suma el adaptador `firestore` sin tocar el router. */

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

const FABRICAS = { memoria: AdaptadorMemoria };
let instancia = null;

export function crearAlmacen(env) {
  if (instancia) return instancia;
  const nombre = env.ALMACEN || 'memoria';
  const fabrica = FABRICAS[nombre];
  if (!fabrica) throw new Error('Almacen desconocido: ' + nombre);
  instancia = fabrica(env);
  return instancia;
}
