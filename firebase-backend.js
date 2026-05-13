// ══════════════════════════════════════════════════════════════════
//  firebase-backend.js — Aeromatrics Firebase Integration
//  Project: aerometrics-b5c84
//  Region:  asia-southeast1 (Singapore)
// ══════════════════════════════════════════════════════════════════

import { initializeApp }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword,
         createUserWithEmailAndPassword,
         signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, onValue, set, push,
         serverTimestamp as rtTS }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { getFirestore, collection, addDoc, getDocs,
         query, orderBy, limit, where,
         serverTimestamp, doc, setDoc, getDoc }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAnalytics }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js';

// ── Init ─────────────────────────────────────────────────────────
const app       = initializeApp(FIREBASE_CONFIG);
const analytics = getAnalytics(app);
const auth      = getAuth(app);
const rtdb      = getDatabase(app);
const db        = getFirestore(app);

let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    console.log('[Firebase] Signed in:', user.email);
    AeroAuth.onLogin(user);
  } else {
    console.log('[Firebase] Signed out');
    AeroAuth.onLogout();
  }
});

// ══════════════════════════════════════════════════════════════════
// ── AUTH ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
const AeroAuth = {

  async login(email, password) {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { ok: true, user: cred.user };
    } catch (e) {
      return { ok: false, error: this._err(e.code) };
    }
  },

  async register(email, password, displayName) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', cred.user.uid), {
        email,
        displayName: displayName || email.split('@')[0],
        createdAt:   serverTimestamp(),
        savedLocations:   [],
        alertThresholds:  { aqi: 150, gas: 300, temperature: 40 },
        preferences:      { defaultState: 'Uttar Pradesh' },
      });
      return { ok: true, user: cred.user };
    } catch (e) {
      return { ok: false, error: this._err(e.code) };
    }
  },

  async logout() {
    await signOut(auth);
  },

  async onLogin(user) {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const p = snap.data();
      const el = document.getElementById('authUserName');
      if (el) el.textContent = p.displayName || user.email;
    }
    AeroUI.updateAuthState(true, user.email);
  },

  onLogout() {
    AeroUI.updateAuthState(false);
  },

  _err(code) {
    return ({
      'auth/user-not-found':     'No account found with this email.',
      'auth/wrong-password':     'Incorrect password.',
      'auth/email-already-in-use':'Email already registered.',
      'auth/weak-password':      'Password must be at least 6 characters.',
      'auth/invalid-email':      'Invalid email address.',
      'auth/too-many-requests':  'Too many attempts. Try again later.',
      'auth/invalid-credential': 'Incorrect email or password.',
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
        type, value,
        timestamp:    rtTS(),
        acknowledged: false,
      });
    } catch (e) {
      console.warn('[RTDB] Alert send failed:', e.message);
    }
  },

  unsubAll() {
    Object.values(this._unsubs).forEach(fn => fn && fn());
    this._unsubs = {};
  },
};

// ══════════════════════════════════════════════════════════════════
// ── FIRESTORE — AQI HISTORY · ALERTS · USER DATA ─────────────────
// ══════════════════════════════════════════════════════════════════
const AeroFirestore = {

  _lastPersist: 0,
  PERSIST_GAP:  10 * 60 * 1000,

  async saveAQIReading(name, state, lat, lon, aqiData) {
    try {
      await addDoc(collection(db, 'aqi_readings'), {
        location:  name,
        state,     lat, lon,
        aqi:       aqiData.aqi,
        pm25:      aqiData.pm25 ?? null,
        pm10:      aqiData.pm10 ?? null,
        no2:       aqiData.no2  ?? null,
        source:    aqiData.source ?? '',
        fusion:    aqiData.fusion ?? null,
        timestamp: serverTimestamp(),
        userId:    currentUser?.uid ?? 'anonymous',
      });
    } catch (e) {
      console.warn('[Firestore] AQI save failed:', e.message);
    }
  },

  async getAQIHistory(locationName, n = 24) {
    try {
      const q = query(
        collection(db, 'aqi_readings'),
        where('location', '==', locationName),
        orderBy('timestamp', 'desc'),
        limit(n)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
    } catch (e) {
      console.warn('[Firestore] History failed:', e.message);
      return [];
    }
  },

  async logAlert(type, location, value, message) {
    try {
      await addDoc(collection(db, 'alerts'), {
        type, location, value, message,
        timestamp:    serverTimestamp(),
        userId:       currentUser?.uid ?? 'anonymous',
        acknowledged: false,
      });
    } catch (e) {
      console.warn('[Firestore] Alert log failed:', e.message);
    }
  },

  async getRecentAlerts(n = 20) {
    try {
      const q = query(
        collection(db, 'alerts'),
        orderBy('timestamp', 'desc'),
        limit(n)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      return [];
    }
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
      console.log('[Firestore] Sensor reading persisted');
    } catch (e) {
      console.warn('[Firestore] Sensor persist failed:', e.message);
    }
  },

  async saveUserLocation(name, state, lat, lon) {
    if (!currentUser) return;
    const ref = doc(db, 'users', currentUser.uid);
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
// ── UI ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
const AeroUI = {
  updateAuthState(loggedIn, email = '') {
    const btn  = document.getElementById('authBtn');
    const info = document.getElementById('authUserName');
    if (!btn) return;
    if (loggedIn) {
      btn.textContent = 'LOGOUT';
      btn.onclick     = () => AeroAuth.logout();
      if (info) info.textContent = email;
    } else {
      btn.textContent = 'LOGIN';
      btn.onclick     = () => AeroModal.open('login');
      if (info) info.textContent = '';
    }
  },
};

// ══════════════════════════════════════════════════════════════════
// ── AUTH MODAL ────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
const AeroModal = {
  _mode: 'login',

  open(mode = 'login') {
    this._mode = mode;
    let m = document.getElementById('firebaseAuthModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'firebaseAuthModal';
      m.innerHTML = `
        <div class="fb-modal-backdrop" onclick="AeroModal.close()"></div>
        <div class="fb-modal-box">
          <div class="fb-modal-header">
            <span id="fbModalTitle">// LOGIN</span>
            <button class="fb-modal-close" onclick="AeroModal.close()">✕</button>
          </div>
          <div class="fb-modal-body">
            <div id="fbAuthError" class="fb-error" style="display:none"></div>
            <input id="fbEmail"    type="email"    placeholder="Email address" class="fb-input"/>
            <input id="fbPassword" type="password" placeholder="Password"      class="fb-input"/>
            <input id="fbName"     type="text"     placeholder="Display name (register only)" class="fb-input" style="display:none"/>
            <button id="fbSubmitBtn" class="fb-submit-btn" onclick="AeroModal._submit()">LOGIN</button>
            <div class="fb-toggle">
              <span id="fbToggleText">Don't have an account?</span>
              <button class="fb-toggle-btn" onclick="AeroModal.toggleMode()">Register</button>
            </div>
          </div>
        </div>`;
      document.body.appendChild(m);
    }
    this._refresh();
    m.style.display = 'flex';
    document.getElementById('fbEmail').focus();
  },

  close() {
    const m = document.getElementById('firebaseAuthModal');
    if (m) m.style.display = 'none';
  },

  toggleMode() {
    this._mode = this._mode === 'login' ? 'register' : 'login';
    this._refresh();
  },

  _refresh() {
    const login = this._mode === 'login';
    document.getElementById('fbModalTitle').textContent   = login ? '// LOGIN' : '// REGISTER';
    document.getElementById('fbSubmitBtn').textContent    = login ? 'LOGIN' : 'CREATE ACCOUNT';
    document.getElementById('fbName').style.display       = login ? 'none' : 'block';
    document.getElementById('fbToggleText').textContent   = login ? "Don't have an account?" : 'Already registered?';
    document.querySelector('.fb-toggle-btn').textContent  = login ? 'Register' : 'Login';
    document.getElementById('fbAuthError').style.display  = 'none';
  },

  async _submit() {
    const email = document.getElementById('fbEmail').value.trim();
    const pass  = document.getElementById('fbPassword').value;
    const name  = document.getElementById('fbName').value.trim();
    const btn   = document.getElementById('fbSubmitBtn');
    const err   = document.getElementById('fbAuthError');

    if (!email || !pass) {
      err.textContent = 'Please enter email and password.';
      err.style.display = 'block'; return;
    }

    btn.textContent = '...'; btn.disabled = true;
    const res = this._mode === 'login'
      ? await AeroAuth.login(email, pass)
      : await AeroAuth.register(email, pass, name);
    btn.disabled = false; this._refresh();

    if (res.ok) { this.close(); }
    else { err.textContent = res.error; err.style.display = 'block'; }
  },
};

// ── Expose globals so inline onclick handlers work ────────────────
window.AeroAuth      = AeroAuth;
window.AeroRTDB      = AeroRTDB;
window.AeroFirestore = AeroFirestore;
window.AeroModal     = AeroModal;

console.log('[Aeromatrics] Firebase backend loaded — project: aerometrics-b5c84');
