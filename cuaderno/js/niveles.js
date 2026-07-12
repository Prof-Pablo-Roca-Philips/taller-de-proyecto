/* Cuaderno Digital — política de niveles v1 ("mejor-intento").
   Función PURA sobre el log de intentos (ver CONTRATO.md): reemplazar esta política
   no toca datos — el progreso se recalcula entero a partir de los mismos intentos. */
(function (raiz) {
  'use strict';

  var ESCALA = [
    { nivel: 0, nombre: 'Sin evidencia' },
    { nivel: 1, nombre: 'Inicial' },
    { nivel: 2, nombre: 'En desarrollo' },
    { nivel: 3, nombre: 'Logrado' },
    { nivel: 4, nombre: 'Superado' }
  ];

  function puntajeANivel(p) {
    if (p < 0.40) return 1;
    if (p < 0.70) return 2;
    if (p < 0.95) return 3;
    return 4;
  }

  /* intentos: [{ejercicio, puntaje, ...}] · mapa: {ejercicioId: [competenciaId, ...]}
     competencias: [{id, nombre, ...}] → [{id, nombre, nivel, nombreNivel, evidencias}] */
  function calcularProgreso(intentos, mapa, competencias) {
    var mejorPorEjercicio = {};
    (intentos || []).forEach(function (it) {
      if (!it || typeof it.puntaje !== 'number') return;
      var prev = mejorPorEjercicio[it.ejercicio];
      if (prev === undefined || it.puntaje > prev) mejorPorEjercicio[it.ejercicio] = it.puntaje;
    });

    return (competencias || []).map(function (c) {
      var puntajes = [];
      Object.keys(mapa || {}).forEach(function (ej) {
        if (mapa[ej].indexOf(c.id) !== -1 && mejorPorEjercicio[ej] !== undefined) {
          puntajes.push(mejorPorEjercicio[ej]);
        }
      });
      var nivel = 0;
      if (puntajes.length) {
        var prom = puntajes.reduce(function (a, b) { return a + b; }, 0) / puntajes.length;
        nivel = puntajeANivel(prom);
      }
      return {
        id: c.id,
        nombre: c.nombre,
        nivel: nivel,
        nombreNivel: ESCALA[nivel].nombre,
        evidencias: puntajes.length
      };
    });
  }

  var api = { v: 1, ESCALA: ESCALA, puntajeANivel: puntajeANivel, calcularProgreso: calcularProgreso };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.CuadernoNiveles = api;
})(typeof self !== 'undefined' ? self : this);
