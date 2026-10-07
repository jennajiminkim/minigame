(() => {
  'use strict';

  const TOTAL_DURATION = 30;
  const CURTAIN_DURATION = 2.4;
  const PLAY_DURATION = TOTAL_DURATION - CURTAIN_DURATION;
  const PERFECT_WINDOW = 0.12;
  const GOOD_WINDOW = 0.25;
  const NOTE_SPEED = 330;
  const STORAGE_KEY = 'recorderKingQueenSaveV1';

  const KEY_MAP = {
    A: { name: '도', freq: 261.63, lane: 0 },
    S: { name: '레', freq: 293.66, lane: 1 },
    D: { name: '미', freq: 329.63, lane: 2 },
    F: { name: '파', freq: 349.23, lane: 3 },
    G: { name: '솔', freq: 392.00, lane: 4 },
    H: { name: '라', freq: 440.00, lane: 5 },
    J: { name: '시', freq: 493.88, lane: 6 },
    K: { name: '높은 도', freq: 523.25, lane: 7 }
  };

  // Mozart 〈Queen of the Night Aria〉의 유명한 고음 파트를 8키 도레미 안에서 단순화한 게임용 멜로디입니다.
  // A/S는 거의 쓰지 않고, D/F/G/H/J/K 중심으로 고음 리코더 느낌을 냅니다.
  const QUEEN_THEME = [
    'K', 'J', 'K', 'J', 'K', 'H', 'J', 'K',
    'K', 'J', 'H', 'G', 'H', 'J', 'K', 'J',
    'K', 'K', 'J', 'K', 'H', 'J', 'K', 'J',
    'H', 'G', 'F', 'G', 'H', 'J', 'K', 'K',
    'J', 'H', 'G', 'F', 'D', 'F', 'G', 'H',
    'J', 'K', 'J', 'K', 'K', 'J', 'H', 'K'
  ];

  const elements = {
    titleScreen: document.getElementById('titleScreen'),
    gameScreen: document.getElementById('gameScreen'),
    resultScreen: document.getElementById('resultScreen'),
    startBtn: document.getElementById('startBtn'),
    retryBtn: document.getElementById('retryBtn'),
    backBtn: document.getElementById('backBtn'),
    difficultyButtons: [...document.querySelectorAll('.difficulty-btn')],
    curtainOverlay: document.getElementById('curtainOverlay'),
    readyText: document.querySelector('.ready-text'),
    notesLayer: document.getElementById('notesLayer'),
    musicLane: document.getElementById('musicLane'),
    performer: document.getElementById('performer'),
    judgeText: document.getElementById('judgeText'),
    warningText: document.getElementById('warningText'),
    stateText: document.getElementById('stateText'),
    timeText: document.getElementById('timeText'),
    scoreText: document.getElementById('scoreText'),
    comboText: document.getElementById('comboText'),
    difficultyText: document.getElementById('difficultyText'),
    pauseBtn: document.getElementById('pauseBtn'),
    muteBtn: document.getElementById('muteBtn'),
    motionBtn: document.getElementById('motionBtn'),
    keyGuide: document.getElementById('liveKeyGuide'),
    resultTitle: document.getElementById('resultTitle'),
    resultRank: document.getElementById('resultRank'),
    finalScore: document.getElementById('finalScore'),
    finalAccuracy: document.getElementById('finalAccuracy'),
    finalCombo: document.getElementById('finalCombo'),
    finalMiss: document.getElementById('finalMiss'),
    finalSqueak: document.getElementById('finalSqueak'),
    highScoreText: document.getElementById('highScoreText')
  };

  const game = {
    state: 'TITLE',
    difficulty: 'easy',
    notes: [],
    score: 0,
    combo: 0,
    maxCombo: 0,
    hitCount: 0,
    missCount: 0,
    squeakCount: 0,
    inputCount: 0,
    consecutiveMisses: 0,
    startTime: 0,
    pausedAt: 0,
    animationId: null,
    audioContext: null,
    muted: false,
    reducedMotion: false,
    highScore: 0
  };

  const save = loadSave();
  game.highScore = save.highScore;
  game.muted = save.muted;
  game.reducedMotion = save.reducedMotion;
  game.difficulty = save.lastDifficulty;
  document.body.classList.toggle('reduced-motion', game.reducedMotion);
  updateOptionButtons();
  selectDifficulty(game.difficulty);

  elements.startBtn.addEventListener('click', startGame);
  elements.retryBtn.addEventListener('click', startGame);
  elements.backBtn.addEventListener('click', goTitle);
  elements.pauseBtn.addEventListener('click', togglePause);
  elements.muteBtn.addEventListener('click', () => {
    game.muted = !game.muted;
    persistSave();
    updateOptionButtons();
  });
  elements.motionBtn.addEventListener('click', () => {
    game.reducedMotion = !game.reducedMotion;
    document.body.classList.toggle('reduced-motion', game.reducedMotion);
    persistSave();
    updateOptionButtons();
  });
  elements.difficultyButtons.forEach((button) => {
    button.addEventListener('click', () => selectDifficulty(button.dataset.difficulty));
  });

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('blur', () => {
    if (game.state === 'PLAYING' || game.state === 'CURTAIN') pauseGame('PAUSED');
  });

  function loadSave() {
    const fallback = { highScore: 0, lastDifficulty: 'easy', muted: false, reducedMotion: false };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      const validDifficulty = ['easy', 'normal', 'hard'].includes(parsed.lastDifficulty);
      return {
        highScore: Number.isFinite(parsed.highScore) ? Math.max(0, parsed.highScore) : 0,
        lastDifficulty: validDifficulty ? parsed.lastDifficulty : 'easy',
        muted: Boolean(parsed.muted),
        reducedMotion: Boolean(parsed.reducedMotion)
      };
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      return fallback;
    }
  }

  function persistSave() {
    const data = {
      highScore: game.highScore,
      lastDifficulty: game.difficulty,
      muted: game.muted,
      reducedMotion: game.reducedMotion
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function selectDifficulty(difficulty) {
    game.difficulty = difficulty;
    elements.difficultyButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.difficulty === difficulty);
    });
    elements.difficultyText.textContent = difficulty.toUpperCase();
    persistSave();
  }

  function updateOptionButtons() {
    elements.muteBtn.textContent = game.muted ? 'MUTE ON' : 'MUTE OFF';
    elements.motionBtn.textContent = game.reducedMotion ? 'MOTION OFF' : 'MOTION ON';
  }

  function showScreen(screenName) {
    [elements.titleScreen, elements.gameScreen, elements.resultScreen].forEach((screen) => {
      screen.classList.remove('active');
    });
    if (screenName === 'TITLE') elements.titleScreen.classList.add('active');
    if (screenName === 'GAME') elements.gameScreen.classList.add('active');
    if (screenName === 'RESULT') elements.resultScreen.classList.add('active');
  }

  function startGame() {
    ensureAudio();
    resetGame();
    showScreen('GAME');
    setState('CURTAIN');
    elements.curtainOverlay.classList.add('active');
    elements.curtainOverlay.classList.remove('open');
    elements.readyText.textContent = 'READY?';
    requestAnimationFrame(() => elements.curtainOverlay.classList.add('open'));
    game.startTime = performance.now();
    game.animationId = requestAnimationFrame(loop);
  }

  function resetGame() {
    cancelAnimationFrame(game.animationId);
    game.notes = buildChart(game.difficulty);
    game.score = 0;
    game.combo = 0;
    game.maxCombo = 0;
    game.hitCount = 0;
    game.missCount = 0;
    game.squeakCount = 0;
    game.inputCount = 0;
    game.consecutiveMisses = 0;
    game.pausedAt = 0;
    elements.notesLayer.innerHTML = '';
    elements.warningText.textContent = '';
    elements.warningText.classList.remove('show');
    elements.judgeText.textContent = 'READY';
    elements.performer.classList.remove('hit', 'miss', 'danger');
    createNoteElements();
    updateHud(0);
  }

  function setState(state) {
    game.state = state;
    elements.stateText.textContent = state;
    elements.pauseBtn.textContent = state === 'PAUSED' ? 'RESUME' : 'PAUSE';
  }

  function getElapsed() {
    return Math.min((performance.now() - game.startTime) / 1000, TOTAL_DURATION);
  }

  function getSongTime(elapsed) {
    return Math.max(0, elapsed - CURTAIN_DURATION);
  }

  function loop() {
    const elapsed = getElapsed();

    if (game.state === 'CURTAIN') {
      const remainingReady = Math.max(0, CURTAIN_DURATION - elapsed);
      if (remainingReady > 1.4) elements.readyText.textContent = 'READY?';
      else if (remainingReady > 0.75) elements.readyText.textContent = '3';
      else if (remainingReady > 0.35) elements.readyText.textContent = '2';
      else elements.readyText.textContent = '1';

      if (elapsed >= CURTAIN_DURATION) {
        elements.curtainOverlay.classList.remove('active');
        showJudge('GO!', 'good');
        setState('PLAYING');
      }
    }

    if (game.state === 'PLAYING') {
      const songTime = getSongTime(elapsed);
      updateNotes(songTime);
      autoMissPassedNotes(songTime);
    }

    updateHud(elapsed);

    if (elapsed >= TOTAL_DURATION && game.state !== 'RESULT') {
      finishGame();
      return;
    }

    if (game.state !== 'PAUSED' && game.state !== 'RESULT' && game.state !== 'TITLE') {
      game.animationId = requestAnimationFrame(loop);
    }
  }

  function updateHud(elapsed) {
    elements.timeText.textContent = Math.max(0, TOTAL_DURATION - elapsed).toFixed(1);
    elements.scoreText.textContent = game.score.toLocaleString('ko-KR');
    elements.comboText.textContent = String(game.combo);
    elements.difficultyText.textContent = game.difficulty.toUpperCase();
  }

  function pauseGame(label = 'PAUSED') {
    if (game.state !== 'PLAYING' && game.state !== 'CURTAIN') return;
    setState('PAUSED');
    game.pausedAt = performance.now();
    elements.judgeText.textContent = label;
    if (game.audioContext?.state === 'running') game.audioContext.suspend();
    cancelAnimationFrame(game.animationId);
  }

  function resumeGame() {
    if (game.state !== 'PAUSED') return;
    const pausedDuration = performance.now() - game.pausedAt;
    game.startTime += pausedDuration;
    game.pausedAt = 0;
    if (game.audioContext?.state === 'suspended') game.audioContext.resume();
    const elapsed = getElapsed();
    setState(elapsed < CURTAIN_DURATION ? 'CURTAIN' : 'PLAYING');
    game.animationId = requestAnimationFrame(loop);
  }

  function togglePause() {
    if (game.state === 'PAUSED') resumeGame();
    else pauseGame();
  }

  function goTitle() {
    cancelAnimationFrame(game.animationId);
    setState('TITLE');
    showScreen('TITLE');
  }

  function buildChart(difficulty) {
    const settings = {
      easy: { count: 28, startWeight: 1.12, endWeight: 0.92, patternStep: 2 },
      normal: { count: 38, startWeight: 1.20, endWeight: 0.78, patternStep: 1 },
      hard: { count: 52, startWeight: 1.34, endWeight: 0.58, patternStep: 1 }
    }[difficulty];

    const start = 0.72;
    const end = PLAY_DURATION - 0.72;
    const span = end - start;
    const gapCount = settings.count - 1;
    const weights = [];
    for (let i = 0; i < gapCount; i += 1) {
      const progress = gapCount === 1 ? 0 : i / (gapCount - 1);
      weights.push(settings.startWeight + (settings.endWeight - settings.startWeight) * progress);
    }

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const chart = [];
    let time = start;
    for (let i = 0; i < settings.count; i += 1) {
      const keyIndex = (i * settings.patternStep) % QUEEN_THEME.length;
      chart.push(createNote(i, time, QUEEN_THEME[keyIndex]));
      if (i < gapCount) time += span * weights[i] / totalWeight;
    }
    return chart;
  }

  function createNote(id, time, key) {
    return { id, time, key, judged: false, result: null, element: null };
  }

  function createNoteElements() {
    game.notes.forEach((note) => {
      const div = document.createElement('div');
      div.className = 'note';
      div.title = `${note.key} ${KEY_MAP[note.key].name}`;
      div.innerHTML = `<span class="note-key">${note.key}</span><span class="note-name">${KEY_MAP[note.key].name}</span>`;
      note.element = div;
      elements.notesLayer.appendChild(div);
    });
  }

  function getNoteY(note) {
    const positions = { A: 84, S: 74, D: 64, F: 56, G: 48, H: 40, J: 32, K: 24 };
    return positions[note.key] ?? 50;
  }

  function updateNotes(songTime) {
    const laneWidth = elements.musicLane.clientWidth;
    const judgeX = laneWidth * 0.18;
    const spawnX = laneWidth + 160;
    game.notes.forEach((note) => {
      if (!note.element) return;
      if (note.judged) {
        note.element.classList.add('judged');
        return;
      }
      const delta = note.time - songTime;
      const x = judgeX + delta * NOTE_SPEED;
      const y = getNoteY(note);
      note.element.style.left = `${x}px`;
      note.element.style.top = `${y}%`;
      note.element.style.display = x < -160 || x > spawnX ? 'none' : 'flex';
    });
  }

  function autoMissPassedNotes(songTime) {
    game.notes.forEach((note) => {
      if (!note.judged && songTime - note.time > GOOD_WINDOW) {
        judgeMiss(note, 'WIND', '후우…');
        playWind();
      }
    });
  }

  function handleKeyDown(event) {
    const key = event.key.toUpperCase();
    if (key === 'P') {
      togglePause();
      return;
    }
    if (event.repeat) return;
    if (!KEY_MAP[key]) return;
    if (game.state !== 'PLAYING') return;

    game.inputCount += 1;
    flashKey(key);

    const songTime = getSongTime(getElapsed());
    const target = getClosestNote(songTime);

    if (!target) {
      showJudge('삐이익↗', 'miss');
      game.squeakCount += 1;
      playSqueak();
      animatePerformer('miss');
      return;
    }

    const delta = Math.abs(target.time - songTime);
    if (delta > GOOD_WINDOW) {
      if (target.time > songTime) {
        showJudge('TOO EARLY!', 'miss');
        game.squeakCount += 1;
        playSqueak();
      } else {
        showJudge('TOO LATE!', 'miss');
        game.squeakCount += 1;
        playWind();
      }
      animatePerformer('miss');
      return;
    }

    if (key !== target.key) {
      judgeMiss(target, 'WRONG NOTE', '음정 실종');
      playRecorder(KEY_MAP[key].freq, 0.16, 0.6);
      return;
    }

    if (delta <= PERFECT_WINDOW) {
      target.judged = true;
      target.result = 'PERFECT';
      game.score += 100;
      game.combo += 1;
      game.maxCombo = Math.max(game.maxCombo, game.combo);
      game.hitCount += 1;
      game.consecutiveMisses = 0;
      showJudge('PERFECT!', 'good');
      playRecorder(KEY_MAP[key].freq, 0.18, 1);
      animatePerformer('hit');
    } else {
      target.judged = true;
      target.result = 'GOOD';
      game.score += 50;
      game.combo += 1;
      game.maxCombo = Math.max(game.maxCombo, game.combo);
      game.hitCount += 1;
      game.consecutiveMisses = 0;
      showJudge('GOOD!', 'good');
      playRecorder(KEY_MAP[key].freq * 0.992, 0.14, 0.75);
      animatePerformer('hit');
    }
  }

  function getClosestNote(songTime) {
    const candidates = game.notes
      .filter((note) => !note.judged)
      .map((note) => ({ note, distance: Math.abs(note.time - songTime) }))
      .sort((a, b) => a.distance - b.distance);
    return candidates[0]?.note ?? null;
  }

  function judgeMiss(note, label, subText) {
    if (note.judged) return;
    note.judged = true;
    note.result = 'MISS';
    game.combo = 0;
    game.missCount += 1;
    game.consecutiveMisses += 1;
    showJudge(label, 'miss');
    animatePerformer('miss');
    if (game.consecutiveMisses >= 3) {
      showWarning('왕비님 퇴장 위기');
      elements.performer.classList.add('danger');
    } else {
      showWarning(subText);
    }
  }

  function flashKey(key) {
    const item = elements.keyGuide.querySelector(`[data-key="${key}"]`);
    if (!item) return;
    item.classList.add('hit');
    window.setTimeout(() => item.classList.remove('hit'), 120);
  }

  function showJudge(text, type) {
    elements.judgeText.textContent = text;
    elements.judgeText.classList.remove('pop');
    void elements.judgeText.offsetWidth;
    elements.judgeText.classList.add('pop');
    elements.judgeText.style.color = type === 'good' ? '#fff9c9' : '#ffb6b6';
  }

  function showWarning(text) {
    elements.warningText.textContent = text;
    elements.warningText.classList.remove('show');
    void elements.warningText.offsetWidth;
    elements.warningText.classList.add('show');
    window.setTimeout(() => elements.warningText.classList.remove('show'), 900);
  }

  function animatePerformer(className) {
    elements.performer.classList.remove('hit', 'miss');
    void elements.performer.offsetWidth;
    elements.performer.classList.add(className);
    window.setTimeout(() => elements.performer.classList.remove(className), 350);
  }

  function finishGame() {
    setState('RESULT');
    cancelAnimationFrame(game.animationId);
    const judgedNotes = game.notes.filter((note) => note.result === 'PERFECT' || note.result === 'GOOD').length;
    const accuracy = game.notes.length > 0 ? judgedNotes / game.notes.length : 0;
    const success = accuracy >= 0.7;
    if (game.score > game.highScore) {
      game.highScore = game.score;
      persistSave();
    }
    elements.resultTitle.textContent = success ? 'SUCCESS' : 'FAIL';
    elements.resultRank.textContent = getRankText(accuracy);
    elements.finalScore.textContent = game.score.toLocaleString('ko-KR');
    elements.finalAccuracy.textContent = `${Math.round(accuracy * 100)}%`;
    elements.finalCombo.textContent = String(game.maxCombo);
    elements.finalMiss.textContent = String(game.missCount);
    elements.finalSqueak.textContent = String(game.squeakCount);
    elements.highScoreText.textContent = game.highScore.toLocaleString('ko-KR');
    showScreen('RESULT');
  }

  function getRankText(accuracy) {
    if (accuracy >= 0.9) return '왕비님도 기립박수';
    if (accuracy >= 0.7) return '고음 리코더 생존자';
    if (accuracy >= 0.4) return '성악 레슨 필요';
    return '리코더 압수 위기';
  }

  function ensureAudio() {
    if (!game.audioContext) {
      game.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (game.audioContext.state === 'suspended') game.audioContext.resume();
  }

  function playRecorder(freq, duration = 0.16, quality = 1) {
    if (game.muted || !game.audioContext) return;
    const now = game.audioContext.currentTime;
    const osc = game.audioContext.createOscillator();
    const gain = game.audioContext.createGain();
    const filter = game.audioContext.createBiquadFilter();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(freq * (1 + (1 - quality) * 0.025), now + duration * 0.45);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(quality > 0.9 ? 1650 : 1080, now);
    filter.Q.setValueAtTime(8, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.08 * quality, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(game.audioContext.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playSqueak() {
    if (game.muted || !game.audioContext) return;
    const now = game.audioContext.currentTime;
    const osc = game.audioContext.createOscillator();
    const gain = game.audioContext.createGain();
    const filter = game.audioContext.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(860, now);
    osc.frequency.exponentialRampToValueAtTime(1680, now + 0.18);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1750, now);
    filter.Q.setValueAtTime(16, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(game.audioContext.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  function playWind() {
    if (game.muted || !game.audioContext) return;
    const now = game.audioContext.currentTime;
    const bufferSize = game.audioContext.sampleRate * 0.22;
    const buffer = game.audioContext.createBuffer(1, bufferSize, game.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = game.audioContext.createBufferSource();
    const filter = game.audioContext.createBiquadFilter();
    const gain = game.audioContext.createGain();
    noise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, now);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(game.audioContext.destination);
    noise.start(now);
    noise.stop(now + 0.23);
  }
})();
