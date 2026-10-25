'use strict';
/* ═══════════════════════════════════════════════════════════════
   PAUSE GARDEN — Complete Application Logic & Architecture
   ═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════
   1. UTILITIES & HELPERS
   ══════════════════════════════ */
function $(id) { return document.getElementById(id); }
function $$(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

function fmt(secs) {
  const s = Math.max(0, Math.ceil(secs));
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function today() {
  return new Date().toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' });
}

function escHtml(t) {
  return String(t || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg) {
  const t = $('toastNotice');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 2600);
}

/* ══════════════════════════════
   2. STORAGE & USER PREFERENCES
   ══════════════════════════════ */
const Store = {
  get(k, fb = null) {
    try {
      const val = localStorage.getItem(`pg_${k}`);
      return val !== null ? JSON.parse(val) : fb;
    } catch {
      return fb;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(`pg_${k}`, JSON.stringify(v));
    } catch (e) {
      console.warn('Storage set failed:', e);
    }
  },
  push(k, item, max = 100) {
    const a = this.get(k, []);
    a.unshift(item);
    this.set(k, a.slice(0, max));
  },
  update(k, index, updatedItem) {
    const a = this.get(k, []);
    if (index >= 0 && index < a.length) {
      a[index] = { ...a[index], ...updatedItem };
      this.set(k, a);
    }
  },
  remove(k, pred) {
    this.set(k, this.get(k, []).filter((x, i) => !pred(x, i)));
  },
  clear() {
    ['sessions','notes','reflections','user','checkin','prefs','supabase'].forEach(k => {
      localStorage.removeItem(`pg_${k}`);
    });
  }
};

/* ══════════════════════════════
   3. SESSION ENGINE (Wall-Clock Accurate)
   ══════════════════════════════ */
const SessionEngine = (() => {
  let _start = null, _pauseAt = null, _pausedTime = 0;
  let _dur = 0, _rafId = null, _cb = {}, _running = false, _done = false;

  function tick() {
    if (!_running) return;
    const now = performance.now();
    const elapsed = Math.max(0, now - _start - _pausedTime);
    const remaining = Math.max(0, _dur - elapsed);
    const progress = Math.min(1, elapsed / _dur);

    if (_cb.onTick) {
      _cb.onTick(elapsed / 1000, remaining / 1000, progress);
    }

    if (remaining <= 0 && !_done) {
      _done = true;
      _running = false;
      if (_cb.onComplete) _cb.onComplete();
      return;
    }

    _rafId = requestAnimationFrame(tick);
  }

  function start(secs, cb) {
    stop();
    _dur = secs * 1000;
    _cb = cb || {};
    _start = performance.now();
    _pausedTime = 0;
    _pauseAt = null;
    _running = true;
    _done = false;
    _rafId = requestAnimationFrame(tick);
  }

  function pause() {
    if (!_running) return;
    _running = false;
    _pauseAt = performance.now();
    cancelAnimationFrame(_rafId);
    if (_cb.onPause) _cb.onPause();
  }

  function resume() {
    if (_running || !_pauseAt) return;
    _pausedTime += (performance.now() - _pauseAt);
    _pauseAt = null;
    _running = true;
    _rafId = requestAnimationFrame(tick);
    if (_cb.onResume) _cb.onResume();
  }

  function stop() {
    _running = false;
    _done = false;
    cancelAnimationFrame(_rafId);
    _start = null;
    _pauseAt = null;
    _pausedTime = 0;
    _cb = {};
  }

  function getElapsed() {
    if (!_start) return 0;
    const current = _pauseAt || performance.now();
    return Math.max(0, (current - _start - _pausedTime) / 1000);
  }

  return {
    start, pause, resume, stop, getElapsed,
    get isRunning() { return _running; },
    get isPaused()  { return !_running && !!_pauseAt; }
  };
})();

/* ══════════════════════════════
   4. AUDIO MANAGER (Web Audio Procedural Synthesis)
   ══════════════════════════════ */
const AudioManager = (() => {
  let ctx = null, master = null, muted = false;
  let nodes = [], current = null, vol = 0.5, playing = false;

  function getCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = vol;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  }

  function noiseBuffer(type = 'white') {
    const c = getCtx();
    const len = c.sampleRate * 4;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = Math.random() * 2 - 1;
    }
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < len; i++) {
        last = (last + 0.02 * d[i]) / 1.02;
        d[i] = last * 3.5;
      }
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  }

  function bq(type, freq, q = 1) {
    const f = getCtx().createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  }

  function gain(v) {
    const g = getCtx().createGain();
    g.gain.value = v;
    return g;
  }

  function lfo(rate, depth) {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.frequency.value = rate;
    g.gain.value = depth;
    osc.connect(g);
    osc.start();
    return { osc, g };
  }

  const soundGens = {
    rain() {
      const c = getCtx();
      const src = noiseBuffer('white');
      const lp = bq('lowpass', 1700);
      const hp = bq('highpass', 280);
      const g = gain(0.55);
      const { osc: lo, g: lg } = lfo(0.12, 0.08);
      lg.connect(g.gain);
      src.connect(lp).connect(hp).connect(g).connect(master);
      src.start();
      return [src, lp, hp, g, lo, lg];
    },
    forest() {
      const c = getCtx();
      const src = noiseBuffer('white');
      const bp = bq('bandpass', 1100, 1.2);
      const lp = bq('lowpass', 2400);
      const g = gain(0.28);
      const { osc: lo, g: lg } = lfo(0.06, 0.07);
      lg.connect(g.gain);
      src.connect(bp).connect(lp).connect(g).connect(master);
      src.start();

      // Gentle recurring bird chirp interval
      let timer = setInterval(() => {
        if (!playing || current !== 'forest') { clearInterval(timer); return; }
        try {
          const chirpOsc = c.createOscillator();
          const chirpGain = c.createGain();
          const f0 = 2400 + Math.random() * 800;
          chirpOsc.frequency.setValueAtTime(f0, c.currentTime);
          chirpOsc.frequency.exponentialRampToValueAtTime(f0 + 600, c.currentTime + 0.12);
          chirpGain.gain.setValueAtTime(0.06, c.currentTime);
          chirpGain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.22);
          chirpOsc.connect(chirpGain).connect(master);
          chirpOsc.start();
          chirpOsc.stop(c.currentTime + 0.25);
        } catch {}
      }, 4200);

      return [src, bp, lp, g, lo, lg, { stop() { clearInterval(timer); } }];
    },
    water() {
      const c = getCtx();
      const s1 = noiseBuffer('white'), s2 = noiseBuffer('white');
      const bp1 = bq('bandpass', 850, 2.2), bp2 = bq('bandpass', 1650, 1.8);
      const g1 = gain(0.35), g2 = gain(0.22);
      const { osc: lo, g: lg } = lfo(0.25, 0.1);
      lg.connect(g1.gain);
      s1.connect(bp1).connect(g1).connect(master);
      s2.connect(bp2).connect(g2).connect(master);
      s1.start(); s2.start();
      return [s1, s2, bp1, bp2, g1, g2, lo, lg];
    },
    ocean() {
      const c = getCtx();
      const src = noiseBuffer('brown');
      const lp = bq('lowpass', 380);
      const g = gain(0.75);
      const { osc: lo, g: lg } = lfo(0.08, 0.32);
      lg.connect(g.gain);
      src.connect(lp).connect(g).connect(master);
      src.start();
      return [src, lp, g, lo, lg];
    },
    wind() {
      const c = getCtx();
      const src = noiseBuffer('white');
      const hp = bq('highpass', 420);
      const lp = bq('lowpass', 2400);
      const g = gain(0.32);
      const { osc: lo, g: lg } = lfo(0.07, 0.14);
      lg.connect(g.gain);
      src.connect(hp).connect(lp).connect(g).connect(master);
      src.start();
      return [src, hp, lp, g, lo, lg];
    },
    tone() {
      const c = getCtx();
      const freqs = [220, 277.18, 329.63, 440];
      const gains = [0.12, 0.08, 0.07, 0.05];
      return freqs.flatMap((f, i) => {
        const osc = c.createOscillator();
        const g = gain(gains[i]);
        osc.type = 'sine';
        osc.frequency.value = f;
        osc.connect(g).connect(master);
        osc.start();
        return [osc, g];
      });
    },
    silence() {
      stopAll();
      return [];
    }
  };

  function play(name) {
    stopAll();
    if (!soundGens[name] || name === 'silence') {
      current = 'silence';
      playing = false;
      updateUI();
      return;
    }
    getCtx();
    nodes = soundGens[name]();
    current = name;
    playing = true;
    updateUI();
  }

  function stopAll() {
    nodes.forEach(n => {
      try { n.stop && n.stop(); } catch {}
      try { n.disconnect && n.disconnect(); } catch {}
    });
    nodes = [];
    current = null;
    playing = false;
    updateUI();
  }

  function pauseAudio() {
    if (ctx && ctx.state === 'running') ctx.suspend();
    playing = false;
    updateUI();
  }

  function resumeAudio() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
    playing = true;
    updateUI();
  }

  function setVol(v) {
    vol = Math.max(0, Math.min(1, v));
    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, 0.05);
    }
    const slider = $('abVol'); if (slider) slider.value = vol;
    const modalSlider = $('smVolSlider'); if (modalSlider) modalSlider.value = vol;
  }

  function toggleMute() {
    muted = !muted;
    if (master && ctx) {
      master.gain.setTargetAtTime(muted ? 0 : vol, ctx.currentTime, 0.05);
    }
    updateUI();
  }

  function duck(active) {
    if (!master || !ctx) return;
    const target = active ? vol * 0.22 : (muted ? 0 : vol);
    master.gain.setTargetAtTime(target, ctx.currentTime, 0.25);
  }

  function playChime(freq = 528) {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, c.currentTime + 1.2);
      g.gain.setValueAtTime(0.25, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2);
      osc.connect(g).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 1.3);
    } catch {}
  }

  const LABELS = {
    rain: 'Gentle Rain',
    forest: 'Forest & Birds',
    water: 'Flowing Water',
    ocean: 'Ocean Waves',
    wind: 'Soft Wind',
    tone: 'Gentle Melody',
    silence: 'Silence'
  };

  function updateUI() {
    const bar = $('audioBar'), name = $('abName'), pp = $('abPlayPause'), muteBtn = $('abMute');
    if (bar) {
      if (current && current !== 'silence') {
        bar.hidden = false;
        if (name) name.textContent = LABELS[current] || current;
        if (pp) {
          pp.textContent = playing ? '⏸' : '▶';
          pp.setAttribute('aria-label', playing ? 'Pause sound' : 'Resume sound');
        }
        if (muteBtn) {
          muteBtn.textContent = muted ? '🔇' : '🔊';
          muteBtn.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
        }
      } else {
        bar.hidden = true;
      }
    }

    // Sync sound chips on home
    $$('.sound-chip').forEach(chip => {
      const isCur = chip.dataset.sound === current;
      chip.classList.toggle('active', isCur);
    });

    // Sync sound cards in modal
    $$('.sound-card').forEach(card => {
      const isCur = card.dataset.sound === current;
      card.classList.toggle('active', isCur);
      const btn = card.querySelector('.sc-play-btn');
      if (btn) btn.textContent = isCur && playing ? 'Playing' : 'Play';
    });

    const smMute = $('smMuteBtn');
    if (smMute) smMute.textContent = muted ? 'Unmute' : 'Mute';
  }

  return {
    play, stopAll, pauseAudio, resumeAudio, setVol, toggleMute, duck, playChime,
    get isPlaying() { return playing; },
    get current() { return current; },
    get isMuted() { return muted; }
  };
})();

/* ══════════════════════════════
   5. VOICE GUIDANCE (Web Speech API)
   ══════════════════════════════ */
const VoiceGuide = (() => {
  let mode = 'none';
  let chosenVoice = null;
  const synth = window.speechSynthesis;
  const supported = 'speechSynthesis' in window;

  function initVoices() {
    if (!supported) return;
    function populate() {
      const voices = synth.getVoices();
      const sel = $('vpVoiceSelect');
      if (!sel) return;
      sel.innerHTML = '<option value="">Default browser voice</option>';
      voices.forEach((v, i) => {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `${v.name} (${v.lang})`;
        sel.appendChild(opt);
      });
    }
    populate();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = populate;
    }
  }

  function speak(text) {
    if (!supported || mode === 'none') return;
    cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.82;
    u.pitch = 0.95;
    u.volume = 1;
    const voices = synth.getVoices();
    const sel = $('vpVoiceSelect');
    if (sel && sel.value !== '' && voices[+sel.value]) {
      u.voice = voices[+sel.value];
    }
    u.onstart = () => AudioManager.duck(true);
    u.onend = u.onerror = () => AudioManager.duck(false);
    synth.speak(u);
  }

  function cancel() {
    if (supported) synth.cancel();
    AudioManager.duck(false);
  }

  function setMode(m) {
    mode = m;
    if (m === 'voice-sounds' && !AudioManager.isPlaying) {
      AudioManager.play('rain');
    }
  }

  return {
    initVoices, speak, cancel, setMode,
    get mode() { return mode; },
    get available() { return supported; }
  };
})();

/* ══════════════════════════════
   6. AUTHENTICATION & USER PROFILE
   ══════════════════════════════ */
const Auth = {
  getUser() {
    return Store.get('user', null);
  },
  signUp(name, email) {
    if (!name.trim()) return { error: 'Please enter your name.' };
    const u = {
      name: name.trim(),
      email: (email || '').trim(),
      created: new Date().toISOString()
    };
    Store.set('user', u);
    return { user: u };
  },
  signIn(name) {
    if (!name.trim()) return { error: 'Please enter your name.' };
    const existing = Store.get('user', null);
    if (!existing) {
      return this.signUp(name, '');
    }
    return { user: existing };
  },
  signOut() {
    Store.set('user', null);
    updateNavAuth();
    showToast('Signed out of profile.');
  }
};

function updateNavAuth() {
  const user = Auth.getUser();
  const btn = $('authBtn');
  if (!btn) return;
  if (user) {
    btn.textContent = user.name.split(' ')[0];
    btn.onclick = () => {
      if (confirm(`Signed in as ${user.name}. Would you like to sign out?`)) {
        Auth.signOut();
      }
    };
  } else {
    btn.textContent = 'Sign in';
    btn.onclick = () => Router.show('auth');
  }
}

/* ══════════════════════════════
   7. PROGRESS & SESSION HISTORY
   ══════════════════════════════ */
const Progress = {
  record(activity, dur) {
    Store.push('sessions', {
      activity,
      dur,
      at: new Date().toISOString()
    });
    showToast(`Session complete: +${Math.round(dur/60)} minutes recorded ✦`);
  },
  getAll() {
    return Store.get('sessions', []);
  }
};

/* ══════════════════════════════
   8. DAILY INTENTION & CHECK-IN
   ══════════════════════════════ */
const INTENTIONS = [
  "You don't have to carry everything at once. Put down whatever is not needed for the next ten minutes.",
  "Your worth is not measured by your productivity today. You are allowed to take up space and rest.",
  "Breathe through this transition. One calm breath can change how the next hour unfolds.",
  "Give yourself permission to do the next small thing with kindness and without rushing.",
  "Notice where your body is holding tension right now. Let your shoulders drop half an inch.",
  "Be patient with yourself. You are learning, adapting, and doing your best."
];

function drawIntention() {
  const idx = Math.floor(Math.random() * INTENTIONS.length);
  const text = INTENTIONS[idx];
  const el = $('dailyIntentionText');
  if (el) el.textContent = `"${text}"`;
}

const MOOD_MAP = {
  calm:        { text: 'You seem in a peaceful place. Any practice will gently nourish your day.', act: 'breathing' },
  okay:        { text: 'A gentle 3-minute stretch or breath can give your day a fresh boost.', act: 'yoga' },
  tired:       { text: 'A screen break or gentle body relaxation will help restore tired eyes and muscles.', act: 'screen' },
  stressed:    { text: 'Slow, spacious breathing will help settle your nervous system right now.', act: 'breathing' },
  overwhelmed: { text: 'Grounding or short breathing creates a quiet anchor when things feel loud.', act: 'grounding' },
  unsure:      { text: 'Quiet reflection can help you put words to whatever you are holding.', act: 'reflection' }
};

const ACT_LABELS = {
  breathing: 'Breathing Garden',
  meditation: 'Meditation Sanctuary',
  yoga: 'Yoga & Stretching Studio',
  grounding: 'Grounding Garden',
  relaxation: 'Body Relaxation',
  screen: 'Screen Break',
  reflection: 'Quiet Reflection',
  gratitude: 'Gratitude Garden'
};

function initCheckin() {
  const todayKey = new Date().toDateString();
  const prev = Store.get('checkin', null);
  if (prev && prev.date === todayKey) {
    const s = $('checkinSection');
    if (s) s.style.display = 'none';
  }

  $$('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const mood = btn.dataset.mood;
      Store.set('checkin', { mood, date: todayKey });
      showMoodSuggestion(mood);
    });
  });

  const skip = $('skipCheckin');
  if (skip) {
    skip.addEventListener('click', () => {
      const s = $('checkinSection');
      if (s) s.style.display = 'none';
    });
  }
}

function showMoodSuggestion(mood) {
  const s = MOOD_MAP[mood];
  if (!s) return;
  const wrap = $('moodSuggestion');
  $('suggestionText').textContent = s.text;
  const cta = $('suggestionCta');
  if (s.act) {
    cta.textContent = `Try ${ACT_LABELS[s.act]} →`;
    cta.onclick = () => openActivity(s.act);
    cta.hidden = false;
  } else {
    cta.hidden = true;
  }
  wrap.hidden = false;
}

/* ══════════════════════════════
   9. ROUTER & EXIT CONFIRMATION
   ══════════════════════════════ */
const Router = (() => {
  let stack = ['home'];

  function show(id) {
    if (stack[stack.length-1] !== id) {
      SessionEngine.stop();
      VoiceGuide.cancel();
    }
    $$('.view').forEach(v => {
      v.hidden = true;
      v.classList.remove('active');
    });
    const t = $(`view-${id}`);
    if (!t) return;
    t.hidden = false;
    t.classList.add('active');
    if (stack[stack.length-1] !== id) stack.push(id);
    window.scrollTo(0,0);
    try {
      if (id === 'home') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } else {
        history.replaceState(null, '', '#' + id);
      }
    } catch {}
  }

  function requestExit(onConfirmed) {
    if (SessionEngine.isRunning || SessionEngine.isPaused) {
      const wasRunning = SessionEngine.isRunning;
      SessionEngine.pause();
      const modal = $('exitConfirmModal');
      modal.hidden = false;
      const stayBtn = $('exitConfirmStay');
      const leaveBtn = $('exitConfirmLeave');

      const cleanup = () => {
        modal.hidden = true;
        stayBtn.onclick = null;
        leaveBtn.onclick = null;
      };

      stayBtn.onclick = () => {
        cleanup();
        if (wasRunning) SessionEngine.resume();
      };
      leaveBtn.onclick = () => {
        cleanup();
        SessionEngine.stop();
        VoiceGuide.cancel();
        if (onConfirmed) onConfirmed();
      };
    } else {
      SessionEngine.stop();
      VoiceGuide.cancel();
      if (onConfirmed) onConfirmed();
    }
  }

  function back() {
    requestExit(() => {
      stack.pop();
      const prev = stack[stack.length-1] || 'home';
      show(prev);
      if (stack[stack.length-1] === prev && stack[stack.length-2] === prev) {
        stack.pop();
      }
    });
  }

  return {
    show, back, requestExit,
    get current() { return stack[stack.length-1]; }
  };
})();

function openActivity(key) {
  SessionEngine.stop();
  VoiceGuide.cancel();
  resetActivity(key);
  Router.show(key);
}

function resetActivity(key) {
  const map = {
    breathing:  () => BreathingActivity.reset(),
    meditation: () => MeditationActivity.reset(),
    yoga:       () => YogaActivity.reset(),
    grounding:  () => GroundingActivity.reset(),
    relaxation: () => RelaxationActivity.reset(),
    screen:     () => ScreenActivity.reset(),
    reflection: () => ReflectionActivity.reset(),
    gratitude:  () => GratitudeActivity.reset()
  };
  map[key] && map[key]();
}

/* ══════════════════════════════════════════════════════════
   10. ACTIVITY 1: BREATHING GARDEN
   ══════════════════════════════════════════════════════════ */
const BreathingActivity = (() => {
  let dur = 180, phase = 'idle', lastPhase = null;
  const INHALE = 4000, EXHALE = 4000, REST = 2000, CYCLE = 10000;

  function getPhaseFor(elapsedMs) {
    const pos = elapsedMs % CYCLE;
    if (pos < INHALE)          return { name:'inhale' };
    if (pos < INHALE + EXHALE) return { name:'exhale' };
    return { name:'rest' };
  }

  const LABELS = { inhale:'Breathe in', exhale:'Breathe out', rest:'Rest' };
  const VOICE  = { inhale:'Breathe in slowly.', exhale:'Breathe out gently.', rest: null };

  function applyPhase(p) {
    if (p === phase) return;
    phase = p;
    const orb = $('breathOrb');
    orb.classList.remove('phase-inhale','phase-exhale','phase-rest');
    orb.classList.add(`phase-${p}`);
    $('breathPhase').textContent = LABELS[p];
    if (lastPhase !== p && VOICE[p] && VoiceGuide.mode !== 'none') {
      lastPhase = p;
      VoiceGuide.speak(VOICE[p]);
    }
  }

  function setRunning(r) {
    const btn = $('breathStart');
    btn.textContent = r ? 'Pause' : (SessionEngine.isPaused ? 'Resume' : 'Start');
    $('breathOrb').classList.toggle('paused', !r && SessionEngine.isPaused);
  }

  function showCompletion() {
    $('breathComplete').hidden = false;
    $('breathCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
    VoiceGuide.cancel();
    setTimeout(() => VoiceGuide.speak('Your session is complete. Let your breathing return to its natural rhythm.'), 600);
    Progress.record('breathing', dur);
    $('breathStart').textContent = 'Done ✦';
  }

  function start() {
    $('breathComplete').hidden = true;
    lastPhase = null; phase = 'idle';
    const orb = $('breathOrb');
    orb.classList.remove('phase-inhale','phase-exhale','phase-rest','paused');
    $('breathPhase').textContent = 'Begin';

    SessionEngine.start(dur, {
      onTick(el, rem, prog) {
        $('breathElapsed').textContent = `Elapsed ${fmt(el)}`;
        $('breathTimer').textContent   = fmt(rem);
        $('breathProg').style.width    = (prog * 100) + '%';
        applyPhase(getPhaseFor(el * 1000).name);
      },
      onComplete: showCompletion,
      onPause() {
        $('breathOrb').classList.add('paused');
        VoiceGuide.cancel();
        setRunning(false);
      },
      onResume() {
        $('breathOrb').classList.remove('paused');
        setRunning(true);
      }
    });
    setRunning(true);
    $('breathHint').textContent = 'Follow the gentle pulse. Inhale as it blooms, exhale as it softens.';
  }

  function init() {
    $$('#view-breathing .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-breathing .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      reset();
    }));

    $('breathStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); }
      else if (SessionEngine.isPaused) { SessionEngine.resume(); setRunning(true); }
      else { start(); }
    });

    $('breathRestart').addEventListener('click', reset);

    const toggleVoice = () => {
      const p = $('voicePanel');
      p.hidden = !p.hidden;
      $('breathVoiceBtn').setAttribute('aria-expanded', String(!p.hidden));
    };
    $('breathVoiceBtn').addEventListener('click', toggleVoice);
    $('breathSettingsBtn').addEventListener('click', toggleVoice);
    const closeVp = $('voicePanelClose');
    if (closeVp) closeVp.addEventListener('click', () => { $('voicePanel').hidden = true; });

    const previewBtn = $('vpPreviewVoice');
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        VoiceGuide.speak('Breathe in slowly, and exhale gently.');
      });
    }

    const soundBtn = $('breathSoundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => { $('soundsModal').hidden = false; });
    }

    $$('.vp-btn').forEach(btn => btn.addEventListener('click', () => {
      $$('.vp-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      VoiceGuide.setMode(btn.dataset.vmode);
    }));

    $('breathAgain').addEventListener('click', reset);
    $('breathOther').addEventListener('click', () => {
      Router.show('home');
      setTimeout(() => $('activities').scrollIntoView({ behavior:'smooth' }), 120);
    });
  }

  function reset() {
    SessionEngine.stop();
    VoiceGuide.cancel();
    phase = 'idle'; lastPhase = null;
    const orb = $('breathOrb');
    orb.classList.remove('phase-inhale','phase-exhale','phase-rest','paused');
    $('breathPhase').textContent = 'Ready';
    $('breathStart').textContent = 'Start';
    $('breathElapsed').textContent = 'Elapsed 00:00';
    $('breathTimer').textContent   = fmt(dur);
    $('breathProg').style.width    = '0%';
    $('breathComplete').hidden     = true;
    $('breathHint').textContent    = 'Choose a duration and press Start';
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   11. ACTIVITY 2: MEDITATION SANCTUARY
   ══════════════════════════════════════════════════════════ */
const MeditationActivity = (() => {
  let dur = 180;
  const PROMPTS = [
    "Settle in. There's nowhere else you need to be right now.",
    "Notice the weight of your body. Let yourself be held and supported.",
    "Follow the natural rhythm of your breath — easy in, easy out.",
    "If thoughts arise, let them drift like clouds. No need to follow them.",
    "Return to this breath. Right here. Right now.",
    "Soften your face, your jaw, and your hands. You are here, and that is enough."
  ];

  function start() {
    $('medComplete').hidden = true;
    const interval = (dur / PROMPTS.length) * 1000;
    let promptIdx = 0;
    $('medPrompt').textContent = PROMPTS[0];
    $('medInstruct').textContent = '';

    SessionEngine.start(dur, {
      onTick(el, rem, prog) {
        $('medElapsed').textContent = `Elapsed ${fmt(el)}`;
        $('medTimer').textContent   = fmt(rem);
        $('medProg').style.width    = (prog * 100) + '%';
        const idx = Math.min(PROMPTS.length-1, Math.floor((el * 1000) / interval));
        if (idx !== promptIdx) {
          promptIdx = idx;
          $('medPrompt').style.opacity = '0';
          setTimeout(() => {
            $('medPrompt').textContent = PROMPTS[idx];
            $('medPrompt').style.opacity = '1';
          }, 400);
        }
      },
      onComplete() {
        $('medComplete').hidden = false;
        $('medCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
        Progress.record('meditation', dur);
        $('medStart').textContent = 'Done ✦';
      },
      onPause()  { $('medStart').textContent = 'Resume'; },
      onResume() { $('medStart').textContent = 'Pause'; }
    });
    $('medStart').textContent = 'Pause';
  }

  function init() {
    $$('#view-meditation .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-meditation .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      reset();
    }));

    $('medStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); $('medStart').textContent = 'Resume'; }
      else if (SessionEngine.isPaused) { SessionEngine.resume(); $('medStart').textContent = 'Pause'; }
      else start();
    });

    $('medRestart').addEventListener('click', reset);

    const soundBtn = $('medSoundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => { $('soundsModal').hidden = false; });
    }

    $('medOther').addEventListener('click', () => {
      Router.show('home');
      setTimeout(() => $('activities').scrollIntoView({ behavior:'smooth' }), 120);
    });
  }

  function reset() {
    SessionEngine.stop();
    $('medStart').textContent = 'Start';
    $('medElapsed').textContent = 'Elapsed 00:00';
    $('medTimer').textContent   = fmt(dur);
    $('medProg').style.width    = '0%';
    $('medComplete').hidden     = true;
    $('medInstruct').textContent = 'Choose a duration and press Start to settle into stillness';
    $('medPrompt').textContent   = "Settle in. There's nowhere else you need to be right now.";
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   12. ACTIVITY 3: YOGA & STRETCHING STUDIO
   ══════════════════════════════════════════════════════════ */
const YogaActivity = (() => {
  let dur = 180, poseIdx = 0, currentRoutine = 'desk';

  const ROUTINES = {
    desk: [
      {
        name: 'Gentle Neck Tilts',
        instruct: 'Gently let your right ear drift toward your right shoulder. Breathe slowly, then ease back to center and switch to the left. Keep shoulders relaxed.',
        animClass: 'yoga-anim-neck',
        transforms: { head:'rotate(18deg)', body:'', arml:'rotate(12deg)', armr:'rotate(-12deg)', legl:'', legr:'' }
      },
      {
        name: 'Shoulder Rolls',
        instruct: 'Roll both shoulders backward in slow, generous circles—up toward your ears, back, and down. Release tension from study hours.',
        animClass: 'yoga-anim-shoulders',
        transforms: { head:'', body:'', arml:'rotate(-50deg) translateY(-8px)', armr:'rotate(50deg) translateY(-8px)', legl:'', legr:'' }
      },
      {
        name: 'Wrist & Hand Stretch',
        instruct: 'Extend both arms forward. Slowly flex your hands up and down, circling the wrists. Open and close your fingers to relieve keyboard fatigue.',
        animClass: 'yoga-anim-wrists',
        transforms: { head:'', body:'', arml:'rotate(35deg) translateY(12px)', armr:'rotate(-35deg) translateY(12px)', legl:'', legr:'' }
      },
      {
        name: 'Seated Spinal Twist',
        instruct: 'Place your left hand on your right knee and gently turn your upper torso to the right. Look softly over your shoulder for a few slow breaths, then switch.',
        animClass: 'yoga-anim-twist',
        transforms: { head:'rotate(-15deg)', body:'rotate(-18deg)', arml:'rotate(-80deg)', armr:'rotate(30deg)', legl:'', legr:'' }
      }
    ],
    mobility: [
      {
        name: 'Gentle Neck Tilts',
        instruct: 'Ease your ear toward your shoulder softly. Relax your opposite hand by your side to gently lengthen the neck muscles.',
        animClass: 'yoga-anim-neck',
        transforms: { head:'rotate(18deg)', body:'', arml:'rotate(12deg)', armr:'rotate(-12deg)', legl:'', legr:'' }
      },
      {
        name: 'Side Reach & Stretch',
        instruct: 'Raise your right arm overhead and curve softly to the left. Feel the spacious opening along the side of your ribs. Breathe and switch.',
        animClass: 'yoga-anim-side',
        transforms: { head:'rotate(12deg)', body:'rotate(14deg)', arml:'rotate(10deg)', armr:'rotate(-100deg)', legl:'', legr:'' }
      },
      {
        name: 'Shoulder Rolls',
        instruct: 'Generous backward circles. Inhale as you lift, exhale as you slide your shoulder blades down your back.',
        animClass: 'yoga-anim-shoulders',
        transforms: { head:'', body:'', arml:'rotate(-50deg) translateY(-8px)', armr:'rotate(50deg) translateY(-8px)', legl:'', legr:'' }
      },
      {
        name: 'Seated Spinal Twist',
        instruct: 'Lengthen your spine as you inhale; gently rotate through the ribs as you exhale. Keep your hips grounded.',
        animClass: 'yoga-anim-twist',
        transforms: { head:'rotate(-15deg)', body:'rotate(-18deg)', arml:'rotate(-80deg)', armr:'rotate(30deg)', legl:'', legr:'' }
      },
      {
        name: 'Wrist & Finger Release',
        instruct: 'Gently flex and extend your palms. Rotate both wrists smoothly in wide circles.',
        animClass: 'yoga-anim-wrists',
        transforms: { head:'', body:'', arml:'rotate(35deg) translateY(12px)', armr:'rotate(-35deg) translateY(12px)', legl:'', legr:'' }
      }
    ],
    full: [
      {
        name: 'Gentle Neck Tilts',
        instruct: 'Tilt your head gently side to side, feeling the gentle release in your trapezius and neck.',
        animClass: 'yoga-anim-neck',
        transforms: { head:'rotate(18deg)', body:'', arml:'rotate(12deg)', armr:'rotate(-12deg)', legl:'', legr:'' }
      },
      {
        name: 'Shoulder Circles',
        instruct: 'Lift shoulders high, roll them back and down. Expand your chest with each breath in.',
        animClass: 'yoga-anim-shoulders',
        transforms: { head:'', body:'', arml:'rotate(-50deg) translateY(-8px)', armr:'rotate(50deg) translateY(-8px)', legl:'', legr:'' }
      },
      {
        name: 'Side Stretch & Reach',
        instruct: 'Sweep one arm up and arc across your body. Breathe deeply into your ribcage.',
        animClass: 'yoga-anim-side',
        transforms: { head:'rotate(12deg)', body:'rotate(14deg)', arml:'rotate(10deg)', armr:'rotate(-100deg)', legl:'', legr:'' }
      },
      {
        name: 'Seated Spinal Twist',
        instruct: 'Rotate gently from your navel upward. Keep your spine long and your jaw relaxed.',
        animClass: 'yoga-anim-twist',
        transforms: { head:'rotate(-15deg)', body:'rotate(-18deg)', arml:'rotate(-80deg)', armr:'rotate(30deg)', legl:'', legr:'' }
      },
      {
        name: 'Relaxed Forward Fold',
        instruct: 'Soften your knees and let your torso drape forward. Let your head and arms hang heavy like a ragdoll.',
        animClass: 'yoga-anim-fold',
        transforms: { head:'translateY(30px) rotate(30deg)', body:'rotate(-55deg)', arml:'rotate(15deg) translateY(20px)', armr:'rotate(-15deg) translateY(20px)', legl:'', legr:'' }
      },
      {
        name: 'Wrist & Forearm Stretch',
        instruct: 'Extend both hands, flexing palms forward and backward to release typing tension.',
        animClass: 'yoga-anim-wrists',
        transforms: { head:'', body:'', arml:'rotate(35deg) translateY(12px)', armr:'rotate(-35deg) translateY(12px)', legl:'', legr:'' }
      }
    ],
    neck: [
      {
        name: 'Gentle Neck Tilt Right',
        instruct: 'Allow your right ear to rest toward your right shoulder. Keep the left shoulder soft and anchored down.',
        animClass: 'yoga-anim-neck',
        transforms: { head:'rotate(20deg)', body:'', arml:'', armr:'', legl:'', legr:'' }
      },
      {
        name: 'Gentle Neck Tilt Left',
        instruct: 'Slowly return to center and ease your left ear toward your left shoulder. Breathe into any stiffness.',
        animClass: 'yoga-anim-neck',
        transforms: { head:'rotate(-20deg)', body:'', arml:'', armr:'', legl:'', legr:'' }
      },
      {
        name: 'Backward Shoulder Rolls',
        instruct: 'Roll shoulders up, back, and down. Imagine melting away the weight of books and screens.',
        animClass: 'yoga-anim-shoulders',
        transforms: { head:'', body:'', arml:'rotate(-45deg)', armr:'rotate(45deg)', legl:'', legr:'' }
      },
      {
        name: 'Shoulder Blade Squeeze',
        instruct: 'Draw your elbows back gently, squeezing your shoulder blades together. Open across your collarbones.',
        animClass: 'yoga-anim-shoulders',
        transforms: { head:'', body:'', arml:'rotate(-60deg)', armr:'rotate(60deg)', legl:'', legr:'' }
      }
    ],
    seated: [
      {
        name: 'Seated Spinal Twist',
        instruct: 'Gently turn your ribs and chest to one side while seated tall. Release any lower back compression.',
        animClass: 'yoga-anim-twist',
        transforms: { head:'rotate(-15deg)', body:'rotate(-18deg)', arml:'rotate(-80deg)', armr:'rotate(30deg)', legl:'', legr:'' }
      },
      {
        name: 'Overhead Side Stretch',
        instruct: 'Interlace your fingers, press palms to the ceiling, then lean softly to the side. Open your breathing space.',
        animClass: 'yoga-anim-side',
        transforms: { head:'', body:'rotate(10deg)', arml:'rotate(-90deg)', armr:'rotate(-90deg)', legl:'', legr:'' }
      },
      {
        name: 'Wrist & Hand Circling',
        instruct: 'Rotate both wrists 5 times clockwise, then 5 times counter-clockwise. Shake out your fingers.',
        animClass: 'yoga-anim-wrists',
        transforms: { head:'', body:'', arml:'rotate(35deg)', armr:'rotate(-35deg)', legl:'', legr:'' }
      },
      {
        name: 'Gentle Seated Forward Fold',
        instruct: 'Rest your chest on your thighs, letting your arms dangle. Take three deep, spacious belly breaths.',
        animClass: 'yoga-anim-fold',
        transforms: { head:'translateY(24px) rotate(25deg)', body:'rotate(-50deg)', arml:'rotate(20deg)', armr:'rotate(-20deg)', legl:'', legr:'' }
      }
    ]
  };

  function getActivePoses() {
    return ROUTINES[currentRoutine] || ROUTINES.desk;
  }

  function applyPose(idx) {
    const poses = getActivePoses();
    const p = poses[idx] || poses[0];
    const parts = { head:'yf-head-g', body:'yf-body-g', arml:'yf-arml-g', armr:'yf-armr-g', legl:'yf-legl-g', legr:'yf-legr-g' };

    Object.entries(parts).forEach(([k, id]) => {
      const el = $(id);
      if (el) el.style.transform = p.transforms[k] || '';
    });

    const svg = $('yogaSvg');
    if (svg) {
      svg.className = `yoga-svg ${p.animClass || ''}`;
    }

    $('yogaPoseName').textContent = p.name;
    $('yogaPoseInstruct').textContent = p.instruct;

    $$('.yoga-pose-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
      dot.classList.toggle('done',   i < idx);
    });
  }

  function buildTrack() {
    const poses = getActivePoses();
    const track = $('yogaPoseTrack');
    if (!track) return;
    track.innerHTML = '';
    poses.forEach((p, i) => {
      const dot = document.createElement('div');
      dot.className = 'yoga-pose-dot';
      dot.title = p.name;
      track.appendChild(dot);
    });
  }

  function start() {
    $('yogaComplete').hidden = true;
    const poses = getActivePoses();
    poseIdx = 0;
    const poseDur = dur / poses.length;
    applyPose(0);

    SessionEngine.start(dur, {
      onTick(el, rem, prog) {
        $('yogaElapsed').textContent = `Elapsed ${fmt(el)}`;
        $('yogaTimer').textContent   = fmt(rem);
        $('yogaProg').style.width    = (prog * 100) + '%';

        const newIdx = Math.min(poses.length - 1, Math.floor(el / poseDur));
        const poseElapsed = el - (newIdx * poseDur);
        const poseProg = Math.min(1, poseElapsed / poseDur);
        const poseRem = Math.max(0, Math.ceil(poseDur - poseElapsed));

        $('yogaPoseFill').style.width = (poseProg * 100) + '%';
        $('yogaStepTimer').textContent = `${poseRem}s`;
        $('yogaPoseRemain').textContent = `${poseRem}s remaining in this stretch`;

        if (newIdx !== poseIdx) {
          poseIdx = newIdx;
          applyPose(poseIdx);
        }
      },
      onComplete() {
        $('yogaComplete').hidden = false;
        $('yogaCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
        Progress.record('yoga', dur);
        $('yogaStart').textContent = 'Done ✦';
      },
      onPause()  { $('yogaStart').textContent = 'Resume'; },
      onResume() { $('yogaStart').textContent = 'Pause'; }
    });
    $('yogaStart').textContent = 'Pause';
  }

  function init() {
    buildTrack();

    // Routine selector chips
    $$('.routine-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (SessionEngine.isRunning) return;
        $$('.routine-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentRoutine = chip.dataset.routine;
        buildTrack();
        reset();
      });
    });

    $$('#view-yoga .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-yoga .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      reset();
    }));

    $('yogaStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); }
      else if (SessionEngine.isPaused) { SessionEngine.resume(); $('yogaStart').textContent = 'Pause'; }
      else start();
    });

    $('yogaPrev').addEventListener('click', () => {
      poseIdx = Math.max(0, poseIdx - 1);
      applyPose(poseIdx);
    });
    $('yogaNext').addEventListener('click', () => {
      const poses = getActivePoses();
      poseIdx = Math.min(poses.length - 1, poseIdx + 1);
      applyPose(poseIdx);
    });

    $('yogaRestart').addEventListener('click', reset);

    const soundBtn = $('yogaSoundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => { $('soundsModal').hidden = false; });
    }

    $('yogaOther').addEventListener('click', () => {
      Router.show('home');
      setTimeout(() => $('activities').scrollIntoView({ behavior:'smooth' }), 120);
    });
  }

  function reset() {
    SessionEngine.stop();
    poseIdx = 0;
    applyPose(0);
    $('yogaStart').textContent = 'Start';
    $('yogaElapsed').textContent = 'Elapsed 00:00';
    $('yogaTimer').textContent   = fmt(dur);
    $('yogaProg').style.width    = '0%';
    $('yogaPoseFill').style.width = '0%';
    $('yogaStepTimer').textContent = '--:--';
    $('yogaPoseRemain').textContent = '';
    $('yogaComplete').hidden = true;
    const svg = $('yogaSvg');
    if (svg) svg.className = 'yoga-svg';
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   13. ACTIVITY 4: GROUNDING GARDEN
   ══════════════════════════════════════════════════════════ */
const GroundingActivity = (() => {
  let dur = 180;

  function unlockStep(idx) {
    const step = $(`gs${idx}`);
    if (!step) return;
    step.classList.remove('gs-locked');
    step.classList.add('gs-active');
    const body   = step.querySelector('.gs-body');
    const numEl  = step.querySelector('.gs-number');
    const titleEl= step.querySelector('.gs-title');
    if (numEl)   numEl.classList.remove('gs-num-muted');
    if (titleEl) titleEl.classList.remove('gs-title-muted');
    if (body)    body.hidden = false;
  }

  function init() {
    unlockStep(0);

    $$('.gs-next').forEach(btn => btn.addEventListener('click', () => {
      unlockStep(+btn.dataset.next);
    }));

    const finishBtn = $('gsFinishBtn');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        $('groundComplete').hidden = false;
        $('groundCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
        Progress.record('grounding', dur);
        SessionEngine.stop();
      });
    }

    // Sensory pebbles
    $$('.pond-pebble').forEach(pebble => {
      pebble.addEventListener('click', () => {
        const tone = +pebble.dataset.tone || 528;
        AudioManager.playChime(tone);
        pebble.style.transform = 'scale(0.92)';
        setTimeout(() => { pebble.style.transform = ''; }, 180);
      });
    });

    $$('#view-grounding .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-grounding .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      reset();
    }));

    $('groundStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); $('groundStart').textContent = 'Resume'; return; }
      if (SessionEngine.isPaused)  { SessionEngine.resume(); $('groundStart').textContent = 'Pause'; return; }
      $('groundComplete').hidden = true;
      SessionEngine.start(dur, {
        onTick(el, rem, prog) {
          $('groundElapsed').textContent = `Elapsed ${fmt(el)}`;
          $('groundTimer').textContent   = fmt(rem);
          $('groundProg').style.width    = (prog * 100) + '%';
        },
        onComplete() {
          $('groundComplete').hidden = false;
          $('groundCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
          Progress.record('grounding', dur);
          $('groundStart').textContent = 'Done ✦';
        }
      });
      $('groundStart').textContent = 'Pause';
    });

    $('groundRestart').addEventListener('click', reset);

    const soundBtn = $('groundSoundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => { $('soundsModal').hidden = false; });
    }

    $('groundOther').addEventListener('click', () => {
      Router.show('home');
      setTimeout(() => $('activities').scrollIntoView({ behavior:'smooth' }), 120);
    });
  }

  function reset() {
    SessionEngine.stop();
    $('groundStart').textContent = 'Start';
    $('groundElapsed').textContent = 'Elapsed 00:00';
    $('groundTimer').textContent   = fmt(dur);
    $('groundProg').style.width    = '0%';
    $('groundComplete').hidden     = true;

    [0, 1, 2].forEach(i => {
      const s = $(`gs${i}`);
      if (!s) return;
      s.classList.remove('gs-active');
      if (i > 0) s.classList.add('gs-locked');
      const body = s.querySelector('.gs-body');
      if (body) body.hidden = (i > 0);
      const ta = s.querySelector('textarea');
      if (ta) ta.value = '';
      const num = s.querySelector('.gs-number'), title = s.querySelector('.gs-title');
      if (i > 0) {
        if (num) num.classList.add('gs-num-muted');
        if (title) title.classList.add('gs-title-muted');
      }
    });
    unlockStep(0);
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   14. ACTIVITY 5: BODY RELAXATION
   ══════════════════════════════════════════════════════════ */
const RelaxationActivity = (() => {
  let dur = 180, regionIdx = 0;
  const REGIONS = [
    { name:'Forehead & Jaw',  instruct:'Bring gentle attention to your forehead. Let it smooth and soften. Notice your jaw — let it hang slightly loose without clenching. Take a slow, relaxing breath.' },
    { name:'Shoulders & Neck', instruct:'Notice if your shoulders are creeping up toward your ears. On your next exhale, let them drop an inch. Give them permission to fully release.' },
    { name:'Hands & Wrists',  instruct:'Open your hands wide, then let them soften in your lap. Notice any lingering tension in your fingers from typing. Let each breath out soften your palms.' },
    { name:'Abdomen & Chest', instruct:'Place a hand on your belly if comfortable. Feel the natural rise and fall. Allow your abdomen to expand softly without holding it in.' },
    { name:'Thighs & Legs',   instruct:'Notice where your legs meet your seat. Are you holding them tightly? With each exhale, let them become a little heavier, sinking comfortably.' },
    { name:'Feet & Toes',     instruct:'Feel where your feet rest against the floor. Notice temperature and texture. Wiggle your toes gently, then let them completely rest.' }
  ];

  function applyRegion(idx) {
    regionIdx = idx;
    const r = REGIONS[idx] || { name:'Complete', instruct:"You've guided your whole body into relaxation. Take a quiet moment to enjoy this softened space." };
    $('relaxRegion').textContent = r.name;
    $('relaxInstruct').textContent = r.instruct;

    // Sync pill buttons
    $$('.rbm-region').forEach((el, i) => el.classList.toggle('rr-active', i === idx));

    // Sync SVG silhouette
    $$('.bs-region').forEach((el) => {
      el.classList.toggle('rr-active', +el.dataset.r === idx);
    });
  }

  function init() {
    // Click on silhouette regions or pill buttons
    $$('.bs-region, .rbm-region').forEach(el => {
      el.addEventListener('click', () => {
        applyRegion(+el.dataset.r);
      });
    });

    $$('#view-relaxation .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-relaxation .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      reset();
    }));

    $('relaxStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); $('relaxStart').textContent = 'Resume'; return; }
      if (SessionEngine.isPaused)  { SessionEngine.resume(); $('relaxStart').textContent = 'Pause'; return; }
      $('relaxComplete').hidden = true;
      regionIdx = 0;
      const regionDur = dur / REGIONS.length;
      applyRegion(0);

      SessionEngine.start(dur, {
        onTick(el, rem, prog) {
          $('relaxElapsed').textContent = `Elapsed ${fmt(el)}`;
          $('relaxTimer').textContent   = fmt(rem);
          $('relaxProg').style.width    = (prog * 100) + '%';
          const newRegion = Math.min(REGIONS.length - 1, Math.floor(el / regionDur));
          const regionEl  = el - (newRegion * regionDur);
          const regionProg = Math.min(1, regionEl / regionDur);
          $('relaxRegionFill').style.width = (regionProg * 100) + '%';
          if (newRegion !== regionIdx) applyRegion(newRegion);
        },
        onComplete() {
          $('relaxComplete').hidden = false;
          $('relaxCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
          Progress.record('relaxation', dur);
          $('relaxStart').textContent = 'Done ✦';
        }
      });
      $('relaxStart').textContent = 'Pause';
    });

    $('skipRegion').addEventListener('click', () => {
      regionIdx = Math.min(REGIONS.length - 1, regionIdx + 1);
      applyRegion(regionIdx);
    });

    $('relaxRestart').addEventListener('click', reset);

    const soundBtn = $('relaxSoundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => { $('soundsModal').hidden = false; });
    }

    $('relaxOther').addEventListener('click', () => {
      Router.show('home');
      setTimeout(() => $('activities').scrollIntoView({ behavior:'smooth' }), 120);
    });
  }

  function reset() {
    SessionEngine.stop();
    regionIdx = 0;
    applyRegion(0);
    $('relaxStart').textContent = 'Start';
    $('relaxElapsed').textContent = 'Elapsed 00:00';
    $('relaxTimer').textContent   = fmt(dur);
    $('relaxProg').style.width    = '0%';
    $('relaxRegionFill').style.width = '0%';
    $('relaxComplete').hidden     = true;
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   15. ACTIVITY 6: SCREEN BREAK
   ══════════════════════════════════════════════════════════ */
const ScreenActivity = (() => {
  let dur = 180, stepIdx = 0, chimesEnabled = true;
  const STEPS = [
    { title:'Look somewhere farther', desc:"Find a point across the room or out a window at least 20 feet away. Let your eye muscles relax and blink slowly for several breaths." },
    { title:'Relax your jaw and shoulders', desc:"Notice if you've been leaning forward into your monitor. Drop your shoulders down and let your jaw part gently." },
    { title:'Gently roll your wrists', desc:"Stretch both arms out in front of you. Circle your wrists slowly in both directions, opening and gently clenching your fingers." },
    { title:'Stand or change position', desc:"If you are able, stand up for a moment to stretch your hip flexors, or shift comfortably back in your chair." },
    { title:'Take three spacious breaths', desc:"Close your eyes or look downward away from any screen glow. Notice the cool air entering your nose and warm air leaving." }
  ];

  function applyStep(idx) {
    stepIdx = idx;
    const s = STEPS[idx];
    $('screenStepCount').textContent = `Step ${idx+1} of ${STEPS.length}`;
    $('screenStepTitle').textContent = s.title;
    $('screenStepDesc').textContent  = s.desc;
    $$('.sdot').forEach((d, i) => d.classList.toggle('active', i === idx));

    if (chimesEnabled) {
      AudioManager.playChime(528);
    }
  }

  function init() {
    const chimeBtn = $('screenChimeToggle');
    if (chimeBtn) {
      chimeBtn.addEventListener('click', () => {
        chimesEnabled = !chimesEnabled;
        chimeBtn.classList.toggle('active', chimesEnabled);
        chimeBtn.textContent = chimesEnabled ? 'Chime: ON 🔔' : 'Chime: OFF 🔕';
      });
    }

    $$('#view-screen .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-screen .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      reset();
    }));

    $('screenStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); $('screenStart').textContent = 'Resume'; return; }
      if (SessionEngine.isPaused)  { SessionEngine.resume(); $('screenStart').textContent = 'Pause'; return; }
      $('screenComplete').hidden = true;
      applyStep(0);
      const stepDur = dur / STEPS.length;

      SessionEngine.start(dur, {
        onTick(el, rem, prog) {
          $('screenElapsed').textContent = `Elapsed ${fmt(el)}`;
          $('screenTimer').textContent   = fmt(rem);
          $('screenProg').style.width    = (prog * 100) + '%';
          const newStep = Math.min(STEPS.length - 1, Math.floor(el / stepDur));
          if (newStep !== stepIdx) applyStep(newStep);
        },
        onComplete() {
          $('screenComplete').hidden = false;
          $('screenCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
          Progress.record('screen', dur);
          $('screenStart').textContent = 'Done ✦';
        }
      });
      $('screenStart').textContent = 'Pause';
    });

    $('screenRestart').addEventListener('click', reset);

    const soundBtn = $('screenSoundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => { $('soundsModal').hidden = false; });
    }

    $('screenOther').addEventListener('click', () => {
      Router.show('home');
      setTimeout(() => $('activities').scrollIntoView({ behavior:'smooth' }), 120);
    });
  }

  function reset() {
    SessionEngine.stop();
    stepIdx = 0;
    applyStep(0);
    $('screenStart').textContent = 'Start';
    $('screenElapsed').textContent = 'Elapsed 00:00';
    $('screenTimer').textContent   = fmt(dur);
    $('screenProg').style.width    = '0%';
    $('screenComplete').hidden     = true;
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   16. ACTIVITY 7: QUIET REFLECTION
   ══════════════════════════════════════════════════════════ */
const ReflectionActivity = (() => {
  let dur = 180, promptIdx = 0, timerActive = false;
  const PROMPTS = [
    "What is taking up space in your mind right now?",
    "What is one thing you can let go of for today?",
    "What would make the next hour feel a little easier?",
    "What do you need more of today — rest, clarity, or gentleness?",
    "What is something you've been carrying that deserves a pause?",
    "What small moment went right today, even if quietly?"
  ];

  function loadSavedReflections() {
    const refls = Store.get('reflections', []);
    const wrap = $('savedReflWrap'), list = $('savedReflList');
    wrap.hidden = refls.length === 0;
    list.innerHTML = '';
    refls.forEach((r, i) => {
      const div = document.createElement('div');
      div.className = 'refl-item';
      div.innerHTML = `
        <p class="refl-item-text">${escHtml(r.text)}</p>
        <p class="refl-item-date">${r.date}</p>
        <div class="refl-item-actions">
          <button class="refl-item-edit" title="Edit reflection" data-idx="${i}">✎ Edit</button>
          <button class="refl-item-del" title="Delete reflection" data-idx="${i}">✕</button>
        </div>
      `;
      list.appendChild(div);
    });

    $$('.refl-item-del', list).forEach(btn => btn.addEventListener('click', () => {
      if (confirm('Delete this saved reflection?')) {
        Store.remove('reflections', (_, i) => i === +btn.dataset.idx);
        loadSavedReflections();
      }
    }));

    $$('.refl-item-edit', list).forEach(btn => btn.addEventListener('click', () => {
      openEditModal('reflection', +btn.dataset.idx);
    }));
  }

  function init() {
    $('jcDate').textContent = today();
    loadSavedReflections();

    $('jcNewPrompt').addEventListener('click', () => {
      promptIdx = (promptIdx + 1) % PROMPTS.length;
      $('jcPrompt').textContent = PROMPTS[promptIdx];
    });

    $('jcClear').addEventListener('click', () => {
      $('jcText').value = '';
    });

    $('jcSave').addEventListener('click', () => {
      const text = $('jcText').value.trim();
      if (!text) return;
      Store.push('reflections', { text, date: today(), at: new Date().toISOString() });
      $('jcText').value = '';
      loadSavedReflections();
      showToast('Reflection saved to your garden ✦');
      Progress.record('reflection', dur);
    });

    $$('#view-reflection .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      dur = +btn.dataset.dur;
      $$('#view-reflection .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (!timerActive) $('reflTimer').textContent = fmt(dur);
    }));

    $('reflStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); $('reflStart').textContent = 'Resume timer'; return; }
      if (SessionEngine.isPaused)  { SessionEngine.resume(); $('reflStart').textContent = 'Pause timer'; return; }
      timerActive = true;
      $('reflComplete').hidden = true;
      SessionEngine.start(dur, {
        onTick(el, rem, prog) {
          $('reflElapsed').textContent = `Elapsed ${fmt(el)}`;
          $('reflTimer').textContent   = fmt(rem);
          $('reflProg').style.width    = (prog * 100) + '%';
        },
        onComplete() {
          timerActive = false;
          $('reflComplete').hidden = false;
          $('reflCompDur').textContent = `${Math.round(dur/60)} minute reflection completed`;
          $('reflStart').textContent = 'Timer done';
          Progress.record('reflection', dur);
        }
      });
      $('reflStart').textContent = 'Pause timer';
    });

    $('reflFinishEarly').addEventListener('click', () => {
      const text = $('jcText').value.trim();
      if (text) {
        Store.push('reflections', { text, date: today(), at: new Date().toISOString() });
        $('jcText').value = '';
        loadSavedReflections();
      }
      SessionEngine.stop();
      timerActive = false;
      $('reflComplete').hidden = false;
      $('reflCompDur').textContent = 'You took a quiet moment to check in.';
      Progress.record('reflection', dur);
    });

    $('reflRestart').addEventListener('click', reset);

    const soundBtn = $('reflSoundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => { $('soundsModal').hidden = false; });
    }

    $('reflOther').addEventListener('click', () => {
      Router.show('home');
      setTimeout(() => $('activities').scrollIntoView({ behavior:'smooth' }), 120);
    });
  }

  function reset() {
    SessionEngine.stop();
    timerActive = false;
    $('reflStart').textContent = 'Start timer';
    $('reflElapsed').textContent = 'Elapsed 00:00';
    $('reflTimer').textContent = fmt(dur);
    $('reflProg').style.width  = '0%';
    $('reflComplete').hidden   = true;
    $('jcDate').textContent    = today();
    loadSavedReflections();
  }

  return { init, reset, loadSavedReflections };
})();

/* ══════════════════════════════════════════════════════════
   17. ACTIVITY 8: GRATITUDE GARDEN
   ══════════════════════════════════════════════════════════ */
const GratitudeActivity = (() => {
  let dur = 180, promptIdx = 0, timerActive = false;
  const PROMPTS = [
    "Something small that made me smile…",
    "Someone I appreciated having in my day…",
    "Something about myself or my effort that I am proud of…",
    "A comfortable thing I don't want to take for granted…",
    "A moment of peace or kindness I noticed recently…",
    "A simple thing in nature or my room that looked lovely…"
  ];

  function renderNotes() {
    const notes = Store.get('notes', []);
    const gallery = $('notesGallery');
    $('notesEmpty').hidden = notes.length > 0;
    $$('.note-card', gallery).forEach(c => c.remove());

    notes.forEach((n, i) => {
      const div = document.createElement('div');
      div.className = 'note-card';
      div.innerHTML = `
        <div style="flex:1">
          <p class="note-card-text">"${escHtml(n.text)}"</p>
          <p class="note-card-date">${n.date}</p>
        </div>
        <div class="note-card-actions">
          <button class="note-card-edit" title="Edit note" data-idx="${i}">✎ Edit</button>
          <button class="note-card-del" title="Delete note" data-idx="${i}">✕</button>
        </div>
      `;
      gallery.appendChild(div);
    });

    $$('.note-card-del', gallery).forEach(btn => btn.addEventListener('click', () => {
      if (confirm('Delete this gratitude note?')) {
        Store.remove('notes', (_, i) => i === +btn.dataset.idx);
        renderNotes();
      }
    }));

    $$('.note-card-edit', gallery).forEach(btn => btn.addEventListener('click', () => {
      openEditModal('note', +btn.dataset.idx);
    }));
  }

  function init() {
    renderNotes();

    $('ncChange').addEventListener('click', () => {
      promptIdx = (promptIdx + 1) % PROMPTS.length;
      $('ncPrompt').textContent = PROMPTS[promptIdx];
    });

    $('ncSave').addEventListener('click', () => {
      const text = $('ncText').value.trim();
      if (!text) return;
      Store.push('notes', { text, date: today(), at: new Date().toISOString() });
      $('ncText').value = '';
      renderNotes();
      showToast('Note planted in your garden ✦');
      Progress.record('gratitude', dur);
    });

    $$('#view-gratitude .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      dur = +btn.dataset.dur;
      $$('#view-gratitude .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (!timerActive) $('gratTimer').textContent = fmt(dur);
    }));

    $('gratStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); $('gratStart').textContent = 'Resume timer'; return; }
      if (SessionEngine.isPaused)  { SessionEngine.resume(); $('gratStart').textContent = 'Pause timer'; return; }
      timerActive = true;
      $('gratComplete').hidden = true;
      SessionEngine.start(dur, {
        onTick(el, rem, prog) {
          $('gratElapsed').textContent = `Elapsed ${fmt(el)}`;
          $('gratTimer').textContent   = fmt(rem);
          $('gratProg').style.width    = (prog * 100) + '%';
        },
        onComplete() {
          timerActive = false;
          $('gratComplete').hidden = false;
          $('gratCompDur').textContent = `${Math.round(dur/60)} minute guided gratitude complete`;
          $('gratStart').textContent = 'Timer done';
          Progress.record('gratitude', dur);
        }
      });
      $('gratStart').textContent = 'Pause timer';
    });

    $('gratFinishEarly').addEventListener('click', () => {
      const text = $('ncText').value.trim();
      if (text) {
        Store.push('notes', { text, date: today(), at: new Date().toISOString() });
        $('ncText').value = '';
        renderNotes();
      }
      SessionEngine.stop();
      timerActive = false;
      $('gratComplete').hidden = false;
      $('gratCompDur').textContent = 'You made room for gratitude today.';
      Progress.record('gratitude', dur);
    });

    $('gratRestart').addEventListener('click', reset);

    const soundBtn = $('gratSoundBtn');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => { $('soundsModal').hidden = false; });
    }

    $('gratOther').addEventListener('click', () => {
      Router.show('home');
      setTimeout(() => $('activities').scrollIntoView({ behavior:'smooth' }), 120);
    });
  }

  function reset() {
    SessionEngine.stop();
    timerActive = false;
    $('gratStart').textContent = 'Start timer';
    $('gratElapsed').textContent = 'Elapsed 00:00';
    $('gratTimer').textContent = fmt(dur);
    $('gratProg').style.width  = '0%';
    $('gratComplete').hidden   = true;
    renderNotes();
  }

  return { init, reset, renderNotes };
})();

/* ══════════════════════════════════════════════════════════
   18. MY GARDEN & PROGRESS VIEW
   ══════════════════════════════════════════════════════════ */
function renderGardenView() {
  const sessions = Store.get('sessions', []);
  const notes    = Store.get('notes', []);
  const refls    = Store.get('reflections', []);

  // Compute total pause minutes
  const totalMins = sessions.reduce((acc, s) => acc + (s.dur ? Math.round(s.dur / 60) : 3), 0);
  const distinctActivities = new Set(sessions.map(s => s.activity)).size;

  // Render Stats
  const statsEl = $('gardenStats');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-card"><div class="stat-val">${sessions.length}</div><div class="stat-label">Pauses Completed</div></div>
      <div class="stat-card"><div class="stat-val">${totalMins}</div><div class="stat-label">Total Minutes</div></div>
      <div class="stat-card"><div class="stat-val">${notes.length}</div><div class="stat-label">Gratitude Notes</div></div>
      <div class="stat-card"><div class="stat-val">${distinctActivities} / 8</div><div class="stat-label">Practices Tried</div></div>
    `;
  }

  // Sessions List
  const sl = $('sessionsList');
  if (sl) {
    $('sessionsEmpty').hidden = sessions.length > 0;
    $$('.session-item', sl).forEach(i => i.remove());
    const colors = {
      breathing:'#6DCFC0', meditation:'#B8A2E0', yoga:'#B4CA50',
      grounding:'#8ED4B0', relaxation:'#E0937A', screen:'#90BFCE',
      reflection:'#C0B0DC', gratitude:'#D9AC60'
    };
    sessions.slice(0, 15).forEach(s => {
      const d = document.createElement('div');
      d.className = 'session-item';
      const mins = s.dur ? Math.round(s.dur/60) : 3;
      const date = s.at ? new Date(s.at).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
      d.innerHTML = `
        <div class="si-dot" style="background:${colors[s.activity] || '#246B50'}"></div>
        <span class="si-name">${ACT_LABELS[s.activity] || s.activity}</span>
        <span class="si-meta">${mins} min · ${date}</span>
      `;
      sl.appendChild(d);
    });
  }

  // Gratitude Notes
  const gn = $('gardenNotes');
  if (gn) {
    $('gardenNotesEmpty').hidden = notes.length > 0;
    $$('.note-card', gn).forEach(c => c.remove());
    notes.forEach((n, i) => {
      const d = document.createElement('div');
      d.className = 'note-card';
      d.innerHTML = `
        <div style="flex:1">
          <p class="note-card-text">"${escHtml(n.text)}"</p>
          <p class="note-card-date">${n.date}</p>
        </div>
        <div class="note-card-actions">
          <button class="note-card-edit" title="Edit note" data-idx="${i}">✎ Edit</button>
          <button class="note-card-del" title="Delete note" data-idx="${i}">✕</button>
        </div>
      `;
      gn.appendChild(d);
    });
    $$('.note-card-del', gn).forEach(btn => btn.addEventListener('click', () => {
      if (confirm('Delete this gratitude note?')) {
        Store.remove('notes', (_, i) => i === +btn.dataset.idx);
        renderGardenView();
      }
    }));
    $$('.note-card-edit', gn).forEach(btn => btn.addEventListener('click', () => {
      openEditModal('note', +btn.dataset.idx);
    }));
  }

  // Reflections
  const gr = $('gardenRefls');
  if (gr) {
    $('gardenReflsEmpty').hidden = refls.length > 0;
    $$('.refl-item', gr).forEach(c => c.remove());
    refls.forEach((r, i) => {
      const d = document.createElement('div');
      d.className = 'refl-item';
      d.innerHTML = `
        <p class="refl-item-text">${escHtml(r.text)}</p>
        <p class="refl-item-date">${r.date}</p>
        <div class="refl-item-actions">
          <button class="refl-item-edit" title="Edit reflection" data-idx="${i}">✎ Edit</button>
          <button class="refl-item-del" title="Delete reflection" data-idx="${i}">✕</button>
        </div>
      `;
      gr.appendChild(d);
    });
    $$('.refl-item-del', gr).forEach(btn => btn.addEventListener('click', () => {
      if (confirm('Delete this reflection?')) {
        Store.remove('reflections', (_, i) => i === +btn.dataset.idx);
        renderGardenView();
      }
    }));
    $$('.refl-item-edit', gr).forEach(btn => btn.addEventListener('click', () => {
      openEditModal('reflection', +btn.dataset.idx);
    }));
  }
}

/* ══════════════════════════════════════════════════════════
   19. DATA EXPORT, IMPORT & BACKUP
   ══════════════════════════════════════════════════════════ */
function exportDataJSON() {
  const data = {
    app: 'Pause Garden',
    exportedAt: new Date().toISOString(),
    sessions: Store.get('sessions', []),
    notes: Store.get('notes', []),
    reflections: Store.get('reflections', []),
    user: Store.get('user', null),
    checkin: Store.get('checkin', null)
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pause-garden-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded successfully ✦');
}

function importDataJSON(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (Array.isArray(data.sessions)) Store.set('sessions', data.sessions);
      if (Array.isArray(data.notes)) Store.set('notes', data.notes);
      if (Array.isArray(data.reflections)) Store.set('reflections', data.reflections);
      if (data.user) Store.set('user', data.user);
      renderGardenView();
      updateNavAuth();
      showToast('Data imported into your garden ✦');
    } catch {
      alert('Could not read backup file. Please ensure it is a valid Pause Garden JSON export.');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

/* ══════════════════════════════════════════════════════════
   20. EDIT NOTE / REFLECTION MODAL
   ══════════════════════════════════════════════════════════ */
let editingTarget = null; // { type: 'note' | 'reflection', index: number }

function openEditModal(type, index) {
  editingTarget = { type, index };
  const modal = $('editModal');
  const title = $('editModalTitle');
  const textarea = $('editModalText');
  const items = Store.get(type === 'note' ? 'notes' : 'reflections', []);
  const item = items[index];
  if (!item) return;

  title.textContent = type === 'note' ? 'Edit Gratitude Note' : 'Edit Reflection';
  textarea.value = item.text || '';
  modal.hidden = false;
  setTimeout(() => textarea.focus(), 100);
}

function initEditModal() {
  const modal = $('editModal');
  const cancelBtn = $('editModalCancel');
  const closeBtn = $('closeEditModalBtn');
  const saveBtn = $('editModalSave');

  const close = () => { modal.hidden = true; editingTarget = null; };
  if (cancelBtn) cancelBtn.onclick = close;
  if (closeBtn) closeBtn.onclick = close;

  if (saveBtn) {
    saveBtn.onclick = () => {
      if (!editingTarget) return;
      const text = $('editModalText').value.trim();
      if (!text) return;
      const key = editingTarget.type === 'note' ? 'notes' : 'reflections';
      Store.update(key, editingTarget.index, { text });
      close();
      GratitudeActivity.renderNotes();
      ReflectionActivity.loadSavedReflections();
      renderGardenView();
      showToast('Item updated ✦');
    };
  }
}

/* ══════════════════════════════════════════════════════════
   21. SETTINGS & PREFERENCES MODAL
   ══════════════════════════════════════════════════════════ */
function initSettingsModal() {
  const modal = $('settingsModal');
  const closeBtn = $('closeSettingsModalBtn');
  if (closeBtn) closeBtn.onclick = () => { modal.hidden = true; };

  // Nav link
  const navSettings = $('navSettings');
  if (navSettings) navSettings.onclick = () => {
    updateSettingsDisplay();
    modal.hidden = false;
  };

  // Duration select
  const durSelect = $('prefDefaultDur');
  if (durSelect) {
    const prefs = Store.get('prefs', {});
    if (prefs.dur) durSelect.value = prefs.dur;
    durSelect.addEventListener('change', () => {
      const p = Store.get('prefs', {});
      p.dur = durSelect.value;
      Store.set('prefs', p);
      showToast(`Default duration updated to ${Math.round(p.dur/60)} minutes`);
    });
  }

  // Reduced motion
  const motionCheck = $('prefReducedMotion');
  if (motionCheck) {
    const prefs = Store.get('prefs', {});
    motionCheck.checked = !!prefs.reducedMotion;
    document.body.classList.toggle('reduced-motion', !!prefs.reducedMotion);

    motionCheck.addEventListener('change', () => {
      const p = Store.get('prefs', {});
      p.reducedMotion = motionCheck.checked;
      Store.set('prefs', p);
      document.body.classList.toggle('reduced-motion', p.reducedMotion);
      showToast(p.reducedMotion ? 'Gentle motion mode enabled' : 'Normal animations restored');
    });
  }

  // Backup & Reset in Settings
  const backupBtn = $('backupDataBtn');
  if (backupBtn) backupBtn.onclick = exportDataJSON;

  const resetBtn = $('resetAllDataBtn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('Clear ALL your personal notes, reflections, and session history from this device?')) {
        Store.clear();
        renderGardenView();
        GratitudeActivity.renderNotes();
        ReflectionActivity.loadSavedReflections();
        updateNavAuth();
        updateSettingsDisplay();
        modal.hidden = true;
        showToast('All local data cleared.');
      }
    };
  }

  // Cloud sync / Supabase config
  const sbBtn = $('saveSbConfig');
  if (sbBtn) {
    const sbConfig = Store.get('supabase', {});
    if (sbConfig.url) $('sbUrl').value = sbConfig.url;
    if (sbConfig.key) $('sbKey').value = sbConfig.key;

    sbBtn.onclick = () => {
      const url = $('sbUrl').value.trim();
      const key = $('sbKey').value.trim();
      if (!url || !key) {
        Store.set('supabase', null);
        $('sbStatusHint').textContent = 'Currently using offline LocalStorage.';
        showToast('Cloud config cleared. Using LocalStorage.');
      } else {
        Store.set('supabase', { url, key });
        $('sbStatusHint').textContent = `Configured for ${url}. Local syncing active.`;
        showToast('Supabase configuration saved ✦');
      }
    };
  }
}

function updateSettingsDisplay() {
  const sessions = Store.get('sessions', []);
  const notes    = Store.get('notes', []);
  const refls    = Store.get('reflections', []);
  const statsEl  = $('storageStatsText');
  if (statsEl) {
    statsEl.textContent = `Current storage: ${sessions.length} sessions, ${notes.length} gratitude notes, ${refls.length} reflections.`;
  }
}

/* ══════════════════════════════════════════════════════════
   22. CALMING SOUNDS MODAL
   ══════════════════════════════════════════════════════════ */
function initSoundsModal() {
  const modal = $('soundsModal');
  const closeBtn = $('closeSoundsModalBtn');
  const doneBtn = $('soundModalDone');

  const close = () => { modal.hidden = true; };
  if (closeBtn) closeBtn.onclick = close;
  if (doneBtn) doneBtn.onclick = close;

  const openBtn = $('openSoundsModalBtn');
  if (openBtn) openBtn.onclick = () => { modal.hidden = false; };

  const navSounds = $('navSounds');
  if (navSounds) navSounds.onclick = () => { modal.hidden = false; };

  // Sound cards in modal
  $$('.sound-card').forEach(card => {
    card.addEventListener('click', () => {
      const sound = card.dataset.sound;
      if (AudioManager.current === sound && AudioManager.isPlaying) {
        AudioManager.stopAll();
      } else {
        AudioManager.play(sound);
      }
    });
  });

  // Modal volume and mute
  const smVol = $('smVolSlider');
  if (smVol) smVol.addEventListener('input', e => AudioManager.setVol(+e.target.value));

  const smMute = $('smMuteBtn');
  if (smMute) smMute.addEventListener('click', () => AudioManager.toggleMute());
}

/* ══════════════════════════════════════════════════════════
   23. AUTH VIEW & FORM HANDLERS
   ══════════════════════════════════════════════════════════ */
function initAuthView() {
  $('siSubmit').addEventListener('click', () => {
    const name = $('siName').value.trim();
    const res = Auth.signIn(name);
    if (res.error) {
      $('authError').textContent = res.error;
      $('authError').hidden = false;
    } else {
      $('authError').hidden = true;
      updateNavAuth();
      Router.show('home');
      showToast(`Welcome back, ${res.user.name} ✦`);
    }
  });

  $('suSubmit').addEventListener('click', () => {
    const name = $('suName').value.trim();
    const email = $('suEmail').value.trim();
    const res = Auth.signUp(name, email);
    if (res.error) {
      $('authError').textContent = res.error;
      $('authError').hidden = false;
    } else {
      $('authError').hidden = true;
      updateNavAuth();
      Router.show('home');
      showToast(`Welcome to your garden, ${res.user.name} ✦`);
    }
  });

  $('showSignup').addEventListener('click', () => {
    $('signinForm').hidden = true;
    $('signupForm').hidden = false;
  });
  $('showSignin').addEventListener('click', () => {
    $('signupForm').hidden = true;
    $('signinForm').hidden = false;
  });
}

/* ══════════════════════════════════════════════════════════
   24. AUDIO BAR
   ══════════════════════════════════════════════════════════ */
function initAudioBar() {
  $('abPlayPause').addEventListener('click', () => {
    if (AudioManager.isPlaying) AudioManager.pauseAudio();
    else AudioManager.resumeAudio();
  });

  const abMute = $('abMute');
  if (abMute) abMute.addEventListener('click', () => AudioManager.toggleMute());

  $('abStop').addEventListener('click', () => AudioManager.stopAll());
  $('abVol').addEventListener('input', e => AudioManager.setVol(+e.target.value));

  // Sound chips on home
  $$('.sound-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const sound = chip.dataset.sound;
      if (AudioManager.current === sound && AudioManager.isPlaying) {
        AudioManager.stopAll();
      } else {
        AudioManager.play(sound);
      }
    });
  });
}

/* ══════════════════════════════════════════════════════════
   25. NAVIGATION & KEYBOARD
   ══════════════════════════════════════════════════════════ */
function initNavigation() {
  $$('[data-back]').forEach(btn => btn.addEventListener('click', () => Router.back()));

  // Escape key exits current activity safely
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const modBackdrop = document.querySelector('.modal-backdrop:not([hidden])');
      if (modBackdrop) {
        modBackdrop.hidden = true;
        return;
      }
      if (Router.current !== 'home') {
        Router.back();
      }
    }
  });

  // Card clicks (home grid)
  $$('.activity-card').forEach(card => {
    card.addEventListener('click', () => openActivity(card.dataset.activity));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openActivity(card.dataset.activity);
      }
    });
  });

  // Category filter pills
  $$('.cat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      $$('.cat-pill').forEach(p => { p.classList.remove('active'); p.setAttribute('aria-selected', 'false'); });
      pill.classList.add('active');
      pill.setAttribute('aria-selected', 'true');
      const cat = pill.dataset.cat;
      $$('.activity-card').forEach(card => {
        if (cat === 'all' || card.dataset.cat === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Hero actions
  $('heroOrb').addEventListener('click', () => openActivity('breathing'));
  $('heroTakePause').addEventListener('click', () => openActivity('breathing'));
  $('heroExplore').addEventListener('click', () => {
    $('activities').scrollIntoView({ behavior: 'smooth' });
  });

  // Topbar nav
  $('homeLink').addEventListener('click', e => {
    e.preventDefault();
    if (Router.current !== 'home') Router.back();
  });

  const navAct = $('navActivities');
  if (navAct) navAct.addEventListener('click', () => {
    Router.requestExit(() => {
      if (Router.current !== 'home') Router.show('home');
      setTimeout(() => $('activities').scrollIntoView({ behavior: 'smooth' }), 100);
    });
  });

  const navGarden = $('navGarden');
  if (navGarden) navGarden.addEventListener('click', () => {
    Router.requestExit(() => {
      renderGardenView();
      Router.show('garden');
    });
  });

  // Backup actions on Garden page
  const exportBtn = $('exportDataBtn');
  if (exportBtn) exportBtn.addEventListener('click', exportDataJSON);

  const importInput = $('importFileInput');
  if (importInput) importInput.addEventListener('change', importDataJSON);

  const clearDataBtn = $('clearDataBtn');
  if (clearDataBtn) clearDataBtn.addEventListener('click', () => {
    if (confirm('Clear all your garden data? This will erase local history and saved notes.')) {
      Store.clear();
      renderGardenView();
      showToast('All local data cleared.');
    }
  });

  // Daily intention refresh
  const refInt = $('refreshIntentionBtn');
  if (refInt) refInt.addEventListener('click', drawIntention);

  // Privacy notice
  const privacyBtn = $('privacyBtn');
  if (privacyBtn) {
    privacyBtn.addEventListener('click', () => {
      updateSettingsDisplay();
      $('settingsModal').hidden = false;
    });
  }

  // Help fab
  $('helpFab').addEventListener('click', () => {
    alert(
      "🌿 Pause Garden Guide:\n\n" +
      "• Every guided practice offers strictly 3, 4, or 5 minute sessions.\n" +
      "• Escape key exits an active session with confirmation.\n" +
      "• Sounds are synthesized in real-time via Web Audio and run completely offline.\n" +
      "• Voice guidance uses your browser's speech synthesis and is off by default.\n" +
      "• All notes, reflections, and progress are stored privately on this browser in localStorage.\n" +
      "• You can backup or export your data anytime from My Garden or Settings."
    );
  });
}

/* ══════════════════════════════════════════════════════════
   26. INITIALIZATION
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Show home view
  Router.show('home');

  // Load preferences
  const prefs = Store.get('prefs', {});
  if (prefs.reducedMotion) {
    document.body.classList.add('reduced-motion');
  }

  // Draw daily intention
  drawIntention();

  // Initialize Speech Voices
  VoiceGuide.initVoices();

  // Initialize all 8 Activities
  BreathingActivity.init();
  MeditationActivity.init();
  YogaActivity.init();
  GroundingActivity.init();
  RelaxationActivity.init();
  ScreenActivity.init();
  ReflectionActivity.init();
  GratitudeActivity.init();

  // Initialize modals & features
  initSoundsModal();
  initSettingsModal();
  initEditModal();
  initAuthView();
  updateNavAuth();
  initAudioBar();
  initNavigation();
  initCheckin();

  // Handle visibility changes (pause active timers when user leaves tab)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && SessionEngine.isRunning) {
      SessionEngine.pause();
      const map = {
        breathing:  () => { $('breathStart').textContent = 'Resume'; },
        meditation: () => { $('medStart').textContent = 'Resume'; },
        yoga:       () => { $('yogaStart').textContent = 'Resume'; },
        grounding:  () => { $('groundStart').textContent = 'Resume'; },
        relaxation: () => { $('relaxStart').textContent = 'Resume'; },
        screen:     () => { $('screenStart').textContent = 'Resume'; }
      };
      map[Router.current] && map[Router.current]();
    }
  });

  // Handle direct hash navigation & deep linking
  function checkHash() {
    const h = window.location.hash.replace('#', '');
    if (h && (ACT_LABELS[h] || h === 'garden' || h === 'auth')) {
      if (h === 'garden') {
        renderGardenView();
        Router.show('garden');
      } else if (h === 'auth') {
        Router.show('auth');
      } else {
        openActivity(h);
      }
    }
  }
  window.addEventListener('hashchange', checkHash);
  checkHash();

  console.log('🌿 Pause Garden fully initialized and ready.');
});
