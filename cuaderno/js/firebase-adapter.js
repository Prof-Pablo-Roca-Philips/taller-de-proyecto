/* Cuaderno Digital — adaptador `firebase` (ver CONTRATO.md, puerto Cuaderno).
   ES module (necesita <script type="module">) porque el SDK de Firebase se importa
   directo desde el CDN de Google — sin npm, sin bundler, coherente con el resto del
   sitio (HTML/CSS/JS puro, GitHub Pages).

   Responsabilidad de ESTE archivo: identidad (login/logout con Google, restringido al
   dominio escolar) y hablar con la API (el Worker). NUNCA escribe directo a Firestore
   desde el navegador — todo intento pasa por el servidor, que sella uid/ts y valida el
   token (ver worker/src/index.js). El cliente no es de confianza (regla #8). */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";

var firebaseConfig = {
  apiKey: "AIzaSyBHFK7UJJMkTNbwL8HohxXajWCE8YQb7HE",
  authDomain: "taller-de-proyecto-philips.firebaseapp.com",
  projectId: "taller-de-proyecto-philips",
  storageBucket: "taller-de-proyecto-philips.firebasestorage.app",
  messagingSenderId: "848827016648",
  appId: "1:848827016648:web:3705a85f6320ef09cb8cfd"
};

var DOMINIO_ESCOLAR = "philips.edu.ar";

/* URL del Worker (API). Se completa cuando esté deployado (cuaderno/SETUP.md paso 2).
   Configurable por página vía window.CUADERNO_API_BASE, para no tocar este archivo
   página por página el día que cambie. */
var API_BASE = (typeof window !== "undefined" && window.CUADERNO_API_BASE) ||
  "https://taller-cuaderno-api.PENDIENTE-DEPLOY.workers.dev";

var app = initializeApp(firebaseConfig);
var auth = getAuth(app);

function esCuentaEscolar(email) {
  return typeof email === "string" && email.toLowerCase().endsWith("@" + DOMINIO_ESCOLAR);
}

function esperarUsuario() {
  return new Promise(function (resolve) {
    var quitar = onAuthStateChanged(auth, function (user) {
      quitar();
      resolve(user || null);
    });
  });
}

function usuarioASesion(user) {
  if (!user) return { uid: "local", nombre: "", modo: "invitado" };
  return { uid: user.uid, nombre: user.displayName || user.email || "", modo: "alumno", email: user.email };
}

function llamarApi(ruta, opciones) {
  return auth.currentUser
    ? auth.currentUser.getIdToken()
    : Promise.reject(new Error("Cuaderno(firebase): no hay sesión — iniciá sesión primero."))
  .then(function (token) {
    var init = opciones || {};
    init.headers = Object.assign(
      { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      init.headers || {}
    );
    return fetch(API_BASE + ruta, init);
  }).then(function (r) {
    if (!r.ok) return r.json().catch(function () { return {}; }).then(function (err) {
      throw new Error("Cuaderno(firebase): " + ruta + " → " + r.status + " " + (err.error || ""));
    });
    return r.json();
  });
}

function AdaptadorFirebase() {
  return {
    nombre: "firebase",

    getSesion: function () {
      return esperarUsuario().then(usuarioASesion);
    },

    login: function () {
      var provider = new GoogleAuthProvider();
      /* Filtra la pantalla de cuentas de Google al dominio escolar — comodidad de UX,
         NO es el control de seguridad real (ese vive server-side en worker/src/auth.js). */
      provider.setCustomParameters({ hd: DOMINIO_ESCOLAR });
      return signInWithPopup(auth, provider).then(function (cred) {
        var email = cred.user && cred.user.email;
        if (!esCuentaEscolar(email)) {
          return signOut(auth).then(function () {
            throw new Error("Usá tu cuenta de la escuela (@" + DOMINIO_ESCOLAR + "), no una personal.");
          });
        }
        return usuarioASesion(cred.user);
      });
    },

    logout: function () {
      return signOut(auth).then(function () { return usuarioASesion(null); });
    },

    registrarIntento: function (intento) {
      return llamarApi("/api/intentos", { method: "POST", body: JSON.stringify(intento) });
    },

    listarIntentos: function (unidad) {
      var qs = unidad ? "?unidad=" + encodeURIComponent(unidad) : "";
      return llamarApi("/api/intentos" + qs).then(function (r) { return r.intentos || []; });
    },

    exportar: function () {
      return llamarApi("/api/exportar");
    }
  };
}

if (typeof window !== "undefined" && window.Cuaderno) {
  window.Cuaderno.registrarAdaptador("firebase", AdaptadorFirebase);
} else {
  console.error("Cuaderno(firebase): cargar cuaderno/js/sdk.js ANTES de este módulo.");
}
