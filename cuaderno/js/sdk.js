/* Cuaderno Digital — SDK (puerto `Cuaderno`, ver CONTRATO.md).
   El motor y las páginas SOLO usan este puerto. El proveedor real vive en un adaptador:
   hoy `local` (localStorage, modo invitado); en fase 1 se suma `firebase` sin tocar nada
   de lo que consume este puerto. */
(function (raiz) {
  'use strict';

  var CLAVE = 'cuaderno_v1_';

  /* ── Adaptador LOCAL: perfil en este dispositivo, sin backend ─────────────── */
  function AdaptadorLocal() {
    function leer(k, def) {
      try { return JSON.parse(localStorage.getItem(CLAVE + k)) || def; }
      catch (e) { return def; }
    }
    function escribir(k, v) { localStorage.setItem(CLAVE + k, JSON.stringify(v)); }

    return {
      nombre: 'local',
      getSesion: function () {
        return Promise.resolve({ uid: 'local', nombre: leer('nombre', ''), modo: 'invitado' });
      },
      login: function () { return this.getSesion(); },
      logout: function () { return this.getSesion(); },
      registrarIntento: function (intento) {
        var todos = leer('intentos', []);
        todos.push(intento);
        escribir('intentos', todos);
        return Promise.resolve(intento);
      },
      listarIntentos: function (unidad) {
        var todos = leer('intentos', []);
        return Promise.resolve(unidad ? todos.filter(function (i) { return i.unidad === unidad; }) : todos);
      },
      exportar: function () {
        return Promise.resolve({ v: 1, exportadoEn: new Date().toISOString(), uid: 'local', intentos: leer('intentos', []) });
      }
    };
  }

  var adaptadores = { local: AdaptadorLocal };
  var activo = null;
  var mapasCompetencias = {};   /* unidad → {mapa: {ej: [comp]}, competencias: [...]} */

  function generarId() {
    return 'it_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  var Cuaderno = {
    v: 1,

    /* Los adaptadores nuevos (firebase, intranet…) se enchufan acá sin tocar el resto. */
    registrarAdaptador: function (nombre, fabrica) { adaptadores[nombre] = fabrica; },

    init: function (opciones) {
      var nombre = (opciones && opciones.adapter) || 'local';
      if (!adaptadores[nombre]) throw new Error('Cuaderno: adaptador desconocido "' + nombre + '"');
      activo = adaptadores[nombre]();
      return activo.getSesion();
    },

    getSesion: function () { return activo.getSesion(); },
    login: function () { return activo.login(); },
    logout: function () { return activo.logout(); },

    registrarIntento: function (datos) {
      var intento = {
        v: 1,
        id: generarId(),
        uid: 'local',
        ejercicio: datos.ejercicio,
        unidad: datos.unidad,
        puntaje: Math.max(0, Math.min(1, datos.puntaje)),
        detalle: datos.detalle || {},
        ts: new Date().toISOString(),
        origen: 'web'
      };
      return activo.getSesion().then(function (s) {
        intento.uid = s.uid;
        return activo.registrarIntento(intento);
      });
    },

    listarIntentos: function (unidad) { return activo.listarIntentos(unidad); },

    /* competencias/{unidad}.json + mapa ejercicio→competencias (lo arma el motor al cargar) */
    cargarCompetencias: function (unidad, definicion, mapa) {
      mapasCompetencias[unidad] = { competencias: definicion.competencias || [], mapa: mapa || {} };
    },

    getProgreso: function (unidad) {
      var reg = mapasCompetencias[unidad];
      if (!reg) return Promise.resolve([]);
      return activo.listarIntentos(unidad).then(function (intentos) {
        return raiz.CuadernoNiveles.calcularProgreso(intentos, reg.mapa, reg.competencias);
      });
    },

    exportar: function () { return activo.exportar(); }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Cuaderno;
  else raiz.Cuaderno = Cuaderno;
})(typeof self !== 'undefined' ? self : this);
