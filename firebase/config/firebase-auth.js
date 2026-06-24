/**
 * Configuración de autenticación Firebase para el frontend
 */

const FIREBASE_CONFIG = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'taller-de-proyecto-philips.firebaseapp.com',
  projectId: 'taller-de-proyecto-philips',
  storageBucket: 'taller-de-proyecto-philips.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

class FirebaseAuth {
  constructor() {
    this.user = null;
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    if (typeof firebase === 'undefined') {
      console.error('Firebase SDK no cargado');
      return;
    }

    firebase.initializeApp(FIREBASE_CONFIG);
    this.auth = firebase.auth();
    this.db = firebase.firestore();

    this.auth.onAuthStateChanged(user => {
      this.user = user;
      if (user) {
        this.onUserLogin(user);
      } else {
        this.onUserLogout();
      }
    });

    this.isInitialized = true;
  }

  async loginWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ hd: 'escuela.edu.ar' });
      const result = await this.auth.signInWithPopup(provider);
      return result.user;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  async logout() {
    try {
      await this.auth.signOut();
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  }

  getCurrentUser() {
    return this.user;
  }

  async submitWork(submissionData) {
    if (!this.user) throw new Error('Usuario no autenticado');

    const idToken = await this.user.getIdToken();
    const response = await fetch('/.netlify/functions/api/submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        ...submissionData,
        studentUid: this.user.uid
      })
    });

    return response.json();
  }

  async requestEvaluation(submissionId, unitNumber, content, rubricId) {
    if (!this.user) throw new Error('Usuario no autenticado');

    const idToken = await this.user.getIdToken();
    const response = await fetch('/.netlify/functions/api/evaluate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        submissionId,
        studentUid: this.user.uid,
        unitNumber,
        content,
        rubricId: rubricId || `unit-${unitNumber}`
      })
    });

    return response.json();
  }

  onUserLogin(user) {
    console.log('Usuario conectado:', user.email);
    window.dispatchEvent(new CustomEvent('firebaseUserLogin', { detail: user }));
  }

  onUserLogout() {
    console.log('Usuario desconectado');
    window.dispatchEvent(new CustomEvent('firebaseUserLogout'));
  }
}

const firebaseAuth = new FirebaseAuth();
