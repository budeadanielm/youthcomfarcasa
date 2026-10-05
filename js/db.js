/**
 * Fărcașa EYV – Data + Auth layer
 * Firebase (Auth + Firestore) when configured, else localStorage fallback.
 */
(function () {
  const INDICATORS_KEY = 'farcasa_indicators_v1';
  const FEEDBACK_KEY = 'farcasa_feedback_v1';
  const EVENTS_KEY = 'farcasa_events_v1';

  let app = null;
  let auth = null;
  let db = null;
  let currentUser = null;
  const authListeners = [];

  function isCloud() {
    return !!(window.FARCASA_FIREBASE_ENABLED && window.FARCASA_FIREBASE_ENABLED() && window.firebase);
  }

  function initFirebase() {
    if (!isCloud()) return false;
    if (app) return true;
    try {
      app = firebase.initializeApp(window.FARCASA_FIREBASE);
      auth = firebase.auth();
      db = firebase.firestore();
      auth.onAuthStateChanged((user) => {
        currentUser = user;
        authListeners.forEach((fn) => {
          try { fn(user); } catch (e) {}
        });
        document.querySelectorAll('[data-admin-only]').forEach((el) => {
          if (user && window.FarcasaAuth.isAdmin(user)) el.classList.remove('hidden');
          else el.classList.add('hidden');
        });
      });
      return true;
    } catch (e) {
      console.error('Firebase init failed', e);
      return false;
    }
  }

  // ---------- defaults (same as before) ----------
  const DEFAULT_INDICATORS = [
    { id: 1, name_ro: 'Numărul total de tineri implicați activ în organizarea activităților (voluntari implicați în grupul de inițiativă)', name_en: 'Total number of young people actively involved in organising activities (volunteers in the initiative group)', initial: 9, mid: 9, final: 9, measure_ro: 'Minute întâlniri de lucru ale grupului de inițiativă.', measure_en: 'Minutes of initiative group working meetings.' },
    { id: 2, name_ro: 'Numărul total de tineri participanți la activități (alții decât voi)', name_en: 'Total number of young people participating in activities (other than the group)', initial: 0, mid: 0, final: 0, measure_ro: 'Liste de prezență de la activități.', measure_en: 'Attendance lists from activities.' },
    { id: 3, name_ro: 'Numărul de activități organizate în comunitate', name_en: 'Number of activities organised in the community', initial: 0, mid: 0, final: 0, measure_ro: 'Centralizator activități – oferit de Guvernanța EYV.', measure_en: 'Activity centraliser – provided by EYV Governance.' },
    { id: 4, name_ro: 'Număr de întâlniri/contexte de dialog cu decidenții', name_en: 'Number of meetings/dialogue contexts with decision-makers', initial: 0, mid: 0, final: 0, measure_ro: 'Centralizator activități – oferit de Guvernanța EYV.', measure_en: 'Activity centraliser – provided by EYV Governance.' },
    { id: 5, name_ro: 'Număr de decidenți implicați la activități cu tinerii', name_en: 'Number of decision-makers involved in activities with young people', initial: 0, mid: 0, final: 0, measure_ro: 'Liste de prezență de la activități.', measure_en: 'Attendance lists from activities.' },
    { id: 6, name_ro: 'Numărul de propuneri transmise către autorități de către tineri', name_en: 'Number of proposals submitted to authorities by young people', initial: 0, mid: 0, final: 0, measure_ro: 'Raport realizat de grupul de inițiativă.', measure_en: 'Report produced by the initiative group.' },
    { id: 7, name_ro: 'Număr de articole publicate despre program în media și social media', name_en: 'Number of articles published about the programme in media and social media', initial: 0, mid: 0, final: 0, measure_ro: 'Raport monitorizare presă/social media.', measure_en: 'Media / social media monitoring report.' },
    { id: 8, name_ro: 'Procent tineri participanți la activități care declară că au învățat ceva nou la finalul activității', name_en: 'Percentage of young participants who declare they learned something new at the end of the activity', initial: 0, mid: 0, final: 0, measure_ro: 'Chestionare de feedback aplicate la finalul activităților.', measure_en: 'Feedback questionnaires applied at the end of activities.' },
    { id: 9, name_ro: 'Număr de spații dedicate tinerilor în comună', name_en: 'Number of spaces dedicated to young people in the commune', initial: 0, mid: 0, final: 0, measure_ro: 'Raport realizat de grupul de inițiativă.', measure_en: 'Report produced by the initiative group.' },
    { id: 10, name_ro: 'Resurse financiare mobilizate pentru activități cu tinerii la nivel local prin fundraising (RON)', name_en: 'Financial resources mobilised for youth activities locally through fundraising (RON)', initial: 0, mid: 0, final: 0, measure_ro: 'Raport realizat de grupul de inițiativă.', measure_en: 'Report produced by the initiative group.' }
  ];

  const DEFAULT_EVENTS = [
    { id: 1, title: 'Lansare an candidatură', date: '2027-01-15', type: 'teal', desc: 'Prezentare plan + recrutare voluntari' },
    { id: 2, title: 'Atelier leadership', date: '2027-03-10', type: 'yellow', desc: 'Competențe pentru tineri' },
    { id: 3, title: 'Dialog cu autoritățile', date: '2027-04-22', type: 'red', desc: 'Întâlnire cu primăria' },
    { id: 4, title: 'Eveniment comunitar vară', date: '2027-07-12', type: 'teal', desc: 'Festival / activități outdoor' },
    { id: 5, title: 'Evaluare intermediară', date: '2027-06-30', type: 'yellow', desc: 'Raport progres indicatori' },
    { id: 6, title: 'Evaluare finală', date: '2027-12-15', type: 'red', desc: 'Raport final + celebrare' }
  ];

  // ---------- Auth ----------
  window.FarcasaAuth = {
    mode() {
      return isCloud() && initFirebase() ? 'firebase' : 'local';
    },
    onAuth(fn) {
      authListeners.push(fn);
      if (currentUser !== undefined) fn(currentUser);
    },
    getUser() {
      if (this.mode() === 'firebase') return currentUser;
      return sessionStorage.getItem('farcasa_admin') === '1'
        ? { email: 'admin@local', local: true }
        : null;
    },
    isLoggedIn() {
      if (this.mode() === 'firebase') return !!currentUser;
      return sessionStorage.getItem('farcasa_admin') === '1';
    },
    isAdmin(user) {
      const u = user || this.getUser();
      if (!u) return false;
      if (u.local) return true;
      if (this.isSuperAdmin(u)) return true;
      const list = ((window.FARCASA_FIREBASE && window.FARCASA_FIREBASE.ADMIN_EMAILS) || [])
        .map((e) => String(e).toLowerCase().trim())
        .filter(Boolean);
      // Doar emailurile din listă (sau super-admin) au Dashboard
      if (!list.length) return false;
      return list.includes(String(u.email || '').toLowerCase());
    },
    /** Super-admin: doar emailul principal (panou utilizatori) */
    isSuperAdmin(user) {
      const u = user || this.getUser();
      if (!u || !u.email) return false;
      const cfg = window.FARCASA_FIREBASE || {};
      const superList = cfg.SUPER_ADMIN_EMAILS || ['budeadanielm@gmail.com'];
      return superList.map((e) => String(e).toLowerCase()).includes(String(u.email).toLowerCase());
    },
    /** Lista userilor din Firestore (fără parole – Firebase nu le expune) */
    async listUsers() {
      if (this.mode() !== 'firebase') {
        return [{ id: 1, email: 'admin@local', displayName: 'Local demo', uid: 'local', createdAt: null }];
      }
      initFirebase();
      let rows = [];
      try {
        const snap = await db.collection('users').orderBy('id', 'asc').get();
        rows = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      } catch (e) {
        const snap2 = await db.collection('users').get();
        rows = snap2.docs.map((d, i) => ({ uid: d.id, id: d.data().id || (i + 1), ...d.data() }));
      }
      const all = await db.collection('users').get();
      const seen = new Set(rows.map((r) => r.uid));
      all.docs.forEach((d, i) => {
        if (seen.has(d.id)) return;
        rows.push({ uid: d.id, id: d.data().id || (rows.length + i + 1), ...d.data() });
      });
      const superEmail = ((window.FARCASA_FIREBASE && window.FARCASA_FIREBASE.SUPER_ADMIN_EMAILS) || ['budeadanielm@gmail.com'])[0];
      rows.sort((a, b) => {
        const as = (a.email || '').toLowerCase() === superEmail ? -1 : 0;
        const bs = (b.email || '').toLowerCase() === superEmail ? -1 : 0;
        if (as !== bs) return as - bs;
        return (Number(a.id) || 9999) - (Number(b.id) || 9999);
      });
      rows = rows.filter((r) => !r.deleted && (r.displayName || '') !== 'Cont șters');
      const byEmail = new Map();
      const noEmail = [];
      rows.forEach((r) => {
        const key = (r.email || '').toLowerCase();
        if (!key) { noEmail.push(r); return; }
        const prev = byEmail.get(key);
        if (!prev) { byEmail.set(key, r); return; }
        const score = (x) => (x.createdAt ? 2 : 0) + (x.banned ? 1 : 0);
        byEmail.set(key, score(r) >= score(prev) ? r : prev);
      });
      rows = [...byEmail.values(), ...noEmail];
      rows.sort((a, b) => {
        const as = (a.email || '').toLowerCase() === superEmail ? -1 : 0;
        const bs = (b.email || '').toLowerCase() === superEmail ? -1 : 0;
        if (as !== bs) return as - bs;
        return (Number(a.id) || 9999) - (Number(b.id) || 9999);
      });
      rows.forEach((r, i) => { r.id = i + 1; });
      return rows;
    },
    async signup(email, password, displayName) {
      if (this.mode() !== 'firebase') {
        throw new Error('Sign up e disponibil doar cu Firebase configurat. Vezi setup.html');
      }
      initFirebase();
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (displayName) {
        await cred.user.updateProfile({ displayName });
      }
      currentUser = cred.user;
      try {
        let nextId = 1;
        const counterRef = db.collection('meta').doc('counters');
        await db.runTransaction(async (tx) => {
          const c = await tx.get(counterRef);
          nextId = c.exists && c.data().userSeq ? (c.data().userSeq + 1) : 1;
          tx.set(counterRef, { userSeq: nextId }, { merge: true });
        });
        const banKey = email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
        const banSnap = await db.collection('bannedEmails').doc(banKey).get();
        const wasBanned = banSnap.exists && banSnap.data().banned;
        await db.collection('users').doc(cred.user.uid).set({
          id: nextId,
          email,
          displayName: displayName || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          role: 'member',
          roles: ['member'],
          memberInCoordination: false,
          banned: !!wasBanned,
          banReason: wasBanned ? (banSnap.data().reason || '') : ''
        }, { merge: true });
      } catch (e) {
        console.warn('users profile write', e);
        try {
          await db.collection('users').doc(cred.user.uid).set({
            email,
            displayName: displayName || '',
            createdAt: new Date().toISOString(),
            role: 'member'
          }, { merge: true });
        } catch (e2) {}
      }
      return cred.user;
    },
    async setBanned(uid, banned, reason) {
      if (!this.isAdmin()) throw new Error('Doar admin');
      if (this.mode() !== 'firebase') throw new Error('Banul merge doar pe Firebase');
      if (banned && !reason) throw new Error('Scrie motivul banului.');
      initFirebase();
      const me = this.getUser();
      await db.collection('users').doc(uid).set({
        banned: !!banned,
        banReason: banned ? reason : '',
        bannedBy: banned ? (me && me.email) : ''
      }, { merge: true });
      const userSnap = await db.collection('users').doc(uid).get();
      const email = (userSnap.exists && userSnap.data().email) || '';
      if (email) {
        const banKey = email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
        await db.collection('bannedEmails').doc(banKey).set({
          email,
          banned: !!banned,
          reason: banned ? reason : ''
        });
      }
    },
    async isCurrentBanned() {
      const u = this.getUser();
      if (!u || this.mode() !== 'firebase') return false;
      initFirebase();
      const snap = await db.collection('users').doc(u.uid).get();
      return !!(snap.exists && snap.data().banned);
    },
    async updateAccount({ displayName, photo, email, newPassword, currentPassword }) {
      if (this.mode() !== 'firebase') throw new Error('Setările de cont merg doar cu Firebase.');
      initFirebase();
      const user = auth.currentUser;
      if (!user) throw new Error('Nu ești logat.');
      if ((email && email !== user.email) || newPassword) {
        if (!currentPassword) throw new Error('Scrie parola actuală ca să schimbi emailul sau parola.');
        const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(cred);
      }
      if (displayName) await user.updateProfile({ displayName });
      if (email && email !== user.email) await user.updateEmail(email);
      if (newPassword) await user.updatePassword(newPassword);
      const patch = {};
      if (displayName) patch.displayName = displayName;
      if (photo !== undefined) patch.photo = photo;
      if (email) patch.email = email;
      if (Object.keys(patch).length) {
        await db.collection('users').doc(user.uid).set(patch, { merge: true });
      }
    },
    async resetPassword(email) {
      email = (email || '').trim();
      if (!email || !email.includes('@')) throw new Error('Scrie emailul contului.');
      if (this.mode() !== 'firebase') throw new Error('Resetul merge doar cu Firebase (Cloud DB).');
      initFirebase();
      await auth.sendPasswordResetEmail(email);
    },
    async login(email, password) {
      if (this.mode() === 'firebase') {
        initFirebase();
        const cred = await auth.signInWithEmailAndPassword(email, password);
        currentUser = cred.user; // imediat, fără a aștepta onAuthStateChanged
        return cred.user;
      }
      // local demo
      const e = (email || '').trim().toLowerCase();
      if ((e === 'admin' || e === 'farcasa' || e === 'admin@local') && password === 'farcasa2027') {
        sessionStorage.setItem('farcasa_admin', '1');
        return { email: 'admin@local', local: true };
      }
      throw new Error('Email sau parolă incorectă (mod local: admin / farcasa2027). Pentru Firebase, completează js/firebase-config.js');
    },
    async deleteAccount(currentPassword) {
      if (this.mode() !== 'firebase') throw new Error('Ștergerea merge doar pe Firebase.');
      initFirebase();
      const user = auth.currentUser;
      if (!user) throw new Error('Nu ești logat.');
      if (!currentPassword) throw new Error('Scrie parola ca să confirmi ștergerea.');
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
      await user.reauthenticateWithCredential(cred);
      const uid = user.uid;
      const prof = await db.collection('users').doc(uid).get();
      const banned = !!(prof.exists && prof.data().banned);
      const banReason = (prof.exists && prof.data().banReason) || '';
      const email = user.email || '';
      if (banned && email) {
        const banKey = email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
        await db.collection('bannedEmails').doc(banKey).set({ email, banned: true, reason: banReason });
      }
      await db.collection('users').doc(uid).set({
        displayName: 'Cont șters',
        email: '',
        photo: '',
        roles: [],
        deleted: true,
        banned,
        banReason
      });
      const tickets = await db.collection('banTickets').where('uid', '==', uid).get();
      for (const d of tickets.docs) {
        await d.ref.set({ name: 'Cont șters', email: '', hidden: true, status: 'cleared' }, { merge: true });
      }
      await user.delete();
      currentUser = null;
    },
    async logout() {
      if (this.mode() === 'firebase' && auth) {
        await auth.signOut();
      }
      sessionStorage.removeItem('farcasa_admin');
    },
    requireAuth() {
      if (!this.isLoggedIn()) {
        window.location.href = 'login.html';
        return false;
      }
      if (!this.isAdmin()) {
        alert('Contul tău nu are acces admin. Adaugă emailul în ADMIN_EMAILS din js/firebase-config.js');
        window.location.href = 'index.html';
        return false;
      }
      return true;
    },
    /** Așteaptă prima stare Auth (util pe dashboard la refresh) */
    waitAuth(timeoutMs) {
      timeoutMs = timeoutMs || 4000;
      return new Promise((resolve) => {
        if (this.mode() !== 'firebase') {
          resolve(this.getUser());
          return;
        }
        initFirebase();
        if (currentUser !== null && currentUser !== undefined && auth.currentUser) {
          currentUser = auth.currentUser;
          resolve(currentUser);
          return;
        }
        let done = false;
        const finish = (u) => {
          if (done) return;
          done = true;
          currentUser = u;
          resolve(u);
        };
        const unsub = auth.onAuthStateChanged((u) => {
          unsub();
          finish(u);
        });
        setTimeout(() => finish(auth.currentUser || currentUser), timeoutMs);
      });
    }
  };

  // ---------- Data ----------
  window.FarcasaData = {
    async getIndicators() {
      if (isCloud() && initFirebase()) {
        try {
          const snap = await db.collection('meta').doc('indicators').get();
          if (snap.exists && Array.isArray(snap.data().items)) return snap.data().items;
          // seed
          await db.collection('meta').doc('indicators').set({ items: DEFAULT_INDICATORS, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
          return JSON.parse(JSON.stringify(DEFAULT_INDICATORS));
        } catch (e) {
          console.warn('Firestore indicators fallback', e);
        }
      }
      try {
        const raw = localStorage.getItem(INDICATORS_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return JSON.parse(JSON.stringify(DEFAULT_INDICATORS));
    },
    async saveIndicators(data) {
      if (isCloud() && initFirebase()) {
        await db.collection('meta').doc('indicators').set({
          items: data,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return;
      }
      localStorage.setItem(INDICATORS_KEY, JSON.stringify(data));
    },
    async resetIndicators() {
      const data = JSON.parse(JSON.stringify(DEFAULT_INDICATORS));
      await this.saveIndicators(data);
      return data;
    },
    async getFeedbacks() {
      if (isCloud() && initFirebase()) {
        try {
          const snap = await db.collection('feedbacks').orderBy('date', 'desc').limit(200).get();
          return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t.status !== 'cleared' && !t.hidden);
        } catch (e) {
          console.warn('Firestore feedbacks fallback', e);
        }
      }
      try {
        const raw = localStorage.getItem(FEEDBACK_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return [];
    },
    async addFeedback(entry) {
      if (window.FarcasaAuth.isCurrentBanned && await window.FarcasaAuth.isCurrentBanned()) {
        throw new Error('Contul este banat.');
      }
      const row = { ...entry, date: new Date().toISOString() };
      if (isCloud() && initFirebase()) {
        const ref = await db.collection('feedbacks').add(row);
        return { id: ref.id, ...row };
      }
      const list = await this.getFeedbacks();
      list.unshift({ ...row, id: Date.now() });
      localStorage.setItem(FEEDBACK_KEY, JSON.stringify(list));
      return list[0];
    },
    async clearFeedbacks() {
      if (isCloud() && initFirebase()) {
        const snap = await db.collection('feedbacks').limit(500).get();
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        return;
      }
      localStorage.removeItem(FEEDBACK_KEY);
    }
  };

  window.FarcasaEvents = {
    async getAll() {
      if (isCloud() && initFirebase()) {
        try {
          const snap = await db.collection('events').orderBy('date', 'asc').get();
          if (snap.empty) {
            // seed defaults
            const batch = db.batch();
            DEFAULT_EVENTS.forEach((ev) => {
              const ref = db.collection('events').doc(String(ev.id));
              batch.set(ref, ev);
            });
            await batch.commit();
            return JSON.parse(JSON.stringify(DEFAULT_EVENTS));
          }
          return snap.docs.map((d) => ({ ...d.data(), id: d.data().id || d.id }));
        } catch (e) {
          console.warn('Firestore events fallback', e);
        }
      }
      try {
        const raw = localStorage.getItem(EVENTS_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return JSON.parse(JSON.stringify(DEFAULT_EVENTS));
    },
    async save(list) {
      if (isCloud() && initFirebase()) {
        // replace all – simple approach for small lists
        const snap = await db.collection('events').get();
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        list.forEach((ev) => {
          const id = String(ev.id || Date.now() + Math.random());
          batch.set(db.collection('events').doc(id), { ...ev, id });
        });
        await batch.commit();
        return;
      }
      localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
    },
    async add(ev) {
      const id = Date.now();
      const row = { ...ev, id };
      if (isCloud() && initFirebase()) {
        await db.collection('events').doc(String(id)).set(row);
        return row;
      }
      const list = await this.getAll();
      list.push(row);
      localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
      return row;
    },
    async remove(id) {
      if (isCloud() && initFirebase()) {
        await db.collection('events').doc(String(id)).delete();
        return;
      }
      const list = (await this.getAll()).filter((e) => e.id !== id);
      localStorage.setItem(EVENTS_KEY, JSON.stringify(list));
    },
    async reset() {
      if (isCloud() && initFirebase()) {
        await this.save(JSON.parse(JSON.stringify(DEFAULT_EVENTS)));
        return DEFAULT_EVENTS;
      }
      localStorage.removeItem(EVENTS_KEY);
      return this.getAll();
    }
  };

  // sync API used by old sync code paths
  window.FarcasaData.getIndicatorsSync = function () {
    // legacy sync – prefer cached
    try {
      const raw = localStorage.getItem(INDICATORS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_INDICATORS));
  };



  window.FarcasaInbox = {
    async add(entry) {
      if (await window.FarcasaAuth.isCurrentBanned()) throw new Error('Contul este banat. Poți deschide un tichet de revocare.');
      const item = {
        name: entry.name || '',
        email: entry.email || '',
        dept: entry.dept || 'general',
        message: entry.message || '',
        date: new Date().toISOString()
      };
      if (isCloud() && initFirebase()) {
        await db.collection('messages').add({
          ...item,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return;
      }
      const key = 'farcasa_messages_v1';
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift({ id: Date.now(), ...item });
      localStorage.setItem(key, JSON.stringify(list.slice(0, 200)));
    },
    async list() {
      if (isCloud() && initFirebase()) {
        const snap = await db.collection('messages').orderBy('date', 'desc').limit(100).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return JSON.parse(localStorage.getItem('farcasa_messages_v1') || '[]');
    },
    async remove(id) {
      if (isCloud() && initFirebase()) {
        await db.collection('messages').doc(String(id)).delete();
        return;
      }
      const key = 'farcasa_messages_v1';
      const list = JSON.parse(localStorage.getItem(key) || '[]').filter((m) => String(m.id) !== String(id));
      localStorage.setItem(key, JSON.stringify(list));
    }
  };

  window.FarcasaTickets = {
    async add(text, image) {
      const u = window.FarcasaAuth.getUser();
      if (!u) throw new Error('Trebuie să fii logat.');
      initFirebase();
      const prof = await window.FarcasaForum.getUserProfile(u.uid);
      const counter = db.collection('meta').doc('ticketCounter');
      const seq = await db.runTransaction(async (tx) => {
        const snap = await tx.get(counter);
        const n = ((snap.exists && snap.data().n) || 0) + 1;
        tx.set(counter, { n }, { merge: true });
        return n;
      });
      const number = 'tichet-' + String(seq).padStart(4, '0');
      const item = {
        number,
        uid: u.uid,
        email: u.email || '',
        name: u.displayName || (prof && prof.displayName) || '',
        text: text || '',
        status: 'pending',
        handlerEmail: '',
        banReason: (prof && prof.banReason) || '',
        date: new Date().toISOString()
      };
      const ref = await db.collection('banTickets').add({ ...item, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      await ref.collection('chat').add({
        authorId: u.uid,
        authorName: item.name || u.email,
        text: item.text,
        image: image || '',
        date: new Date().toISOString()
      });
      return { id: ref.id, number };
    },
    async mine() {
      const u = window.FarcasaAuth.getUser();
      if (!u) return [];
      initFirebase();
      const snap = await db.collection('banTickets').where('uid', '==', u.uid).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t && t.status !== 'cleared' && !t.hidden).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    },
    async list() {
      if (!window.FarcasaAuth.isAdmin()) throw new Error('Doar admin');
      initFirebase();
      const snap = await db.collection('banTickets').orderBy('date', 'desc').limit(100).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t && t.status !== 'cleared' && !t.hidden);
    },
    async take(id) {
      if (!window.FarcasaAuth.isAdmin()) throw new Error('Doar admin');
      const me = window.FarcasaAuth.getUser();
      initFirebase();
      await db.collection('banTickets').doc(id).set({
        status: 'in_progress',
        handlerEmail: me.email || '',
        handlerUid: me.uid
      }, { merge: true });
    },
    async setStatus(id, status, extra) {
      if (!window.FarcasaAuth.isAdmin()) throw new Error('Doar admin');
      initFirebase();
      const me = window.FarcasaAuth.getUser();
      await db.collection('banTickets').doc(String(id)).set({
        status,
        ...(extra || {}),
        closedBy: status === 'open' || status === 'in_progress' ? '' : (me && me.email),
        closedAt: status === 'open' || status === 'in_progress' ? '' : new Date().toISOString()
      }, { merge: true });
    },
    async remove(id) {
      if (!window.FarcasaAuth.isAdmin()) throw new Error('Doar admin');
      initFirebase();
      const ref = db.collection('banTickets').doc(String(id));
      await ref.set({ status: 'cleared', hidden: true }, { merge: true });
      try {
        const chat = await ref.collection('chat').get();
        for (const m of chat.docs) await m.ref.delete();
        await ref.delete();
      } catch (e) {}
    },
    async clearAll() {
      if (!window.FarcasaAuth.isSuperAdmin()) throw new Error('Doar super-admin poate șterge tichetele.');
      initFirebase();
      const snap = await db.collection('banTickets').get();
      for (const d of snap.docs) {
        await d.ref.set({ status: 'cleared', hidden: true }, { merge: true });
        try {
          const chat = await d.ref.collection('chat').get();
          for (const m of chat.docs) await m.ref.delete();
          await d.ref.delete();
        } catch (e) {}
      }
    },
    listen(id, cb) {
      initFirebase();
      return db.collection('banTickets').doc(id).collection('chat').orderBy('date', 'asc')
        .onSnapshot((snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    },
    async messages(id) {
      initFirebase();
      const snap = await db.collection('banTickets').doc(id).collection('chat').orderBy('date', 'asc').get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },
    async send(id, text, image) {
      const u = window.FarcasaAuth.getUser();
      if (!u) throw new Error('Nu ești logat');
      initFirebase();
      const ticket = (await db.collection('banTickets').doc(id).get()).data() || {};
      const admin = window.FarcasaAuth.isAdmin();
      if (!admin && ticket.uid !== u.uid) throw new Error('Nu e tichetul tău');
      if (ticket.status === 'resolved' || ticket.status === 'rejected') throw new Error('Tichetul este închis. Poate fi doar revăzut.');
      if (!admin && ticket.status === 'pending') throw new Error('Așteaptă ca un admin să preia tichetul.');
      await db.collection('banTickets').doc(id).collection('chat').add({
        authorId: u.uid,
        authorName: u.displayName || u.email,
        text: text || '',
        image: image || '',
        date: new Date().toISOString()
      });
    }
  };

  window.FarcasaPosts = {
    async list() {
      if (isCloud() && initFirebase()) {
        const snap = await db.collection('posts').orderBy('date', 'desc').limit(50).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
      return JSON.parse(localStorage.getItem('farcasa_posts_v1') || '[]');
    },
    async add(entry) {
      const item = {
        title: entry.title || '',
        text: entry.text || '',
        link: entry.link || '',
        image: entry.image || '',
        date: new Date().toISOString()
      };
      if (isCloud() && initFirebase()) {
        const ref = await db.collection('posts').add({
          ...item,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return ref.id;
      }
      const list = JSON.parse(localStorage.getItem('farcasa_posts_v1') || '[]');
      item.id = String(Date.now());
      list.unshift(item);
      localStorage.setItem('farcasa_posts_v1', JSON.stringify(list.slice(0, 30)));
      return item.id;
    },
    async remove(id) {
      if (isCloud() && initFirebase()) {
        await db.collection('posts').doc(String(id)).delete();
        return;
      }
      const list = JSON.parse(localStorage.getItem('farcasa_posts_v1') || '[]').filter((p) => String(p.id) !== String(id));
      localStorage.setItem('farcasa_posts_v1', JSON.stringify(list));
    }
  };

  // ---------- Forum ----------
  const CHANNELS = 'channels';
  const MESSAGES = 'messages';
  const JOIN_REQ = 'joinRequests';


  window.FARCASA_ROLES = [
    { id: 'administrator', label: 'Administrator', color: '#E37D12', chatColor: '#E37D12', desc: 'Control suprem' },
    { id: 'conducere', label: 'Conducere', color: null, chatColor: null, desc: 'Acces camere conducere (culoarea vine din departament)' },
    { id: 'chair_it', label: 'Chair of IT', color: '#DC2626', chatColor: '#EF4444', desc: 'Roșu aprins' },
    { id: 'it', label: 'IT', color: '#F87171', chatColor: '#FCA5A5', desc: 'Roșu palid' },
    { id: 'chair_pr', label: 'Chair of PR', color: '#EAB308', chatColor: '#FACC15', desc: 'Galben aprins' },
    { id: 'pr', label: 'PR', color: '#FDE047', chatColor: '#FEF08A', desc: 'Galben palid' },
    { id: 'logistica', label: 'Logistică', color: '#16A34A', chatColor: '#4ADE80', desc: 'Verde' },
    { id: 'membru', label: 'Membru', color: '#7C3AED', chatColor: '#A78BFA', desc: 'Mov' }
  ];

  window.FarcasaForum = {
    async ensureSystemChannels() {
      if (!isCloud() || !initFirebase()) return;
      const systems = [
        { id: 'discutii', name: 'Discuții', type: 'public', description: 'Canal principal – toată lumea' },
        { id: 'anunturi', name: 'Anunțuri', type: 'anunturi', description: 'Anunțuri publice' },
        { id: 'conducere', name: 'Conducere', type: 'conducere', description: 'Doar coordonare' }
      ];
      for (const ch of systems) {
        const ref = db.collection(CHANNELS).doc(ch.id);
        const snap = await ref.get();
        if (!snap.exists) {
          await ref.set({
            ...ch,
            ownerId: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            members: [],
            muted: [],
            banned: []
          });
        }
      }
    },

    async getUserProfile(uid) {
      if (!uid) return null;
      if (isCloud() && initFirebase()) {
        const snap = await db.collection('users').doc(uid).get();
        if (snap.exists) return { uid, ...snap.data() };
      }
      return { uid, displayName: '', email: '', roles: [] };
    },

    async getMyProfile() {
      const u = window.FarcasaAuth.getUser();
      if (!u) return null;
      if (u.local) return { uid: 'local', email: u.email, displayName: 'Admin local', roles: ['administrator'], memberInCoordination: true };
      return this.getUserProfile(u.uid);
    },

    rolesLabel(profile) {
      if (!profile) return ['Membru'];
      const labels = [];
      const email = (profile.email || '').toLowerCase();
      const roleIds = new Set(profile.roles || []);
      if (profile.memberInCoordination) roleIds.add('conducere');
      if (window.FarcasaAuth.isSuperAdmin({ email })) roleIds.add('administrator');
      const order = (window.FARCASA_ROLES || []).map((r) => r.id);
      order.forEach((id) => {
        if (roleIds.has(id)) {
          const def = (window.FARCASA_ROLES || []).find((r) => r.id === id);
          labels.push(def ? def.label : id);
        }
      });
      // legacy free-text roles
      (profile.roles || []).forEach((r) => {
        if (!order.includes(r) && r && r !== 'member' && !labels.includes(r)) labels.push(r);
      });
      if (profile.title && !labels.includes(profile.title)) labels.push(profile.title);
      return labels.length ? labels : ['Membru'];
    },

    /** Culoare chat: Administrator > departament (chair_it/it/...) > membru */
    chatColorFor(profile) {
      if (!profile) return '#A78BFA';
      const email = (profile.email || '').toLowerCase();
      const roleIds = new Set(profile.roles || []);
      if (profile.memberInCoordination) roleIds.add('conducere');
      if (window.FarcasaAuth.isSuperAdmin({ email }) || roleIds.has('administrator')) {
        return '#E37D12';
      }
      const priority = ['chair_it', 'it', 'chair_pr', 'pr', 'logistica', 'membru'];
      for (const id of priority) {
        if (roleIds.has(id)) {
          const def = (window.FARCASA_ROLES || []).find((r) => r.id === id);
          if (def && def.chatColor) return def.chatColor;
        }
      }
      return '#A78BFA'; // membru default
    },

    isInCoordination(profile, user) {
      if (window.FarcasaAuth.isSuperAdmin(user)) return true;
      if (!profile) return false;
      if (profile.memberInCoordination) return true;
      return (profile.roles || []).includes('conducere') || (profile.roles || []).includes('administrator');
    },

    async listChannels() {
      await this.ensureSystemChannels();
      const me = window.FarcasaAuth.getUser();
      const profile = await this.getMyProfile();
      const isCoord = this.isInCoordination(profile, me);

      if (isCloud() && initFirebase()) {
        const snap = await db.collection(CHANNELS).get();
        let list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // filter conducere visibility
        list = list.filter((ch) => {
          if (ch.type === 'conducere') return !!isCoord;
          return true;
        });
        // sort: system first, then owned
        const order = { public: 0, anunturi: 1, conducere: 2, owned: 3 };
        list.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || String(a.name).localeCompare(String(b.name)));
        return list;
      }
      return [
        { id: 'discutii', name: 'Discuții', type: 'public' },
        { id: 'anunturi', name: 'Anunțuri', type: 'anunturi' }
      ];
    },

    async createMyChannel(name) {
      const u = window.FarcasaAuth.getUser();
      if (!u || !u.uid) throw new Error('Trebuie să fii logat');
      if (!isCloud() || !initFirebase()) throw new Error('Forum-ul necesită Firebase');
      name = (name || '').trim();
      if (name.length < 2) throw new Error('Numele canalului e prea scurt');
      // one channel per user
      const existing = await db.collection(CHANNELS).where('ownerId', '==', u.uid).where('type', '==', 'owned').limit(1).get();
      if (!existing.empty) throw new Error('Poți avea un singur canal personal. Șterge-l pe cel actual ca să creezi altul.');
      const ref = db.collection(CHANNELS).doc();
      await ref.set({
        name,
        type: 'owned',
        ownerId: u.uid,
        ownerEmail: u.email || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        members: [u.uid],
        muted: [],
        banned: []
      });
      return ref.id;
    },


    async clearHistory(channelId) {
      const u = window.FarcasaAuth.getUser();
      const ch = await this.getChannel(channelId);
      if (!ch) throw new Error('Canal inexistent');
      const admin = window.FarcasaAuth.isAdmin(u) || window.FarcasaAuth.isSuperAdmin(u);
      const owner = ch.type === 'owned' && ch.ownerId === u.uid;
      if (!admin && !owner) throw new Error('Doar administratorul sau ownerul canalului poate șterge istoricul');
      if (!isCloud() || !initFirebase()) throw new Error('Necesită Firebase');
      const msgs = await db.collection(CHANNELS).doc(channelId).collection(MESSAGES).limit(400).get();
      if (msgs.empty) return;
      const batch = db.batch();
      msgs.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    },

    async deleteChannel(channelId) {
      const u = window.FarcasaAuth.getUser();
      const ch = await this.getChannel(channelId);
      if (!ch) throw new Error('Canal inexistent');
      const admin = window.FarcasaAuth.isAdmin(u) || window.FarcasaAuth.isSuperAdmin(u);
      if (ch.type !== 'owned' && !admin) throw new Error('Doar administratorul poate șterge canalele permanente');
      if (ch.type === 'owned' && ch.ownerId !== u.uid && !admin) throw new Error('Doar proprietarul sau administratorul poate șterge canalul');
      // delete messages (batch limited)
      const msgs = await db.collection(CHANNELS).doc(channelId).collection(MESSAGES).limit(400).get();
      const batch = db.batch();
      msgs.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(db.collection(CHANNELS).doc(channelId));
      await batch.commit();
      // cleanup join requests
      const reqs = await db.collection(JOIN_REQ).where('channelId', '==', channelId).get();
      const b2 = db.batch();
      reqs.docs.forEach((d) => b2.delete(d.ref));
      await b2.commit();
    },

    async getChannel(channelId) {
      if (!isCloud() || !initFirebase()) return null;
      const snap = await db.collection(CHANNELS).doc(channelId).get();
      if (!snap.exists) return null;
      return { id: snap.id, ...snap.data() };
    },

    canRead(ch, profile, user) {
      if (!ch) return false;
      if (ch.type === 'public' || ch.type === 'anunturi') return true;
      if (ch.type === 'conducere') {
        return this.isInCoordination(profile, user);
      }
      if (ch.type === 'owned') {
        if (!user) return false; // list visible but messages need membership or owner
        if (ch.ownerId === user.uid || window.FarcasaAuth.isSuperAdmin(user)) return true;
        if ((ch.members || []).includes(user.uid)) return true;
        return false;
      }
      return false;
    },

    canPost(ch, profile, user) {
      if (!user || !ch) return false;
      if ((ch.banned || []).includes(user.uid)) return false;
      if ((ch.muted || []).includes(user.uid)) return false;
      if (ch.type === 'public') return true;
      if (ch.type === 'anunturi') {
        // membrii (logati cu profil) din coordonare SAU admin
        return !!(profile && (profile.memberInCoordination || window.FarcasaAuth.isAdmin(user)));
      }
      if (ch.type === 'conducere') {
        return this.isInCoordination(profile, user);
      }
      if (ch.type === 'owned') {
        if (ch.ownerId === user.uid || window.FarcasaAuth.isSuperAdmin(user)) return true;
        return (ch.members || []).includes(user.uid);
      }
      return false;
    },

    isChannelMod(ch, user) {
      if (!ch || !user) return false;
      // Super-admin + admini din listă pot modera pe orice canal
      if (window.FarcasaAuth.isSuperAdmin(user) || window.FarcasaAuth.isAdmin(user)) return true;
      if (ch.type === 'owned') return ch.ownerId === user.uid;
      return false;
    },

    async requestJoin(channelId) {
      const u = window.FarcasaAuth.getUser();
      if (!u || !u.uid) throw new Error('Trebuie să fii logat');
      const ch = await this.getChannel(channelId);
      if (!ch || ch.type !== 'owned') throw new Error('Doar canalele personale acceptă cereri');
      if (ch.ownerId === u.uid) throw new Error('Ești proprietarul canalului');
      if ((ch.members || []).includes(u.uid)) throw new Error('Ești deja membru');
      if ((ch.banned || []).includes(u.uid)) throw new Error('Ești exclus din acest canal');
      const existing = await db.collection(JOIN_REQ)
        .where('channelId', '==', channelId)
        .where('userId', '==', u.uid)
        .where('status', '==', 'pending')
        .limit(1).get();
      if (!existing.empty) throw new Error('Ai deja o cerere în așteptare');
      await db.collection(JOIN_REQ).add({
        channelId,
        userId: u.uid,
        userEmail: u.email || '',
        userName: u.displayName || u.email || '',
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },

    async listJoinRequests(channelId) {
      const snap = await db.collection(JOIN_REQ)
        .where('channelId', '==', channelId)
        .where('status', '==', 'pending')
        .get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    async respondJoin(requestId, allow) {
      const u = window.FarcasaAuth.getUser();
      const reqRef = db.collection(JOIN_REQ).doc(requestId);
      const reqSnap = await reqRef.get();
      if (!reqSnap.exists) throw new Error('Cerere inexistentă');
      const req = reqSnap.data();
      const ch = await this.getChannel(req.channelId);
      if (!this.isChannelMod(ch, u)) throw new Error('Nu ești moderator');
      await reqRef.update({ status: allow ? 'approved' : 'rejected', resolvedAt: firebase.firestore.FieldValue.serverTimestamp() });
      if (allow) {
        await db.collection(CHANNELS).doc(req.channelId).update({
          members: firebase.firestore.FieldValue.arrayUnion(req.userId)
        });
      }
    },

    async muteUser(channelId, targetUid, mute) {
      const u = window.FarcasaAuth.getUser();
      const ch = await this.getChannel(channelId);
      if (!this.isChannelMod(ch, u)) throw new Error('Nu ești moderator');
      const ref = db.collection(CHANNELS).doc(channelId);
      if (mute) await ref.update({ muted: firebase.firestore.FieldValue.arrayUnion(targetUid) });
      else await ref.update({ muted: firebase.firestore.FieldValue.arrayRemove(targetUid) });
    },

    async kickUser(channelId, targetUid) {
      const u = window.FarcasaAuth.getUser();
      const ch = await this.getChannel(channelId);
      if (!this.isChannelMod(ch, u)) throw new Error('Nu ești moderator');
      if (ch.type === 'owned' && targetUid === ch.ownerId) throw new Error('Nu poți da kick proprietarului');
      await db.collection(CHANNELS).doc(channelId).update({
        members: firebase.firestore.FieldValue.arrayRemove(targetUid),
        banned: firebase.firestore.FieldValue.arrayUnion(targetUid),
        muted: firebase.firestore.FieldValue.arrayRemove(targetUid)
      });
    },

    async allowUser(channelId, targetUid) {
      const u = window.FarcasaAuth.getUser();
      const ch = await this.getChannel(channelId);
      if (!this.isChannelMod(ch, u)) throw new Error('Nu ești moderator');
      await db.collection(CHANNELS).doc(channelId).update({
        banned: firebase.firestore.FieldValue.arrayRemove(targetUid),
        muted: firebase.firestore.FieldValue.arrayRemove(targetUid),
        members: firebase.firestore.FieldValue.arrayUnion(targetUid)
      });
    },

    async getMessages(channelId, limitN) {
      limitN = limitN || 80;
      if (!isCloud() || !initFirebase()) return [];
      const snap = await db.collection(CHANNELS).doc(channelId).collection(MESSAGES)
        .orderBy('createdAt', 'asc').limitToLast(limitN).get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    subscribeMessages(channelId, onChange) {
      if (!isCloud() || !initFirebase()) return () => {};
      return db.collection(CHANNELS).doc(channelId).collection(MESSAGES)
        .orderBy('createdAt', 'asc').limitToLast(100)
        .onSnapshot((snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          onChange(rows);
        }, (err) => console.error(err));
    },

    async postMessage(channelId, text) {
      if (await window.FarcasaAuth.isCurrentBanned()) throw new Error('Contul este banat. Nu poți trimite mesaje.');
      const u = window.FarcasaAuth.getUser();
      if (!u) throw new Error('Trebuie să fii logat');
      text = (text || '').trim();
      if (!text) throw new Error('Mesaj gol');
      if (text.length > 2000) throw new Error('Mesaj prea lung');
      const ch = await this.getChannel(channelId);
      const profile = await this.getMyProfile();
      if (!this.canPost(ch, profile, u)) throw new Error('Nu ai dreptul să scrii pe acest canal');
      await db.collection(CHANNELS).doc(channelId).collection(MESSAGES).add({
        text,
        authorId: u.uid,
        authorEmail: u.email || '',
        authorName: (profile && profile.displayName) || u.displayName || u.email || 'Anonim',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },


    /** Utilizatori relevanți pentru un canal (+ cereri pending) */
    async listChannelUsers(channelId) {
      const ch = await this.getChannel(channelId);
      if (!ch) return { members: [], pending: [], banned: [], muted: [] };
      const muted = new Set(ch.muted || []);
      const banned = new Set(ch.banned || []);
      const memberIds = new Set(ch.members || []);
      if (ch.ownerId) memberIds.add(ch.ownerId);

      // participanți din mesaje
      try {
        const msgSnap = await db.collection(CHANNELS).doc(channelId).collection(MESSAGES)
          .orderBy('createdAt', 'desc').limit(200).get();
        msgSnap.docs.forEach((d) => {
          const a = d.data().authorId;
          if (a) memberIds.add(a);
        });
      } catch (e) {}

      // pentru canale publice / anunturi / conducere: toți userii înregistrați (vizibilitate listă)
      if (ch.type === 'public' || ch.type === 'anunturi' || ch.type === 'conducere') {
        try {
          const us = await db.collection('users').limit(200).get();
          us.docs.forEach((d) => memberIds.add(d.id));
        } catch (e) {}
      }

      let pending = [];
      if (ch.type === 'owned') {
        try {
          pending = await this.listJoinRequests(channelId);
        } catch (e) { pending = []; }
      }

      const members = [];
      for (const uid of memberIds) {
        if (pending.some((p) => p.userId === uid)) continue;
        let prof = await this.getUserProfile(uid);
        if (!prof) prof = { uid };
        if (prof.deleted || prof.displayName === 'Cont șters') continue;
        members.push({
          uid,
          displayName: prof.displayName || prof.email || uid.slice(0, 8),
          email: prof.email || '',
          photo: prof.photo || '',
          roles: prof.roles || [],
          memberInCoordination: !!prof.memberInCoordination,
          muted: muted.has(uid),
          banned: banned.has(uid),
          isOwner: ch.ownerId === uid
        });
      }
      members.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName), 'ro'));
      pending = pending.map((p) => ({
        requestId: p.id,
        uid: p.userId,
        displayName: p.userName || p.userEmail || p.userId,
        email: p.userEmail || '',
        pending: true
      }));
      return { members, pending, channel: ch };
    },

    async setMemberInCoordination(uid, value) {
      if (!window.FarcasaAuth.isSuperAdmin()) throw new Error('Doar super-admin');
      const rolesSnap = await db.collection('users').doc(uid).get();
      let roles = (rolesSnap.exists && rolesSnap.data().roles) ? [...rolesSnap.data().roles] : [];
      if (value && !roles.includes('conducere')) roles.push('conducere');
      if (!value) roles = roles.filter((r) => r !== 'conducere');
      await db.collection('users').doc(uid).set({
        memberInCoordination: !!value,
        roles
      }, { merge: true });
    },

    async setUserRoles(uid, rolesArray) {
      if (!window.FarcasaAuth.isSuperAdmin()) throw new Error('Doar super-admin');
      const roles = Array.isArray(rolesArray) ? rolesArray.filter(Boolean) : [];
      const inCoord = roles.includes('conducere') || roles.includes('administrator');
      await db.collection('users').doc(uid).set({
        roles,
        memberInCoordination: inCoord || undefined
      }, { merge: true });
      // keep memberInCoordination explicit
      await db.collection('users').doc(uid).set({
        memberInCoordination: roles.includes('conducere') || roles.includes('administrator')
      }, { merge: true });
    },

    async setUserTitle(uid, title) {
      if (!window.FarcasaAuth.isSuperAdmin()) throw new Error('Doar super-admin');
      await db.collection('users').doc(uid).set({ title: title || '' }, { merge: true });
    }
  };

  // boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initFirebase());
  } else {
    initFirebase();
  }
})();
