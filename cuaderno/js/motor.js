/* Cuaderno Digital — motor de ejercicios v1 (ver CONTRATO.md).
   Renderiza bloques declarativos <script type="application/json" class="cd-ejercicio">
   y registra cada intento vía el puerto Cuaderno. El motor es reemplazable: las
   definiciones JSON y el log de intentos no dependen de él. */
(function (raiz) {
  'use strict';

  var unidadActual = null;
  var intentosPorEjercicio = {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(html) {
    var d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function barajar(n) {
    var idx = [];
    for (var i = 0; i < n; i++) idx.push(i);
    for (var j = n - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var t = idx[j]; idx[j] = idx[k]; idx[k] = t;
    }
    return idx;
  }

  /* ── Registro + estado del pie de cada ejercicio ─────────────────────────── */

  function registrar(def, puntaje, detalle, pie) {
    var reg = intentosPorEjercicio[def.id] = intentosPorEjercicio[def.id] || { n: 0, mejor: 0 };
    reg.n += 1;
    if (puntaje > reg.mejor) reg.mejor = puntaje;
    pie.textContent = 'Intento ' + reg.n + ' · Mejor: ' + Math.round(reg.mejor * 100) + '%';
    raiz.Cuaderno.registrarIntento({
      ejercicio: def.id, unidad: unidadActual, puntaje: puntaje, detalle: detalle
    }).then(refrescarProgreso);
    return reg;
  }

  function resultado(caja, ok, texto) {
    var r = caja.querySelector('.cd-resultado');
    r.className = 'cd-resultado ' + (ok ? 'cd-ok' : 'cd-mal');
    r.textContent = texto;
  }

  /* ── Tipos de ejercicio ──────────────────────────────────────────────────── */

  function renderOpcionMultiple(def, caja) {
    var d = def.datos, html = '';
    d.opciones.forEach(function (op, i) {
      html += '<label class="cd-opcion"><input type="radio" name="' + def.id + '" value="' + i + '"><span>' + esc(op) + '</span></label>';
    });
    caja.querySelector('.cd-cuerpo').innerHTML = html;
    caja.querySelector('.cd-corregir').addEventListener('click', function () {
      var sel = caja.querySelector('input:checked');
      if (!sel) { resultado(caja, false, 'Elegí una opción primero.'); return; }
      var i = +sel.value, ok = i === d.correcta;
      var exp = (d.explicaciones && d.explicaciones[i]) ? ' ' + d.explicaciones[i] : '';
      resultado(caja, ok, (ok ? '✔ Correcto.' : '✘ No es esa.') + exp);
      registrar(def, ok ? 1 : 0, { respuesta: i }, caja.querySelector('.cd-pie'));
    });
  }

  function renderVerdaderoFalso(def, caja) {
    var d = def.datos, html = '';
    d.afirmaciones.forEach(function (a, i) {
      html += '<div class="cd-vf" data-i="' + i + '"><div class="cd-vf-txt">' + esc(a.texto) + '</div>' +
        '<div class="cd-vf-btns"><button type="button" data-v="1">V</button><button type="button" data-v="0">F</button></div></div>';
    });
    caja.querySelector('.cd-cuerpo').innerHTML = html;
    caja.querySelectorAll('.cd-vf-btns button').forEach(function (b) {
      b.addEventListener('click', function () {
        var fila = b.closest('.cd-vf');
        fila.querySelectorAll('button').forEach(function (x) { x.classList.remove('sel'); });
        b.classList.add('sel');
      });
    });
    caja.querySelector('.cd-corregir').addEventListener('click', function () {
      var filas = caja.querySelectorAll('.cd-vf'), correctas = 0, sinResponder = 0, resp = [];
      filas.forEach(function (fila) {
        var i = +fila.dataset.i, sel = fila.querySelector('button.sel');
        if (!sel) { sinResponder++; resp.push(null); return; }
        var v = sel.dataset.v === '1';
        resp.push(v);
        var ok = v === d.afirmaciones[i].verdadera;
        if (ok) correctas++;
        fila.classList.remove('cd-fila-ok', 'cd-fila-mal');
        fila.classList.add(ok ? 'cd-fila-ok' : 'cd-fila-mal');
        var nota = fila.querySelector('.cd-vf-nota');
        if (!nota) { nota = el('<div class="cd-vf-nota"></div>'); fila.appendChild(nota); }
        nota.textContent = ok ? '' : (d.afirmaciones[i].explicacion || '');
      });
      if (sinResponder) { resultado(caja, false, 'Te faltan ' + sinResponder + ' por responder.'); return; }
      var p = correctas / filas.length;
      resultado(caja, p === 1, correctas + ' de ' + filas.length + ' correctas.');
      registrar(def, p, { respuesta: resp, correctas: correctas, total: filas.length }, caja.querySelector('.cd-pie'));
    });
  }

  function renderOrdenar(def, caja) {
    var d = def.datos, orden = [];
    var cuerpo = caja.querySelector('.cd-cuerpo');

    function pintar() {
      var html = '<div class="cd-ord-pool">';
      barajado.forEach(function (i) {
        if (orden.indexOf(i) === -1)
          html += '<button type="button" class="cd-chip" data-i="' + i + '">' + esc(d.items[i]) + '</button>';
      });
      html += '</div><div class="cd-ord-sec">';
      orden.forEach(function (i, pos) {
        html += '<button type="button" class="cd-chip cd-chip-puesto" data-i="' + i + '"><b>' + (pos + 1) + '.</b> ' + esc(d.items[i]) + '</button>';
      });
      html += orden.length ? '' : '<span class="cd-hint">Tocá los pasos en el orden correcto…</span>';
      html += '</div>';
      cuerpo.innerHTML = html;
      cuerpo.querySelectorAll('.cd-chip').forEach(function (ch) {
        ch.addEventListener('click', function () {
          var i = +ch.dataset.i, pos = orden.indexOf(i);
          if (pos === -1) orden.push(i); else orden.splice(pos, 1);
          pintar();
        });
      });
    }

    var barajado = barajar(d.items.length);
    /* si el azar dejó el orden ya resuelto, rota uno */
    if (barajado.join() === d.items.map(function (_, i) { return i; }).join()) barajado.push(barajado.shift());
    pintar();

    caja.querySelector('.cd-corregir').addEventListener('click', function () {
      if (orden.length !== d.items.length) { resultado(caja, false, 'Ordená todos los pasos primero.'); return; }
      var correctas = 0;
      orden.forEach(function (i, pos) { if (i === pos) correctas++; });
      var p = correctas / d.items.length;
      resultado(caja, p === 1, p === 1 ? '✔ Orden perfecto.' : correctas + ' de ' + d.items.length + ' en su lugar. Probá de nuevo.');
      registrar(def, p, { respuesta: orden.slice(), correctas: correctas, total: d.items.length }, caja.querySelector('.cd-pie'));
      if (p < 1) { orden = []; setTimeout(pintar, 1600); }
    });
  }

  function renderNumerico(def, caja) {
    var d = def.datos, fallidos = 0;
    caja.querySelector('.cd-cuerpo').innerHTML =
      '<div class="cd-num"><input type="number" step="any" class="cd-num-inp" placeholder="Tu respuesta">' +
      (d.unidad ? '<span class="cd-num-uni">' + esc(d.unidad) + '</span>' : '') + '</div>';
    caja.querySelector('.cd-corregir').addEventListener('click', function () {
      var inp = caja.querySelector('.cd-num-inp');
      if (inp.value === '') { resultado(caja, false, 'Escribí un valor.'); return; }
      var v = parseFloat(inp.value), tol = d.tolerancia || 0;
      var ok = Math.abs(v - d.respuesta) <= tol;
      if (ok) resultado(caja, true, '✔ Correcto: ' + d.respuesta + (d.unidad ? ' ' + d.unidad : '') + '.');
      else {
        fallidos++;
        var pista = fallidos >= 3 ? ' Solución: ' + d.respuesta + (d.unidad ? ' ' + d.unidad : '') + '.' : (d.pista ? ' Pista: ' + d.pista : '');
        resultado(caja, false, '✘ No es ese valor.' + pista);
      }
      registrar(def, ok ? 1 : 0, { respuesta: v }, caja.querySelector('.cd-pie'));
    });
  }

  var TIPOS = {
    'opcion-multiple': renderOpcionMultiple,
    'verdadero-falso': renderVerdaderoFalso,
    'ordenar': renderOrdenar,
    'numerico': renderNumerico
  };

  /* ── Widget de progreso por competencia ──────────────────────────────────── */

  function refrescarProgreso() {
    document.querySelectorAll('.cd-progreso').forEach(function (w) {
      raiz.Cuaderno.getProgreso(w.dataset.unidad || unidadActual).then(function (prog) {
        if (!prog.length) return;
        var html = '';
        prog.forEach(function (c) {
          html += '<div class="cd-comp"><div class="cd-comp-cab"><span>' + esc(c.nombre) + '</span>' +
            '<span class="cd-comp-niv cd-niv-' + c.nivel + '">' + esc(c.nombreNivel) + '</span></div>' +
            '<div class="cd-barra"><div class="cd-barra-f cd-niv-' + c.nivel + '" style="width:' + (c.nivel * 25) + '%"></div></div></div>';
        });
        html += '<div class="cd-modo">Modo invitado — el progreso se guarda en este dispositivo. Con tu cuenta de la escuela vas a poder verlo desde cualquier lado.</div>';
        w.innerHTML = html;
      });
    });
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */

  function init(opciones) {
    unidadActual = opciones.unidad;
    raiz.Cuaderno.init({ adapter: opciones.adapter || 'local' });

    var mapa = {};
    document.querySelectorAll('script.cd-ejercicio[type="application/json"]').forEach(function (bloque) {
      var def;
      try { def = JSON.parse(bloque.textContent); }
      catch (e) { return; }
      if (!TIPOS[def.tipo]) return;
      mapa[def.id] = def.competencias || [];

      var caja = el(
        '<div class="cd-caja" id="cd-' + esc(def.id) + '">' +
        '<div class="cd-consigna">' + esc(def.consigna) + '</div>' +
        '<div class="cd-cuerpo"></div>' +
        '<div class="cd-acciones"><button type="button" class="cd-corregir">Corregir</button>' +
        '<span class="cd-resultado"></span></div>' +
        '<div class="cd-pie"></div></div>'
      );
      bloque.parentNode.insertBefore(caja, bloque.nextSibling);
      TIPOS[def.tipo](def, caja);
    });

    if (opciones.competenciasUrl) {
      fetch(opciones.competenciasUrl)
        .then(function (r) { return r.json(); })
        .then(function (def) {
          /* el mapa canónico ejercicio→competencias vive en el JSON (lo comparte el
             Worker); los bloques de la página solo lo complementan */
          var mapaFinal = {};
          Object.keys(mapa).forEach(function (k) { mapaFinal[k] = mapa[k]; });
          Object.keys(def.ejercicios || {}).forEach(function (k) { mapaFinal[k] = def.ejercicios[k]; });
          raiz.Cuaderno.cargarCompetencias(unidadActual, def, mapaFinal);
          refrescarProgreso();
        })
        .catch(function () { /* sin red o file:// — los ejercicios funcionan igual */ });
    }
  }

  raiz.CuadernoMotor = { v: 1, init: init };
})(typeof self !== 'undefined' ? self : this);
