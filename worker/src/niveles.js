/* COPIA ESM de cuaderno/js/niveles.js — la fuente única es ese archivo.
   Ante cualquier cambio de política, editar ALLÁ y regenerar esta copia. */

export const ESCALA = [
  { nivel: 0, nombre: 'Sin evidencia' },
  { nivel: 1, nombre: 'Inicial' },
  { nivel: 2, nombre: 'En desarrollo' },
  { nivel: 3, nombre: 'Logrado' },
  { nivel: 4, nombre: 'Superado' }
];

export function puntajeANivel(p) {
  if (p < 0.40) return 1;
  if (p < 0.70) return 2;
  if (p < 0.95) return 3;
  return 4;
}

export function calcularProgreso(intentos, mapa, competencias) {
  const mejorPorEjercicio = {};
  (intentos || []).forEach(it => {
    if (!it || typeof it.puntaje !== 'number') return;
    const prev = mejorPorEjercicio[it.ejercicio];
    if (prev === undefined || it.puntaje > prev) mejorPorEjercicio[it.ejercicio] = it.puntaje;
  });

  return (competencias || []).map(c => {
    const puntajes = [];
    Object.keys(mapa || {}).forEach(ej => {
      if (mapa[ej].indexOf(c.id) !== -1 && mejorPorEjercicio[ej] !== undefined) {
        puntajes.push(mejorPorEjercicio[ej]);
      }
    });
    let nivel = 0;
    if (puntajes.length) {
      const prom = puntajes.reduce((a, b) => a + b, 0) / puntajes.length;
      nivel = puntajeANivel(prom);
    }
    return { id: c.id, nombre: c.nombre, nivel, nombreNivel: ESCALA[nivel].nombre, evidencias: puntajes.length };
  });
}
