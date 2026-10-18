'use strict';
/* ═══════════════════════════════════════════════════════════════
   PAUSE GARDEN — Complete Application Logic
   ═══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════
   1. UTILITIES
   ══════════════════════════════ */
function $(id) { return document.getElementById(id); }
function $$(sel, ctx) { return (ctx || document).querySelectorAll(sel); }
function fmt(secs) {
  const s = Math.max(0, Math.ceil(secs));
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
function today() {
  return new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' });
}

/* ══════════════════════════════
   2. ROUTER
   ══════════════════════════════ */
const Router = (() => {
  let stack = ['home'];

  function show(id) {
    // Cleanup before leaving current view
    if (stack[stack.length-1] !== id) {
      SessionEngine.stop();
      VoiceGuide.cancel();
    }
    $$('.view').forEach(v => { v.hidden = true; v.classList.remove('active'); });
    const t = $(`view-${id}`);
    if (!t) return;
    t.hidden = false;
    t.classList.add('active');
    if (stack[stack.length-1] !== id) stack.push(id);
    window.scrollTo(0,0);
  }

  function back() {
    SessionEngine.stop();
    VoiceGuide.cancel();
    stack.pop();
    const prev = stack[stack.length-1] || 'home';
    show(prev);
    // Don't push again when going back
    if (stack[stack.length-1] === prev && stack[stack.length-2] === prev) stack.pop();
  }

  return { show, back, get current() { return stack[stack.length-1]; } };
})();

/* ══════════════════════════════
   3. SESSION ENGINE (rAF-based)
   ══════════════════════════════ */
const SessionEngine = (() => {
  let _start = null, _pauseAt = null, _paused = 0;
  let _dur = 0, _rafId = null, _cb = {}, _running = false, _done = false;

  function tick() {
    if (!_running) return;
    const now = performance.now();
    const elapsed = now - _start - _paused;
    const remaining = Math.max(0, _dur - elapsed);
    const progress = Math.min(1, elapsed / _dur);
    _cb.onTick && _cb.onTick(elapsed / 1000, remaining / 1000, progress);
    if (remaining <= 0 && !_done) {
      _done = true; _running = false;
      _cb.onComplete && _cb.onComplete();
      return;
    }
    _rafId = requestAnimationFrame(tick);
  }

  function start(secs, cb) {
    stop();
    _dur = secs * 1000; _cb = cb || {}; _start = performance.now();
    _paused = 0; _pauseAt = null; _running = true; _done = false;
    _rafId = requestAnimationFrame(tick);
  }

  function pause() {
    if (!_running) return;
    _running = false; _pauseAt = performance.now();
    cancelAnimationFrame(_rafId);
    _cb.onPause && _cb.onPause();
  }

  function resume() {
    if (_running || !_pauseAt) return;
    _paused += performance.now() - _pauseAt;
    _pauseAt = null; _running = true;
    _rafId = requestAnimationFrame(tick);
    _cb.onResume && _cb.onResume();
  }

  function stop() {
    _running = false; _done = false;
    cancelAnimationFrame(_rafId);
    _start = null; _pauseAt = null; _paused = 0; _cb = {};
  }

  function getElapsed() {
    if (!_start) return 0;
    return (performance.now() - _start - _paused) / 1000;
  }

  return { start, pause, resume, stop, getElapsed,
    get isRunning() { return _running; },
    get isPaused()  { return !_running && !!_pauseAt; } };
})();

/* ══════════════════════════════
   4. AUDIO MANAGER (Web Audio)
   ══════════════════════════════ */
const AudioManager = (() => {
  let ctx = null, master = null;
  let nodes = [], current = null, vol = 0.5, playing = false;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = vol;
      master.connect(ctx.destination);
    }
    return ctx;
  }

  function noise(type) {
    const c = getCtx();
    const bufLen = c.sampleRate * 4;
    const buf = c.createBuffer(1, bufLen, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    if (type === 'brown') {
      let last = 0;
      for (let i = 0; i < bufLen; i++) { last = (last + 0.02 * d[i]) / 1.02; d[i] = last * 3.5; }
    }
    const src = c.createBufferSource();
    src.buffer = buf; src.loop = true;
    return src;
  }

  function bq(type, freq, q) {
    const f = getCtx().createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    return f;
  }

  function gain(v) {
    const g = getCtx().createGain(); g.gain.value = v; return g;
  }

  function lfo(rate, depth) {
    const c = getCtx();
    const osc = c.createOscillator(), g = c.createGain();
    osc.frequency.value = rate; g.gain.value = depth;
    osc.connect(g); osc.start();
    return { osc, g };
  }

  const sounds = {
    rain() {
      const c = getCtx();
      const src = noise('white'), lp = bq('lowpass',1800), hp = bq('highpass',300), g = gain(0.55);
      const {osc: lo, g: lg} = lfo(0.12, 0.08);
      lg.connect(g.gain);
      src.connect(lp).connect(hp).connect(g).connect(master);
      src.start();
      return [src, lp, hp, g, lo, lg];
    },
    forest() {
      const c = getCtx();
      const src = noise('white'), bp = bq('bandpass',1000,1), lp = bq('lowpass',2500), g = gain(0.28);
      const {osc: lo, g: lg} = lfo(0.05, 0.06);
      lg.connect(g.gain);
      src.connect(bp).connect(lp).connect(g).connect(master);
      src.start();
      return [src, bp, lp, g, lo, lg];
    },
    water() {
      const c = getCtx();
      const s1 = noise('white'), s2 = noise('white');
      const bp1 = bq('bandpass',900,2), bp2 = bq('bandpass',1700,1.5);
      const g1 = gain(0.35), g2 = gain(0.22);
      const {osc: lo, g: lg} = lfo(0.25, 0.1);
      lg.connect(g1.gain);
      s1.connect(bp1).connect(g1).connect(master);
      s2.connect(bp2).connect(g2).connect(master);
      s1.start(); s2.start();
      return [s1, s2, bp1, bp2, g1, g2, lo, lg];
    },
    ocean() {
      const c = getCtx();
      const src = noise('brown'), lp = bq('lowpass',350), g = gain(0.75);
      const {osc: lo, g: lg} = lfo(0.05, 0.28);
      lg.connect(g.gain);
      src.connect(lp).connect(g).connect(master);
      src.start();
      return [src, lp, g, lo, lg];
    },
    wind() {
      const c = getCtx();
      const src = noise('white'), hp = bq('highpass',500), lp = bq('lowpass',2800), g = gain(0.30);
      const {osc: lo, g: lg} = lfo(0.07, 0.12);
      lg.connect(g.gain);
      src.connect(hp).connect(lp).connect(g).connect(master);
      src.start();
      return [src, hp, lp, g, lo, lg];
    },
    tone() {
      const c = getCtx();
      const freqs = [220, 330, 440, 275];
      const gains = [0.12, 0.07, 0.05, 0.06];
      return freqs.flatMap((f, i) => {
        const osc = c.createOscillator(), g = gain(gains[i]);
        osc.type = 'sine'; osc.frequency.value = f;
        osc.connect(g).connect(master); osc.start();
        return [osc, g];
      });
    },
    silence() { stopAll(); return []; }
  };

  function stopAll() {
    nodes.forEach(n => { try { n.stop && n.stop(); } catch(e) {} try { n.disconnect(); } catch(e) {} });
    nodes = []; current = null; playing = false;
    updateBar();
  }

  function play(name) {
    stopAll();
    if (!sounds[name] || name === 'silence') { updateBar(); return; }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    nodes = sounds[name]();
    current = name; playing = true;
    updateBar();
  }

  function pauseAudio() { if (ctx) ctx.suspend(); playing = false; updateBar(); }
  function resumeAudio() { if (ctx) ctx.resume(); playing = true; updateBar(); }
  function setVol(v) { vol = v; if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.1); }
  function duck(on) {
    if (!master || !ctx) return;
    master.gain.setTargetAtTime(on ? vol * 0.22 : vol, ctx.currentTime, 0.3);
  }

  const LABELS = { rain:'Gentle Rain', forest:'Forest', water:'Flowing Water', ocean:'Ocean Waves', wind:'Soft Wind', tone:'Soft Tone' };

  function updateBar() {
    const bar = $('audioBar'), name = $('abName'), pp = $('abPlayPause');
    if (!bar) return;
    if (current && current !== 'silence') {
      bar.hidden = false;
      name.textContent = LABELS[current] || current;
      pp.textContent = playing ? '⏸' : '▶';
      pp.setAttribute('aria-label', playing ? 'Pause sound' : 'Resume sound');
    } else {
      bar.hidden = true;
    }
    // Sync chips
    $$('[data-sound]').forEach(c => c.classList.toggle('active', c.dataset.sound === current));
  }

  return { play, stopAll, pauseAudio, resumeAudio, setVol, duck,
    get isPlaying() { return playing; }, get current() { return current; } };
})();

/* ══════════════════════════════
   5. VOICE GUIDANCE
   ══════════════════════════════ */
const VoiceGuide = (() => {
  let mode = 'none';
  const synth = window.speechSynthesis;
  const ok = 'speechSynthesis' in window;

  function speak(text) {
    if (!ok || mode === 'none') return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.82; u.pitch = 0.92; u.volume = 1;
    u.onstart = () => AudioManager.duck(true);
    u.onend = u.onerror = () => AudioManager.duck(false);
    synth.speak(u);
  }

  function cancel() { if (ok) synth.cancel(); AudioManager.duck(false); }

  function setMode(m) {
    mode = m;
    if (m === 'voice-sounds' && !AudioManager.isPlaying) AudioManager.play('rain');
  }

  return { speak, cancel, setMode, get mode() { return mode; }, get available() { return ok; } };
})();

/* ══════════════════════════════
   6. STORAGE
   ══════════════════════════════ */
const Store = {
  get(k, fb = null) { try { return JSON.parse(localStorage.getItem(`pg_${k}`)) ?? fb; } catch { return fb; } },
  set(k, v)         { try { localStorage.setItem(`pg_${k}`, JSON.stringify(v)); } catch {} },
  push(k, item, max=50) { const a = this.get(k,[]); a.unshift(item); this.set(k, a.slice(0,max)); },
  remove(k, pred)    { this.set(k, this.get(k,[]).filter((x,i)=>!pred(x,i))); },
  clear()            { ['sessions','notes','reflections','user','checkin'].forEach(k => localStorage.removeItem(`pg_${k}`)); }
};

/* ══════════════════════════════
   7. AUTH
   ══════════════════════════════ */
const Auth = {
  getUser() { return Store.get('user', null); },
  signUp(name, email) {
    if (!name.trim()) return { error:'Please enter your name.' };
    const u = { name: name.trim(), email: (email||'').trim(), at: new Date().toISOString() };
    Store.set('user', u); return { user: u };
  },
  signIn(name) {
    if (!name.trim()) return { error:'Please enter your name.' };
    const existing = Store.get('user', null);
    if (!existing) {
      // Auto-create profile
      return this.signUp(name, '');
    }
    return { user: existing };
  },
  signOut() { Store.set('user', null); updateNavAuth(); }
};

function updateNavAuth() {
  const user = Auth.getUser();
  const btn = $('authBtn');
  if (!btn) return;
  if (user) {
    btn.textContent = user.name.split(' ')[0];
    btn.onclick = () => {
      if (confirm(`Sign out, ${user.name}?`)) { Auth.signOut(); }
    };
  } else {
    btn.textContent = 'Sign in';
    btn.onclick = () => Router.show('auth');
  }
}

/* ══════════════════════════════
   8. PROGRESS
   ══════════════════════════════ */
const Progress = {
  record(activity, dur) {
    Store.push('sessions', { activity, dur, at: new Date().toISOString() });
  }
};

/* ══════════════════════════════
   9. DAILY CHECK-IN
   ══════════════════════════════ */
const SUGGESTIONS = {
  calm:       { text: 'You seem at ease. Any activity will feel good right now.', act: null },
  okay:       { text: 'A gentle pause could round out your day nicely.', act: 'breathing' },
  tired:      { text: 'A screen break or gentle stretch might help restore some energy.', act: 'screen' },
  stressed:   { text: 'The Breathing Garden or Grounding exercise could help soften that feeling.', act: 'breathing' },
  overwhelmed:{ text: 'Start small — three minutes of breathing can create a little space.', act: 'breathing' },
  unsure:     { text: 'Quiet reflection might help you understand what you need right now.', act: 'reflection' }
};
const ACT_LABELS = {
  breathing:'Breathing Garden', meditation:'Meditation', yoga:'Yoga & Stretching',
  grounding:'Grounding Garden', relaxation:'Body Relaxation',
  screen:'Screen Break', reflection:'Quiet Reflection', gratitude:'Gratitude Garden'
};

function initCheckin() {
  const todayKey = new Date().toDateString();
  const prev = Store.get('checkin', null);
  if (prev && prev.date === todayKey) {
    $('checkinSection').style.display = 'none';
    return;
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
  $('skipCheckin').addEventListener('click', () => {
    $('checkinSection').style.display = 'none';
  });
}

function showMoodSuggestion(mood) {
  const s = SUGGESTIONS[mood];
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
   10. ACTIVITY OPENER
   ══════════════════════════════ */
function openActivity(key) {
  SessionEngine.stop();
  VoiceGuide.cancel();
  // Reset activity UIs
  resetActivity(key);
  Router.show(key);
}

const ACTIVITY_COLORS = {
  breathing:'#6DCFC0', meditation:'#B8A2E0', yoga:'#B4CA50',
  grounding:'#8ED4B0', relaxation:'#E0937A', screen:'#90BFCE',
  reflection:'#C0B0DC', gratitude:'#D9AC60'
};

function resetActivity(key) {
  // Each activity has its own reset; called in individual inits
  const map = {
    breathing: () => BreathingActivity.reset(),
    meditation: () => MeditationActivity.reset(),
    yoga: () => YogaActivity.reset(),
    grounding: () => GroundingActivity.reset(),
    relaxation: () => RelaxationActivity.reset(),
    screen: () => ScreenActivity.reset(),
    reflection: () => ReflectionActivity.reset(),
    gratitude: () => GratitudeActivity.reset()
  };
  map[key] && map[key]();
}

/* ══════════════════════════════════════════════════════════
   11. BREATHING ACTIVITY
   ══════════════════════════════════════════════════════════ */
const BreathingActivity = (() => {
  let dur = 180, phase = 'idle', lastPhase = null;
  const INHALE = 4000, EXHALE = 4000, REST = 2000, CYCLE = 10000;

  function getPhaseFor(elapsedMs) {
    const pos = elapsedMs % CYCLE;
    if (pos < INHALE)              return { name:'inhale', dur: INHALE };
    if (pos < INHALE + EXHALE)     return { name:'exhale', dur: EXHALE };
    return { name:'rest', dur: REST };
  }

  const TRANS = { inhale:'4s', exhale:'4s', rest:'2s' };
  const LABELS = { inhale:'Breathe in', exhale:'Breathe out', rest:'Rest' };
  const VOICE  = { inhale:'Breathe in slowly.', exhale:'Breathe out gently.', rest:null };

  function applyPhase(p) {
    if (p === phase) return;
    phase = p;
    const orb = $('breathOrb');
    orb.style.transitionDuration = TRANS[p];
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
    $('breathOrb').classList.remove('phase-inhale','phase-exhale','phase-rest','paused');
    $('breathPhase').textContent = 'Begin';
    SessionEngine.start(dur, {
      onTick(el, rem, prog) {
        $('breathTimer').textContent = fmt(rem);
        $('breathProg').style.width  = (prog*100)+'%';
        applyPhase(getPhaseFor(el*1000).name);
      },
      onComplete: showCompletion,
      onPause() { $('breathOrb').classList.add('paused'); VoiceGuide.cancel(); setRunning(false); },
      onResume() { $('breathOrb').classList.remove('paused'); setRunning(true); }
    });
    setRunning(true);
    $('breathHint').textContent = 'Follow the orb. Inhale as it grows, exhale as it softens.';
  }

  function init() {
    // Duration buttons
    $$('#view-breathing .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-breathing .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      $('breathTimer').textContent = fmt(dur);
      $('breathProg').style.width = '0%';
      reset();
    }));

    // Start / Pause / Resume
    $('breathStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); }
      else if (SessionEngine.isPaused) { SessionEngine.resume(); setRunning(true); }
      else { start(); }
    });

    // Restart
    $('breathRestart').addEventListener('click', () => { reset(); });

    // Settings toggle
    $('breathSettingsBtn').addEventListener('click', () => {
      const p = $('voicePanel'); p.hidden = !p.hidden;
      $('breathVoiceBtn').setAttribute('aria-expanded', String(!p.hidden));
    });
    $('breathVoiceBtn').addEventListener('click', () => {
      const p = $('voicePanel'); p.hidden = !p.hidden;
      $('breathVoiceBtn').setAttribute('aria-expanded', String(!p.hidden));
    });

    // Voice mode
    $$('.vp-btn').forEach(btn => btn.addEventListener('click', () => {
      $$('.vp-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      VoiceGuide.setMode(btn.dataset.vmode);
      if (!VoiceGuide.available && btn.dataset.vmode !== 'none') {
        $('vpNote').textContent = 'Voice not supported in this browser. Animation-only mode will be used.';
      } else {
        $('vpNote').textContent = 'Using browser text-to-speech. Voice is off by default.';
      }
    }));

    // Completion actions
    $('breathAgain').addEventListener('click', () => { reset(); });
    $('breathOther').addEventListener('click', () => { Router.show('home'); setTimeout(()=>$('activities').scrollIntoView({behavior:'smooth'}), 100); });
  }

  function reset() {
    SessionEngine.stop(); VoiceGuide.cancel();
    phase = 'idle'; lastPhase = null;
    const orb = $('breathOrb');
    orb.classList.remove('phase-inhale','phase-exhale','phase-rest','paused');
    $('breathPhase').textContent = 'Ready';
    $('breathStart').textContent = 'Start';
    $('breathTimer').textContent = fmt(dur);
    $('breathProg').style.width = '0%';
    $('breathComplete').hidden = true;
    $('breathHint').textContent = 'Choose a duration and press Start';
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   12. MEDITATION ACTIVITY
   ══════════════════════════════════════════════════════════ */
const MeditationActivity = (() => {
  let dur = 180;
  const PROMPTS_3 = [
    'Settle in. There\'s nowhere else you need to be right now.',
    'Notice the weight of your body. Let yourself be held.',
    'Follow the rhythm of your breath — in, and out.',
    'If thoughts arise, let them drift like clouds. No need to follow.',
    'Return to this breath. Right here. Right now.',
    'You are here. That is enough.'
  ];

  function getPrompts(d) {
    if (d <= 180) return PROMPTS_3.slice(0,4);
    if (d <= 240) return PROMPTS_3.slice(0,5);
    return PROMPTS_3;
  }

  function start() {
    $('medComplete').hidden = true;
    const prompts = getPrompts(dur);
    const interval = (dur / prompts.length) * 1000;
    let promptIdx = 0;
    $('medPrompt').textContent = prompts[0];
    $('medInstruct').textContent = '';

    SessionEngine.start(dur, {
      onTick(el, rem, prog) {
        $('medTimer').textContent = fmt(rem);
        $('medProg').style.width = (prog*100)+'%';
        const idx = Math.min(prompts.length-1, Math.floor((el*1000) / interval));
        if (idx !== promptIdx) {
          promptIdx = idx;
          $('medPrompt').style.opacity = '0';
          setTimeout(() => {
            $('medPrompt').textContent = prompts[idx];
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
      $('medTimer').textContent = fmt(dur);
      $('medProg').style.width = '0%';
      reset();
    }));

    $('medStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); $('medStart').textContent = 'Resume'; }
      else if (SessionEngine.isPaused) { SessionEngine.resume(); $('medStart').textContent = 'Pause'; }
      else start();
    });

    $('medRestart').addEventListener('click', reset);

    $('medSoundBtn').addEventListener('click', () => {
      if (AudioManager.isPlaying) { AudioManager.stopAll(); $('medSoundBtn').setAttribute('aria-pressed','false'); }
      else { AudioManager.play('tone'); $('medSoundBtn').setAttribute('aria-pressed','true'); }
    });

    $('medOther').addEventListener('click', () => { Router.show('home'); });
  }

  function reset() {
    SessionEngine.stop();
    $('medStart').textContent = 'Start';
    $('medTimer').textContent = fmt(dur);
    $('medProg').style.width = '0%';
    $('medComplete').hidden = true;
    $('medInstruct').textContent = 'Choose a duration to begin';
    $('medPrompt').textContent = 'Settle in. There\'s nowhere else you need to be right now.';
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   13. YOGA ACTIVITY
   ══════════════════════════════════════════════════════════ */
const YogaActivity = (() => {
  let dur = 180, poseIdx = 0, poseDur = 0;

  const POSES = [
    {
      name: 'Neck Tilt',
      instruct: 'Gently let your right ear drift toward your right shoulder. Hold for a breath, then slowly come back to centre and try the other side. Keep your shoulders relaxed.',
      transforms: { head:'rotate(18deg)', body:'', arml:'rotate(12deg)', armr:'rotate(-12deg)', legl:'', legr:'' }
    },
    {
      name: 'Shoulder Rolls',
      instruct: 'Roll both shoulders backward in slow, generous circles — up, back, and down. Feel the tension gradually release with each rotation.',
      transforms: { head:'', body:'', arml:'rotate(-50deg) translateY(-8px)', armr:'rotate(50deg) translateY(-8px)', legl:'', legr:'' }
    },
    {
      name: 'Seated Spinal Twist',
      instruct: 'Place your left hand on your right knee and gently turn your upper body to the right. Look over your right shoulder softly. Hold for a few breaths, then switch sides.',
      transforms: { head:'rotate(-15deg)', body:'rotate(-18deg)', arml:'rotate(-80deg)', armr:'rotate(30deg)', legl:'rotate(5deg)', legr:'rotate(-5deg)' }
    },
    {
      name: 'Side Stretch',
      instruct: 'Raise your right arm up and gently lean toward the left. Feel the stretch along your right side. Keep breathing, then slowly come upright and repeat on the other side.',
      transforms: { head:'rotate(12deg)', body:'rotate(14deg)', arml:'rotate(10deg)', armr:'rotate(-100deg)', legl:'', legr:'' }
    },
    {
      name: 'Wrist & Hand Stretch',
      instruct: 'Extend both arms in front of you, palms facing up. Gently flex and point the wrists several times. Then open and close your hands to release tension from typing or writing.',
      transforms: { head:'', body:'', arml:'rotate(35deg) translateY(12px)', armr:'rotate(-35deg) translateY(12px)', legl:'', legr:'' }
    },
    {
      name: 'Forward Fold',
      instruct: 'Soften your knees and let your upper body slowly release forward. Let your head, neck, and shoulders hang heavy. You can sway gently side to side. Stay here for a few slow breaths.',
      transforms: { head:'translateY(30px) rotate(30deg)', body:'rotate(-55deg)', arml:'rotate(15deg) translateY(20px)', armr:'rotate(-15deg) translateY(20px)', legl:'rotate(-8deg)', legr:'rotate(8deg)' }
    }
  ];

  function applyPose(idx) {
    const p = POSES[idx];
    const parts = { head:'yf-head-g', body:'yf-body-g', arml:'yf-arml-g', armr:'yf-armr-g', legl:'yf-legl-g', legr:'yf-legr-g' };
    Object.entries(parts).forEach(([k, id]) => {
      const el = $(id); if (el) el.style.transform = p.transforms[k] || '';
    });
    $('yogaPoseName').textContent = p.name;
    $('yogaPoseInstruct').textContent = p.instruct;
    // Update dot track
    $$('.yoga-pose-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
      dot.classList.toggle('done',   i < idx);
    });
  }

  function buildTrack() {
    const track = $('yogaPoseTrack');
    track.innerHTML = '';
    POSES.forEach((p, i) => {
      const dot = document.createElement('div');
      dot.className = 'yoga-pose-dot';
      dot.title = p.name;
      track.appendChild(dot);
    });
  }

  function start() {
    $('yogaComplete').hidden = true;
    poseIdx = 0;
    poseDur = dur / POSES.length;
    applyPose(0);
    $('yogaPoseRemain').textContent = `${Math.round(poseDur)}s per pose`;

    SessionEngine.start(dur, {
      onTick(el, rem, prog) {
        $('yogaTimer').textContent = fmt(rem);
        $('yogaProg').style.width  = (prog*100)+'%';

        const newIdx = Math.min(POSES.length-1, Math.floor(el / poseDur));
        const poseElapsed = el - newIdx * poseDur;
        const poseProg = Math.min(1, poseElapsed / poseDur);
        $('yogaPoseFill').style.width = (poseProg*100)+'%';
        $('yogaPoseRemain').textContent = `${Math.ceil(poseDur - poseElapsed)}s remaining`;

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

    $$('#view-yoga .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-yoga .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      $('yogaTimer').textContent = fmt(dur);
      $('yogaProg').style.width = '0%';
      reset();
    }));

    $('yogaStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); }
      else if (SessionEngine.isPaused) { SessionEngine.resume(); $('yogaStart').textContent = 'Pause'; }
      else start();
    });

    $('yogaPrev').addEventListener('click', () => {
      poseIdx = Math.max(0, poseIdx - 1); applyPose(poseIdx);
    });
    $('yogaNext').addEventListener('click', () => {
      poseIdx = Math.min(POSES.length-1, poseIdx + 1); applyPose(poseIdx);
    });

    $('yogaOther').addEventListener('click', () => { Router.show('home'); });
  }

  function reset() {
    SessionEngine.stop();
    poseIdx = 0;
    applyPose(0);
    $('yogaStart').textContent = 'Start';
    $('yogaTimer').textContent = fmt(dur);
    $('yogaProg').style.width = '0%';
    $('yogaPoseFill').style.width = '0%';
    $('yogaPoseRemain').textContent = '';
    $('yogaComplete').hidden = true;
    // Reset all part transforms
    ['yf-head-g','yf-body-g','yf-arml-g','yf-armr-g','yf-legl-g','yf-legr-g']
      .forEach(id => { const el=$(id); if(el) el.style.transform=''; });
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   14. GROUNDING ACTIVITY
   ══════════════════════════════════════════════════════════ */
const GroundingActivity = (() => {
  let dur = 180, currentStep = -1;

  function unlockStep(idx) {
    const step = $(`gs${idx}`);
    if (!step) return;
    step.classList.remove('gs-locked');
    step.classList.add('gs-active');
    const header = step.querySelector('.gs-header');
    const body   = step.querySelector('.gs-body');
    const numEl  = step.querySelector('.gs-number');
    const titleEl= step.querySelector('.gs-title');
    if (numEl)   numEl.classList.remove('gs-num-muted');
    if (titleEl) titleEl.classList.remove('gs-title-muted');
    if (body)    body.hidden = false;
    currentStep = idx;
    // Focus first interactive element
    const ta = body && body.querySelector('textarea');
    if (ta) setTimeout(() => ta.focus(), 100);
  }

  function init() {
    // Initially unlock step 0
    unlockStep(0);

    $$('.gs-next').forEach(btn => btn.addEventListener('click', () => {
      const next = +btn.dataset.next;
      unlockStep(next);
    }));

    $$('.gs-finish').forEach(btn => btn.addEventListener('click', () => {
      $('groundComplete').hidden = false;
      $('groundCompDur').textContent = 'Session completed';
      Progress.record('grounding', dur);
    }));

    $$('#view-grounding .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-grounding .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      $('groundTimer').textContent = fmt(dur);
    }));

    $('groundStart').addEventListener('click', () => {
      if (SessionEngine.isRunning) { SessionEngine.pause(); $('groundStart').textContent = 'Resume'; return; }
      if (SessionEngine.isPaused)  { SessionEngine.resume(); $('groundStart').textContent = 'Pause'; return; }
      $('groundComplete').hidden = true;
      SessionEngine.start(dur, {
        onTick(el, rem, prog) {
          $('groundTimer').textContent = fmt(rem);
          $('groundProg').style.width = (prog*100)+'%';
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
    $('groundOther').addEventListener('click', () => Router.show('home'));
  }

  function reset() {
    SessionEngine.stop();
    $('groundStart').textContent = 'Start';
    $('groundTimer').textContent = fmt(dur);
    $('groundProg').style.width = '0%';
    $('groundComplete').hidden = true;
    // Reset steps
    currentStep = -1;
    [0,1,2].forEach(i => {
      const s = $(`gs${i}`);
      if (!s) return;
      s.classList.remove('gs-active');
      if (i > 0) s.classList.add('gs-locked');
      const body = s.querySelector('.gs-body');
      if (body) body.hidden = true;
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
   15. BODY RELAXATION ACTIVITY
   ══════════════════════════════════════════════════════════ */
const RelaxationActivity = (() => {
  let dur = 180, regionIdx = 0;
  const REGIONS = [
    { name:'Forehead & Jaw',  instruct:'Bring gentle attention to your forehead. Let it smooth and soften. Notice your jaw — let it hang slightly loose. Breathe slowly.' },
    { name:'Shoulders',       instruct:'Notice if your shoulders are creeping up toward your ears. On an exhale, let them drop and soften. Give them permission to release.' },
    { name:'Hands & Wrists',  instruct:'Open your hands wide, then let them relax. Notice any held tension in your fingers and palms. Let each breath out soften your hands a little more.' },
    { name:'Abdomen',         instruct:'Place a hand on your belly if you like. Notice the gentle rise and fall. Allow your abdomen to soften on each breath out.' },
    { name:'Legs',            instruct:'Notice your thighs and calves. Are they held tightly? With each breath out, let them become a little heavier, a little more relaxed.' },
    { name:'Feet',            instruct:'Feel where your feet rest on the floor. Notice the temperature, the texture. Wiggle your toes gently, then let them completely relax.' }
  ];

  function applyRegion(idx) {
    regionIdx = idx;
    const r = REGIONS[idx] || { name:'Complete', instruct:'You\'ve moved through your whole body. Take a moment to notice how you feel now.' };
    $('relaxRegion').textContent = r.name;
    $('relaxInstruct').textContent = r.instruct;
    $$('.rbm-region').forEach((el, i) => el.classList.toggle('rr-active', i === idx));
    $('skipRegion').hidden = false;
  }

  function init() {
    $$('#view-relaxation .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-relaxation .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      $('relaxTimer').textContent = fmt(dur);
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
          $('relaxTimer').textContent = fmt(rem);
          $('relaxProg').style.width  = (prog*100)+'%';
          const newRegion = Math.min(REGIONS.length-1, Math.floor(el / regionDur));
          const regionEl  = el - newRegion * regionDur;
          const regionProg = Math.min(1, regionEl / regionDur);
          $('relaxRegionFill').style.width = (regionProg*100)+'%';
          if (newRegion !== regionIdx) applyRegion(newRegion);
        },
        onComplete() {
          $('relaxComplete').hidden = false;
          $('relaxCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
          Progress.record('relaxation', dur);
          $('relaxStart').textContent = 'Done ✦';
          $('skipRegion').hidden = true;
        }
      });
      $('relaxStart').textContent = 'Pause';
    });

    $('skipRegion').addEventListener('click', () => {
      regionIdx = Math.min(REGIONS.length-1, regionIdx+1);
      applyRegion(regionIdx);
    });

    $('relaxRestart').addEventListener('click', reset);
    $('relaxOther').addEventListener('click', () => Router.show('home'));
  }

  function reset() {
    SessionEngine.stop();
    regionIdx = 0;
    applyRegion(0);
    $('relaxStart').textContent = 'Start';
    $('relaxTimer').textContent = fmt(dur);
    $('relaxProg').style.width = '0%';
    $('relaxRegionFill').style.width = '0%';
    $('relaxComplete').hidden = true;
    $('skipRegion').hidden = true;
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   16. SCREEN BREAK ACTIVITY
   ══════════════════════════════════════════════════════════ */
const ScreenActivity = (() => {
  let dur = 180, stepIdx = 0;
  const STEPS = [
    { title:'Look somewhere farther',    desc:'Find a point across the room or outside the window. Let your eyes rest there for a few slow breaths. You don\'t need to focus — just look away from the screen.' },
    { title:'Relax your jaw and shoulders', desc:'Notice if you\'re clenching your jaw or raising your shoulders. Let your jaw hang gently open. Allow your shoulders to drop on your next exhale.' },
    { title:'Gently move your wrists',   desc:'Extend your arms and slowly rotate your wrists in both directions. Open and close your hands a few times. Release any tension that has gathered there.' },
    { title:'Stand or shift position',   desc:'If you can, stand up and take a few steps, or simply shift to a more comfortable seated position. Noticing your body\'s signals is the first step to easing them.' },
    { title:'Take a few natural breaths', desc:'Place one hand on your chest or belly. Breathe naturally — not forced, not controlled. Just notice the rhythm that is already there, steady and quiet.' }
  ];

  function applyStep(idx) {
    stepIdx = idx;
    const s = STEPS[idx];
    $('screenStepCount').textContent = `Step ${idx+1} of ${STEPS.length}`;
    $('screenStepTitle').textContent = s.title;
    $('screenStepDesc').textContent  = s.desc;
    $$('.sdot').forEach((d,i) => d.classList.toggle('active', i === idx));
  }

  function init() {
    $$('#view-screen .dur-btn').forEach(btn => btn.addEventListener('click', () => {
      if (SessionEngine.isRunning) return;
      dur = +btn.dataset.dur;
      $$('#view-screen .dur-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      $('screenTimer').textContent = fmt(dur);
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
          $('screenTimer').textContent = fmt(rem);
          $('screenProg').style.width  = (prog*100)+'%';
          const newStep = Math.min(STEPS.length-1, Math.floor(el / stepDur));
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
    $('screenOther').addEventListener('click', () => Router.show('home'));
  }

  function reset() {
    SessionEngine.stop();
    stepIdx = 0;
    applyStep(0);
    $('screenStart').textContent = 'Start';
    $('screenTimer').textContent = fmt(dur);
    $('screenProg').style.width = '0%';
    $('screenComplete').hidden = true;
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   17. QUIET REFLECTION ACTIVITY
   ══════════════════════════════════════════════════════════ */
const ReflectionActivity = (() => {
  let dur = 180, promptIdx = 0, timerActive = false;
  const PROMPTS = [
    'What is taking up space in your mind right now?',
    'What is one thing you can let go of for today?',
    'What would make the next hour feel a little easier?',
    'What do you need more of today?',
    'What is something you\'ve been carrying that deserves to rest?',
    'What small thing went well today?'
  ];

  function loadSavedReflections() {
    const refls = Store.get('reflections', []);
    const wrap = $('savedReflWrap'), list = $('savedReflList');
    wrap.hidden = refls.length === 0;
    list.innerHTML = '';
    refls.slice(0,5).forEach((r, i) => {
      const div = document.createElement('div');
      div.className = 'refl-item';
      div.innerHTML = `<p class="refl-item-text">${escHtml(r.text)}</p>
        <p class="refl-item-date">${r.date}</p>
        <button class="refl-item-del" aria-label="Delete reflection" data-idx="${i}">✕</button>`;
      list.appendChild(div);
    });
    $$('.refl-item-del', list).forEach(btn => btn.addEventListener('click', () => {
      const idx = +btn.dataset.idx;
      Store.remove('reflections', (_, i) => i === idx);
      loadSavedReflections();
    }));
  }

  function init() {
    $('jcDate').textContent = today();
    loadSavedReflections();

    $('jcNewPrompt').addEventListener('click', () => {
      promptIdx = (promptIdx+1) % PROMPTS.length;
      $('jcPrompt').textContent = PROMPTS[promptIdx];
    });

    $('jcSave').addEventListener('click', () => {
      const text = $('jcText').value.trim();
      if (!text) return;
      Store.push('reflections', { text, date: today(), at: new Date().toISOString() });
      $('jcText').value = '';
      loadSavedReflections();
      $('reflComplete').hidden = false;
      $('reflCompDur').textContent = 'Reflection saved.';
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
          $('reflTimer').textContent = fmt(rem);
          $('reflProg').style.width  = (prog*100)+'%';
        },
        onComplete() {
          timerActive = false;
          $('reflComplete').hidden = false;
          $('reflCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
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
        $('jcText').value = ''; loadSavedReflections();
      }
      SessionEngine.stop(); timerActive = false;
      $('reflComplete').hidden = false;
      $('reflCompDur').textContent = 'You\'re welcome to come back any time.';
      Progress.record('reflection', dur);
    });

    $('reflRestart').addEventListener('click', reset);
    $('reflOther').addEventListener('click', () => Router.show('home'));
  }

  function reset() {
    SessionEngine.stop(); timerActive = false;
    $('reflStart').textContent = 'Optional timer';
    $('reflTimer').textContent = fmt(dur);
    $('reflProg').style.width = '0%';
    $('reflComplete').hidden = true;
    $('jcDate').textContent = today();
    loadSavedReflections();
  }

  return { init, reset };
})();

/* ══════════════════════════════════════════════════════════
   18. GRATITUDE ACTIVITY
   ══════════════════════════════════════════════════════════ */
const GratitudeActivity = (() => {
  let dur = 180, promptIdx = 0, timerActive = false;
  const PROMPTS = [
    'Something small that made me smile…',
    'Someone I appreciated today…',
    'Something about myself I\'m proud of…',
    'A little thing I don\'t want to take for granted…',
    'A moment of unexpected kindness…',
    'Something in nature that caught my eye…'
  ];

  function escHtml(t) { return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function renderNotes() {
    const notes = Store.get('notes', []);
    const gallery = $('notesGallery');
    $('notesEmpty').hidden = notes.length > 0;
    // Remove old note cards
    $$('.note-card', gallery).forEach(c => c.remove());
    notes.slice(0,12).forEach((n, i) => {
      const div = document.createElement('div');
      div.className = 'note-card';
      div.innerHTML = `<div>
        <p class="note-card-text">"${escHtml(n.text)}"</p>
        <p class="note-card-date">${n.date}</p>
      </div>
      <button class="note-card-del" aria-label="Delete note" data-idx="${i}">✕</button>`;
      gallery.appendChild(div);
    });
    $$('.note-card-del', gallery).forEach(btn => btn.addEventListener('click', () => {
      Store.remove('notes', (_, i) => i === +btn.dataset.idx);
      renderNotes();
    }));
  }

  function init() {
    renderNotes();
    $('ncChange').addEventListener('click', () => {
      promptIdx = (promptIdx+1) % PROMPTS.length;
      $('ncPrompt').textContent = PROMPTS[promptIdx];
    });

    $('ncSave').addEventListener('click', () => {
      const text = $('ncText').value.trim();
      if (!text) return;
      Store.push('notes', { text, date: today(), at: new Date().toISOString() });
      $('ncText').value = '';
      renderNotes();
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
          $('gratTimer').textContent = fmt(rem);
          $('gratProg').style.width  = (prog*100)+'%';
        },
        onComplete() {
          timerActive = false;
          $('gratComplete').hidden = false;
          $('gratCompDur').textContent = `${Math.round(dur/60)} minute session completed`;
          $('gratStart').textContent = 'Timer done';
          Progress.record('gratitude', dur);
        }
      });
      $('gratStart').textContent = 'Pause timer';
    });

    $('gratRestart').addEventListener('click', reset);
    $('gratOther').addEventListener('click', () => Router.show('home'));
  }

  function reset() {
    SessionEngine.stop(); timerActive = false;
    $('gratStart').textContent = 'Guided time';
    $('gratTimer').textContent = 'Optional';
    $('gratProg').style.width = '0%';
    $('gratComplete').hidden = true;
    renderNotes();
  }

  return { init, reset };
})();

/* helper shared */
function escHtml(t) {
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════════════════
   19. MY GARDEN / PROGRESS VIEW
   ══════════════════════════════════════════════════════════ */
function renderGardenView() {
  const sessions = Progress.getAll ? Progress.getAll() : Store.get('sessions', []);
  const notes    = Store.get('notes', []);
  const refls    = Store.get('reflections', []);

  // Stats
  const statsEl = $('gardenStats');
  const activityCount = new Set(sessions.map(s=>s.activity)).size;
  statsEl.innerHTML = `
    <div class="stat-card"><div class="stat-val">${sessions.length}</div><div class="stat-label">Sessions completed</div></div>
    <div class="stat-card"><div class="stat-val">${notes.length}</div><div class="stat-label">Gratitude notes</div></div>
    <div class="stat-card"><div class="stat-val">${activityCount}</div><div class="stat-label">Activities tried</div></div>
  `;

  // Sessions
  const dots = { breathing:'#6DCFC0', meditation:'#B8A2E0', yoga:'#B4CA50', grounding:'#8ED4B0', relaxation:'#E0937A', screen:'#90BFCE', reflection:'#C0B0DC', gratitude:'#D9AC60' };
  const sl = $('sessionsList');
  $('sessionsEmpty').hidden = sessions.length > 0;
  $$('.session-item', sl).forEach(i=>i.remove());
  sessions.slice(0,10).forEach(s => {
    const d = document.createElement('div'); d.className = 'session-item';
    const mins = s.dur ? Math.round(s.dur/60) : '?';
    const date = s.at ? new Date(s.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '';
    d.innerHTML = `<div class="si-dot" style="background:${dots[s.activity]||'#ccc'}"></div>
      <span class="si-name">${ACT_LABELS[s.activity]||s.activity}</span>
      <span class="si-meta">${mins} min · ${date}</span>`;
    sl.appendChild(d);
  });

  // Notes
  const gn = $('gardenNotes');
  $('gardenNotesEmpty').hidden = notes.length > 0;
  $$('.note-card', gn).forEach(c=>c.remove());
  notes.slice(0,6).forEach(n => {
    const d = document.createElement('div'); d.className = 'note-card';
    d.innerHTML = `<div><p class="note-card-text">"${escHtml(n.text)}"</p><p class="note-card-date">${n.date}</p></div>`;
    gn.appendChild(d);
  });

  // Reflections
  const gr = $('gardenRefls');
  $('gardenReflsEmpty').hidden = refls.length > 0;
  $$('.refl-item', gr).forEach(c=>c.remove());
  refls.slice(0,5).forEach(r => {
    const d = document.createElement('div'); d.className = 'refl-item';
    d.innerHTML = `<p class="refl-item-text">${escHtml(r.text)}</p><p class="refl-item-date">${r.date}</p>`;
    gr.appendChild(d);
  });
}

// Expose getAll on Progress
Progress.getAll = () => Store.get('sessions', []);

/* ══════════════════════════════════════════════════════════
   20. AUTH VIEW
   ══════════════════════════════════════════════════════════ */
function initAuthView() {
  $('siSubmit').addEventListener('click', () => {
    const name = $('siEmail').value.trim();
    const res = Auth.signIn(name);
    if (res.error) { $('authError').textContent = res.error; $('authError').hidden = false; }
    else { $('authError').hidden = true; updateNavAuth(); Router.show('home'); }
  });

  $('suSubmit').addEventListener('click', () => {
    const name = $('suName').value.trim();
    const email = $('suEmail').value.trim();
    const res = Auth.signUp(name, email);
    if (res.error) { $('authError').textContent = res.error; $('authError').hidden = false; }
    else { $('authError').hidden = true; updateNavAuth(); Router.show('home'); }
  });

  $('showSignup').addEventListener('click', () => { $('signinForm').hidden = true; $('signupForm').hidden = false; });
  $('showSignin').addEventListener('click', () => { $('signupForm').hidden = true; $('signinForm').hidden = false; });
}

/* ══════════════════════════════════════════════════════════
   21. AUDIO BAR CONTROLS
   ══════════════════════════════════════════════════════════ */
function initAudioBar() {
  $('abPlayPause').addEventListener('click', () => {
    if (AudioManager.isPlaying) AudioManager.pauseAudio();
    else AudioManager.resumeAudio();
  });
  $('abStop').addEventListener('click', () => AudioManager.stopAll());
  $('abVol').addEventListener('input', e => AudioManager.setVol(+e.target.value));

  // Sound chips (all views)
  $$('[data-sound]').forEach(chip => {
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
   22. KEYBOARD & BACK NAVIGATION
   ══════════════════════════════════════════════════════════ */
function initNavigation() {
  // Back buttons
  $$('[data-back]').forEach(btn => btn.addEventListener('click', () => Router.back()));

  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (Router.current !== 'home') Router.back(); }
  });

  // Card clicks (home grid)
  $$('.activity-card').forEach(card => {
    card.addEventListener('click', () => openActivity(card.dataset.activity));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openActivity(card.dataset.activity); }
    });
  });

  // Hero orb → breathing
  $('heroOrb').addEventListener('click', () => openActivity('breathing'));

  // Nav buttons
  $('notesBtn').addEventListener('click', () => { renderGardenView(); Router.show('garden'); });
  $('homeLink').addEventListener('click', e => { e.preventDefault(); Router.back(); });
  $('clearDataBtn').addEventListener('click', () => {
    if (confirm('Clear all your local data? This cannot be undone.')) {
      Store.clear(); renderGardenView();
    }
  });

  // "Try another" actions all go back to home activities section
  $$('[id$="Other"]').forEach(btn => btn.addEventListener('click', () => {
    Router.show('home');
    setTimeout(() => $('activities').scrollIntoView({ behavior:'smooth' }), 120);
  }));
}

/* ══════════════════════════════════════════════════════════
   23. INIT
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Show home
  Router.show('home');

  // Init all activities
  BreathingActivity.init();
  MeditationActivity.init();
  YogaActivity.init();
  GroundingActivity.init();
  RelaxationActivity.init();
  ScreenActivity.init();
  ReflectionActivity.init();
  GratitudeActivity.init();

  // Auth
  initAuthView();
  updateNavAuth();

  // Audio bar
  initAudioBar();

  // Navigation
  initNavigation();

  // Check-in
  initCheckin();

  // Greeting from stored user
  const user = Auth.getUser();
  if (user) {
    const greet = document.createElement('p');
    greet.style.cssText = 'position:absolute;bottom:32px;left:0;right:0;text-align:center;font-size:13px;color:rgba(26,46,36,.55);font-weight:700;pointer-events:none';
    greet.textContent = `Welcome back, ${user.name} ✦`;
    document.querySelector('.hero')?.appendChild(greet);
  }

  // Privacy note
  const privacyBtn = $('privacyBtn');
  if (privacyBtn) privacyBtn.addEventListener('click', () => {
    alert('Pause Garden stores all your data — notes, reflections, check-ins, and session history — locally in your browser\'s localStorage. Nothing is sent to any server. Data is private to this browser and device.');
  });

  // Help FAB
  $('helpFab').addEventListener('click', () => {
    alert('Keyboard shortcuts:\n• Escape — exit current activity\n• Enter/Space on cards — open activity\n\nAll data is stored locally on this device only.\nSounds are synthesised via Web Audio API.\nVoice guidance uses browser text-to-speech.');
  });

  // Handle visibility change (pause timer when tab hidden)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && SessionEngine.isRunning) {
      SessionEngine.pause();
      // Activity-specific UI updates
      const cur = Router.current;
      const pauseMap = {
        breathing: () => { $('breathStart').textContent = 'Resume'; },
        meditation: () => { $('medStart').textContent = 'Resume'; },
        yoga: () => { $('yogaStart').textContent = 'Resume'; },
        grounding: () => { $('groundStart').textContent = 'Resume'; },
        relaxation: () => { $('relaxStart').textContent = 'Resume'; },
        screen: () => { $('screenStart').textContent = 'Resume'; }
      };
      pauseMap[cur] && pauseMap[cur]();
    }
  });

  console.log('🌿 Pause Garden ready.');
});
