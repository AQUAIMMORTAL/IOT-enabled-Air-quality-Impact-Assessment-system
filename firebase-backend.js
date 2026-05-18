// ══════════════════════════════════════════════════════════════════
//  firebase-backend.js — Aeromatrics Firebase Integration
//  Project: aerometrics-b5c84  |  Region: asia-southeast1
// ══════════════════════════════════════════════════════════════════

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword,
         createUserWithEmailAndPassword, signOut,
         onAuthStateChanged, GoogleAuthProvider,
         signInWithPopup, sendPasswordResetEmail }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, onValue, set,
         serverTimestamp as rtTS }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { getFirestore, collection, addDoc, getDocs,
         query, orderBy, limit, where,
         serverTimestamp, doc, setDoc, getDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAnalytics }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js';

// ── Init — wait for config before initializing Firebase ──────────
await window.__aeroConfigReady;

if (!window.FIREBASE_CONFIG) {
  console.error('[Firebase] Config not available — cannot initialize.');
} 

const app        = initializeApp(window.FIREBASE_CONFIG);
const analytics  = getAnalytics(app);
const auth       = getAuth(app);
const rtdb       = getDatabase(app);
const db         = getFirestore(app);
const googleProv = new GoogleAuthProvider();


let currentUser = null;

// ── Auth State — drives login page show/hide ──────────────────────
onAuthStateChanged(auth, async user => {
  currentUser = user;
  // Tell index.html that auth has resolved — pass logged-in state
  if (typeof window.__authResolved === 'function') window.__authResolved(!!user);
  if (user) {
    console.log('[Firebase] Signed in:', user.email);
    await AeroAuth._syncProfile(user);
    // Hide login page, show dashboard
    if (typeof LoginPage !== 'undefined') LoginPage.hide();
    AeroUI.updateAuthState(true, user.displayName || user.email);
  } else {
    console.log('[Firebase] Signed out');
    // Show login page, hide dashboard
    if (typeof LoginPage !== 'undefined') LoginPage.show();
    AeroUI.updateAuthState(false);
  }
});

// ══════════════════════════════════════════════════════════════════
// ── AUTH MODULE ───────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
const AeroAuth = {

  // Email + password login
  async login(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { ok: true, user: cred.user };
    } catch (e) {
      return { ok: false, error: this._err(e.code) };
    }
  },

  // Email + password register
  async register(email, password, displayName) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        displayName:     displayName || email.split('@')[0],
        photoURL:        null,
        provider:        'email',
        createdAt:       serverTimestamp(),
        savedLocations:  [],
        alertThresholds: { aqi: 150, gas: 300, temperature: 40 },
        preferences:     { defaultState: 'Uttar Pradesh' },
      });
      return { ok: true, user: cred.user };
    } catch (e) {
      return { ok: false, error: this._err(e.code) };
    }
  },

  // Google Sign-In — popup on all devices (works on modern mobile Chrome)
  async googleLogin() {
    try {
      const result  = await signInWithPopup(auth, googleProv);
      const user    = result.user;
      // Create/merge Firestore profile for Google users
      const userRef = doc(db, 'users', user.uid);
      const snap    = await getDoc(userRef);
      if (!snap.exists()) {
        await setDoc(userRef, {
          email:           user.email,
          displayName:     user.displayName || user.email.split('@')[0],
          photoURL:        user.photoURL || null,
          provider:        'google',
          createdAt:       serverTimestamp(),
          savedLocations:  [],
          alertThresholds: { aqi: 150, gas: 300, temperature: 40 },
          preferences:     { defaultState: 'Uttar Pradesh' },
        });
      }
      return { ok: true, user };
    } catch (e) {
      if (e.code === 'auth/popup-closed-by-user') return { ok: false, error: '' };
      return { ok: false, error: this._err(e.code) };
    }
  },

  // Password reset email
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: this._err(e.code) };
    }
  },

  // Logout
  async logout() {
    await signOut(auth);
  },

  // Sync profile to UI
  async _syncProfile(user) {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const name = snap.exists()
        ? (snap.data().displayName || user.email)
        : (user.displayName || user.email);
      const el = document.getElementById('authUserName');
      if (el) el.textContent = name;
    } catch(e) {}
  },

  // Friendly error messages
  _err(code) {
    return ({
      'auth/user-not-found':      'No account found with this email.',
      'auth/wrong-password':      'Incorrect password.',
      'auth/invalid-credential':  'Incorrect email or password.',
      'auth/email-already-in-use':'Email already registered.',
      'auth/weak-password':       'Password must be at least 6 characters.',
      'auth/invalid-email':       'Invalid email address.',
      'auth/too-many-requests':   'Too many attempts. Try again later.',
      'auth/network-request-failed': 'Network error. Check your connection.',
      'auth/popup-blocked':       'Popup blocked. Allow popups for this site.',
    })[code] || 'Authentication failed. Try again.';
  },
};

// ══════════════════════════════════════════════════════════════════
// ── REALTIME DATABASE — IoT LIVE FEED ────────────────────────────
// ══════════════════════════════════════════════════════════════════
const AeroRTDB = {
  _unsubs: {},

  subscribeLiveSensor(callback) {
    const r = ref(rtdb, 'sensors/live');
    const unsub = onValue(r, snap => {
      const data = snap.val();
      if (!data) return;
      callback(data);
      AeroFirestore.maybePersistSensor(data);
    });
    this._unsubs.live = unsub;
    return unsub;
  },

  subscribeSensorHistory(callback) {
    const r = ref(rtdb, 'sensors/history');
    const unsub = onValue(r, snap => {
      const data = snap.val();
      if (!data) return;
      const arr = Object.values(data)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
        .slice(-50);
      callback(arr);
    });
    this._unsubs.history = unsub;
    return unsub;
  },

  async sendAlertToDevice(type, value) {
    try {
      await set(ref(rtdb, 'alerts/current'), {
        type, value, timestamp: rtTS(), acknowledged: false,
      });
    } catch (e) {
      console.warn('[RTDB] Alert failed:', e.message);
    }
  },

  unsubAll() {
    Object.values(this._unsubs).forEach(fn => fn && fn());
    this._unsubs = {};
  },
};

// ══════════════════════════════════════════════════════════════════
// ── FIRESTORE ─────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
const AeroFirestore = {
  _lastPersist: 0,
  PERSIST_GAP:  10 * 60 * 1000,

  async saveAQIReading(name, state, lat, lon, aqiData) {
    try {
      await addDoc(collection(db, 'aqi_readings'), {
        location: name, state, lat, lon,
        aqi:      aqiData.aqi,
        pm25:     aqiData.pm25 ?? null,
        pm10:     aqiData.pm10 ?? null,
        no2:      aqiData.no2  ?? null,
        source:   aqiData.source ?? '',
        fusion:   aqiData.fusion ?? null,
        timestamp: serverTimestamp(),
        userId:   currentUser?.uid ?? 'anonymous',
      });
    } catch (e) { console.warn('[Firestore] AQI save failed:', e.message); }
  },

  async getAQIHistory(locationName, n = 24) {
    try {
      const q = query(
        collection(db, 'aqi_readings'),
        where('location', '==', locationName),
        orderBy('timestamp', 'desc'), limit(n)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
    } catch (e) { return []; }
  },

  async logAlert(type, location, value, message) {
    try {
      await addDoc(collection(db, 'alerts'), {
        type, location, value, message,
        timestamp:    serverTimestamp(),
        userId:       currentUser?.uid ?? 'anonymous',
        acknowledged: false,
      });
    } catch (e) { console.warn('[Firestore] Alert failed:', e.message); }
  },

  async getRecentAlerts(n = 20) {
    try {
      const q = query(
        collection(db, 'alerts'),
        orderBy('timestamp', 'desc'), limit(n)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { return []; }
  },

  async maybePersistSensor(data) {
    const now = Date.now();
    if (now - this._lastPersist < this.PERSIST_GAP) return;
    this._lastPersist = now;
    try {
      await addDoc(collection(db, 'sensor_readings'), {
        temperature: data.temperature ?? null,
        humidity:    data.humidity    ?? null,
        gas:         data.gas         ?? null,
        rssi:        data.rssi        ?? null,
        status:      data.status      ?? '',
        timestamp:   serverTimestamp(),
      });
    } catch (e) {}
  },

  async saveUserLocation(name, state, lat, lon) {
    if (!currentUser) return;
    const ref  = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const locs = snap.data().savedLocations || [];
    if (!locs.find(l => l.name === name)) {
      locs.push({ name, state, lat, lon });
      await setDoc(ref, { savedLocations: locs }, { merge: true });
    }
  },

  async getSavedLocations() {
    if (!currentUser) return [];
    const snap = await getDoc(doc(db, 'users', currentUser.uid));
    return snap.exists() ? (snap.data().savedLocations || []) : [];
  },
};

// ══════════════════════════════════════════════════════════════════
// ── UI HELPERS ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
const AeroUI = {
  updateAuthState(loggedIn, nameOrEmail = '') {
    const btn  = document.getElementById('authBtn');
    const info = document.getElementById('authUserName');
    if (!btn) return;
    if (loggedIn) {
      btn.textContent = 'LOGOUT';
      btn.onclick     = () => AeroAuth.logout();
      if (info) info.textContent = nameOrEmail;
    } else {
      btn.textContent = 'LOGIN';
      btn.onclick     = () => LoginPage.show();
      if (info) info.textContent = '';
    }
  },
};

// ── Expose globals ────────────────────────────────────────────────
window.AeroAuth      = AeroAuth;
window.AeroRTDB      = AeroRTDB;
window.AeroFirestore = AeroFirestore;
window.AeroUI        = AeroUI;

console.log('[Aeromatrics] Firebase backend loaded — aerometrics-b5c84');
