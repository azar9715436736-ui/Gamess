/* =========================================================
   MINI GAME HUB — script.js
   Navigation + Sound + 5 Games + localStorage persistence
   ========================================================= */

/* ---------------------------------------------------------
   VISIBLE ERROR CATCHER (for debugging on mobile where
   there is no console). If anything throws, this shows the
   real error on screen instead of failing silently.
   --------------------------------------------------------- */
window.addEventListener('error', function (e) {
  showErrorBanner(e.message + ' (line ' + e.lineno + ')');
});
function showErrorBanner(msg) {
  let banner = document.getElementById('errorBanner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'errorBanner';
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;' +
      'background:#ff2d55;color:#fff;padding:12px 16px;font-family:monospace;' +
      'font-size:13px;line-height:1.5;white-space:pre-wrap;word-break:break-word;';
    document.body.prepend(banner);
  }
  banner.textContent = '⚠️ Script error: ' + msg;
}

/* ---------------------------------------------------------
   SOUND ENGINE (Web Audio API, no external files)
   --------------------------------------------------------- */
const SoundEngine = (() => {
  let ctx = null;
  let muted = localStorage.getItem('mgh_muted') === 'true';

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, duration = 0.12, type = 'sine', gainVal = 0.08, delay = 0) {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(gainVal, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  return {
    click: () => tone(440, 0.06, 'square', 0.05),
    place: () => tone(520, 0.09, 'triangle', 0.07),
    win: () => { tone(523, 0.12, 'triangle', 0.09, 0); tone(659, 0.12, 'triangle', 0.09, 0.1); tone(784, 0.22, 'triangle', 0.09, 0.2); },
    lose: () => { tone(300, 0.16, 'sawtooth', 0.06, 0); tone(220, 0.22, 'sawtooth', 0.06, 0.14); },
    draw: () => tone(380, 0.18, 'sine', 0.07),
    flip: () => tone(600, 0.05, 'square', 0.05),
    match: () => { tone(660, 0.08, 'triangle', 0.08, 0); tone(880, 0.14, 'triangle', 0.08, 0.08); },
    correct: () => { tone(587, 0.1, 'triangle', 0.08, 0); tone(880, 0.16, 'triangle', 0.08, 0.09); },
    wrong: () => tone(180, 0.24, 'sawtooth', 0.07),
    nav: () => tone(700, 0.05, 'sine', 0.04),
    isMuted: () => muted,
    toggle: () => {
      muted = !muted;
      localStorage.setItem('mgh_muted', muted);
      if (!muted) ensureCtx();
      return muted;
    }
  };
})();

/* ---------------------------------------------------------
   TOAST
   --------------------------------------------------------- */
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------------------------------------------------
   NAVIGATION
   --------------------------------------------------------- */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + id);
  if (target) target.classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goHome() {
  SoundEngine.nav();
  showView('home');
  refreshHomeBestScores();
}

document.getElementById('homeBtn').addEventListener('click', goHome);

document.querySelectorAll('.game-card, .play-btn').forEach(el => {
  el.addEventListener('click', (e) => {
    const game = el.dataset.game;
    if (!game) return;
    SoundEngine.click();
    openGame(game);
  });
  if (el.classList.contains('game-card')) {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        SoundEngine.click();
        openGame(el.dataset.game);
      }
    });
  }
});

function openGame(game) {
  showView(game);
  if (game === 'ttt') initTTT();
  if (game === 'rps') initRPS();
  if (game === 'guess') initGuess();
  if (game === 'memory') initMemory();
  if (game === 'quiz') initQuiz();
}

/* ---------------------------------------------------------
   MUTE BUTTON
   --------------------------------------------------------- */
const muteBtn = document.getElementById('muteBtn');
const muteIcon = document.getElementById('muteIcon');
function syncMuteUI() {
  const isMuted = SoundEngine.isMuted();
  muteIcon.textContent = isMuted ? '🔇' : '🔊';
  muteBtn.classList.toggle('muted', isMuted);
}
muteBtn.addEventListener('click', () => {
  SoundEngine.toggle();
  syncMuteUI();
});
syncMuteUI();

/* ---------------------------------------------------------
   LOCAL STORAGE HELPERS
   --------------------------------------------------------- */
function lsGet(key, fallback) {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}
function lsSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

function refreshHomeBestScores() {
  const tttStreak = lsGet('mgh_ttt_streak', 0);
  const rpsStreak = lsGet('mgh_rps_streak', 0);
  const guessBest = lsGet('mgh_guess_best', null);
  const memBest = lsGet('mgh_mem_best', null);
  const quizBest = lsGet('mgh_quiz_best', null);

  document.getElementById('best-ttt').textContent = `Best streak: ${tttStreak}`;
  document.getElementById('best-rps').textContent = `Best streak: ${rpsStreak}`;
  document.getElementById('best-guess').textContent = guessBest ? `Best: ${guessBest} tries` : 'Best: —';
  document.getElementById('best-memory').textContent = memBest ? `Best: ${memBest} moves` : 'Best: —';
  document.getElementById('best-quiz').textContent = quizBest !== null ? `Best: ${quizBest}/10` : 'Best: —';
}
refreshHomeBestScores();

/* ===========================================================
   1) TIC-TAC-TOE
   =========================================================== */
const TTT = {
  board: Array(9).fill(''),
  gameOver: false,
  win: 0, draw: 0, lose: 0,
  streak: 0
};

const WIN_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

function initTTT() {
  TTT.board = Array(9).fill('');
  TTT.gameOver = false;
  TTT.win = lsGet('mgh_ttt_win', 0);
  TTT.draw = lsGet('mgh_ttt_draw', 0);
  TTT.lose = lsGet('mgh_ttt_lose', 0);
  TTT.streak = lsGet('mgh_ttt_streak', 0);
  renderTTTScores();
  buildTTTBoard();
  setStatus('tttStatus', 'Your move — choose a square.', '');
}

function buildTTTBoard() {
  const boardEl = document.getElementById('tttBoard');
  boardEl.innerHTML = '';
  TTT.board.forEach((val, i) => {
    const cell = document.createElement('div');
    cell.className = 'ttt-cell';
    cell.dataset.index = i;
    cell.addEventListener('click', () => handleTTTMove(i));
    boardEl.appendChild(cell);
  });
}

function handleTTTMove(i) {
  if (TTT.gameOver || TTT.board[i] !== '') return;
  TTT.board[i] = 'X';
  SoundEngine.place();
  renderTTTBoard();

  const winInfo = checkTTTWin(TTT.board);
  if (winInfo) return endTTT('win', winInfo.line);
  if (TTT.board.every(c => c !== '')) return endTTT('draw');

  setStatus('tttStatus', 'Computer is thinking…', 'mid');
  document.getElementById('tttBoard').classList.add('disabled');
  setTimeout(computerTTTMove, 480);
}

function computerTTTMove() {
  if (TTT.gameOver) return;
  const move = bestTTTMove(TTT.board);
  if (move !== -1) {
    TTT.board[move] = 'O';
    SoundEngine.place();
  }
  renderTTTBoard();
  document.getElementById('tttBoard').classList.remove('disabled');

  const winInfo = checkTTTWin(TTT.board);
  if (winInfo) return endTTT('lose', winInfo.line);
  if (TTT.board.every(c => c !== '')) return endTTT('draw');
  setStatus('tttStatus', 'Your move — choose a square.', '');
}

// Unbeatable-ish AI: win if possible, block if needed, else strategic
function bestTTTMove(board) {
  // 1. Try to win
  for (const line of WIN_LINES) {
    const move = findCompletingMove(board, line, 'O');
    if (move !== -1) return move;
  }
  // 2. Block player
  for (const line of WIN_LINES) {
    const move = findCompletingMove(board, line, 'X');
    if (move !== -1) return move;
  }
  // 3. Take center
  if (board[4] === '') return 4;
  // 4. Take a corner
  const corners = [0,2,6,8].filter(i => board[i] === '');
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)];
  // 5. Any remaining
  const remaining = board.map((v,i)=>v===''?i:-1).filter(i=>i!==-1);
  return remaining.length ? remaining[Math.floor(Math.random()*remaining.length)] : -1;
}

function findCompletingMove(board, line, player) {
  const vals = line.map(i => board[i]);
  const countPlayer = vals.filter(v => v === player).length;
  const countEmpty = vals.filter(v => v === '').length;
  if (countPlayer === 2 && countEmpty === 1) {
    return line[vals.indexOf('')];
  }
  return -1;
}

function checkTTTWin(board) {
  for (const line of WIN_LINES) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      return { player: board[a], line };
    }
  }
  return null;
}

function renderTTTBoard(winLine) {
  const cells = document.querySelectorAll('#tttBoard .ttt-cell');
  cells.forEach((cell, i) => {
    const val = TTT.board[i];
    cell.textContent = val;
    cell.classList.toggle('filled', val !== '');
    cell.classList.remove('x', 'o', 'win-cell');
    if (val === 'X') cell.classList.add('x');
    if (val === 'O') cell.classList.add('o');
  });
  if (winLine) winLine.forEach(i => cells[i].classList.add('win-cell'));
}

function endTTT(result, line) {
  TTT.gameOver = true;
  renderTTTBoard(line);
  document.getElementById('tttBoard').classList.add('disabled');

  if (result === 'win') {
    TTT.win++; TTT.streak++;
    lsSet('mgh_ttt_streak', TTT.streak);
    if (TTT.streak > lsGet('mgh_ttt_streak_best', 0)) lsSet('mgh_ttt_streak_best', TTT.streak);
    setStatus('tttStatus', '🎉 You win!', 'good');
    SoundEngine.win();
  } else if (result === 'lose') {
    TTT.lose++; TTT.streak = 0;
    lsSet('mgh_ttt_streak', 0);
    setStatus('tttStatus', '💀 Computer wins.', 'bad');
    SoundEngine.lose();
  } else {
    TTT.draw++;
    setStatus('tttStatus', '🤝 It’s a draw.', 'mid');
    SoundEngine.draw();
  }
  lsSet('mgh_ttt_win', TTT.win);
  lsSet('mgh_ttt_draw', TTT.draw);
  lsSet('mgh_ttt_lose', TTT.lose);
  renderTTTScores();
}

function renderTTTScores() {
  document.getElementById('ttt-win').textContent = TTT.win;
  document.getElementById('ttt-draw').textContent = TTT.draw;
  document.getElementById('ttt-lose').textContent = TTT.lose;
}

document.getElementById('tttRestart').addEventListener('click', () => {
  SoundEngine.click();
  TTT.board = Array(9).fill('');
  TTT.gameOver = false;
  buildTTTBoard();
  document.getElementById('tttBoard').classList.remove('disabled');
  setStatus('tttStatus', 'Your move — choose a square.', '');
});

document.getElementById('tttReset').addEventListener('click', () => {
  SoundEngine.click();
  TTT.win = TTT.draw = TTT.lose = TTT.streak = 0;
  lsSet('mgh_ttt_win', 0); lsSet('mgh_ttt_draw', 0); lsSet('mgh_ttt_lose', 0); lsSet('mgh_ttt_streak', 0);
  renderTTTScores();
  showToast('Tic-Tac-Toe scores reset');
});

function setStatus(id, text, cls) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.classList.remove('good', 'bad', 'mid');
  if (cls) el.classList.add(cls);
}

/* ===========================================================
   2) ROCK PAPER SCISSORS
   =========================================================== */
const RPS = { win: 0, draw: 0, lose: 0, streak: 0, busy: false };
const RPS_ICON = { rock: '✊', paper: '📄', scissors: '✂️' };

function initRPS() {
  RPS.win = lsGet('mgh_rps_win', 0);
  RPS.draw = lsGet('mgh_rps_draw', 0);
  RPS.lose = lsGet('mgh_rps_lose', 0);
  RPS.streak = lsGet('mgh_rps_streak', 0);
  RPS.busy = false;
  renderRPSScores();
  document.getElementById('rpsPlayerAvatar').textContent = '❔';
  document.getElementById('rpsCpuAvatar').textContent = '❔';
  document.getElementById('rpsPlayerAvatar').classList.remove('reveal');
  document.getElementById('rpsCpuAvatar').classList.remove('reveal');
  setStatus('rpsStatus', 'Make your choice!', '');
}

document.querySelectorAll('.rps-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (RPS.busy) return;
    playRPS(btn.dataset.choice);
  });
});

function playRPS(playerChoice) {
  RPS.busy = true;
  SoundEngine.click();
  const options = ['rock', 'paper', 'scissors'];
  const cpuChoice = options[Math.floor(Math.random() * 3)];

  const pAvatar = document.getElementById('rpsPlayerAvatar');
  const cAvatar = document.getElementById('rpsCpuAvatar');
  pAvatar.classList.remove('reveal'); cAvatar.classList.remove('reveal');
  void pAvatar.offsetWidth;
  pAvatar.textContent = RPS_ICON[playerChoice];
  cAvatar.textContent = '🤔';
  setStatus('rpsStatus', 'Rock… Paper… Scissors…', 'mid');

  setTimeout(() => {
    cAvatar.textContent = RPS_ICON[cpuChoice];
    pAvatar.classList.add('reveal');
    cAvatar.classList.add('reveal');

    const result = judgeRPS(playerChoice, cpuChoice);
    if (result === 'win') {
      RPS.win++; RPS.streak++;
      lsSet('mgh_rps_streak', RPS.streak);
      setStatus('rpsStatus', `🎉 ${cap(playerChoice)} beats ${cpuChoice}! You win.`, 'good');
      SoundEngine.win();
    } else if (result === 'lose') {
      RPS.lose++; RPS.streak = 0;
      lsSet('mgh_rps_streak', 0);
      setStatus('rpsStatus', `💀 ${cap(cpuChoice)} beats ${playerChoice}. CPU wins.`, 'bad');
      SoundEngine.lose();
    } else {
      RPS.draw++;
      setStatus('rpsStatus', `🤝 Both chose ${playerChoice}. Draw.`, 'mid');
      SoundEngine.draw();
    }
    lsSet('mgh_rps_win', RPS.win);
    lsSet('mgh_rps_draw', RPS.draw);
    lsSet('mgh_rps_lose', RPS.lose);
    renderRPSScores();
    RPS.busy = false;
  }, 550);
}

function judgeRPS(p, c) {
  if (p === c) return 'draw';
  const beats = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  return beats[p] === c ? 'win' : 'lose';
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function renderRPSScores() {
  document.getElementById('rps-win').textContent = RPS.win;
  document.getElementById('rps-draw').textContent = RPS.draw;
  document.getElementById('rps-lose').textContent = RPS.lose;
}

document.getElementById('rpsReset').addEventListener('click', () => {
  SoundEngine.click();
  RPS.win = RPS.draw = RPS.lose = RPS.streak = 0;
  lsSet('mgh_rps_win', 0); lsSet('mgh_rps_draw', 0); lsSet('mgh_rps_lose', 0); lsSet('mgh_rps_streak', 0);
  renderRPSScores();
  showToast('Rock Paper Scissors scores reset');
});

/* ===========================================================
   3) GUESS THE NUMBER
   =========================================================== */
const GUESS = { target: 1, attempts: 0, low: 1, high: 100, over: false };

function initGuess() {
  GUESS.target = Math.floor(Math.random() * 100) + 1;
  GUESS.attempts = 0;
  GUESS.low = 1;
  GUESS.high = 100;
  GUESS.over = false;
  document.getElementById('guessAttempts').textContent = '0';
  document.getElementById('guessInput').value = '';
  document.getElementById('guessInput').disabled = false;
  document.getElementById('guessSubmit').disabled = false;
  document.getElementById('guessRangeFill').style.width = '0%';
  const best = lsGet('mgh_guess_best', null);
  document.getElementById('guessBestDisplay').textContent = best ? `${best} tries` : '—';
  setStatus('guessStatus', 'Enter a guess to begin.', '');
  document.getElementById('guessInput').focus({ preventScroll: true });
}

function submitGuess() {
  if (GUESS.over) return;
  const input = document.getElementById('guessInput');
  const raw = input.value.trim();
  const val = Number(raw);

  if (raw === '' || !Number.isInteger(val) || val < 1 || val > 100) {
    setStatus('guessStatus', '⚠️ Enter a whole number between 1 and 100.', 'bad');
    SoundEngine.wrong();
    return;
  }

  GUESS.attempts++;
  document.getElementById('guessAttempts').textContent = GUESS.attempts;

  if (val === GUESS.target) {
    setStatus('guessStatus', `🎉 Correct! The number was ${GUESS.target}, solved in ${GUESS.attempts} ${GUESS.attempts===1?'try':'tries'}.`, 'good');
    document.getElementById('guessRangeFill').style.width = '100%';
    SoundEngine.win();
    GUESS.over = true;
    input.disabled = true;
    document.getElementById('guessSubmit').disabled = true;

    const best = lsGet('mgh_guess_best', null);
    if (best === null || GUESS.attempts < best) {
      lsSet('mgh_guess_best', GUESS.attempts);
      showToast('🏆 New best score!');
    }
    document.getElementById('guessBestDisplay').textContent = `${lsGet('mgh_guess_best', GUESS.attempts)} tries`;
  } else if (val < GUESS.target) {
    GUESS.low = Math.max(GUESS.low, val + 1);
    setStatus('guessStatus', `📈 Too Low! Try higher.`, 'mid');
    SoundEngine.click();
    updateGuessBar();
  } else {
    GUESS.high = Math.min(GUESS.high, val - 1);
    setStatus('guessStatus', `📉 Too High! Try lower.`, 'mid');
    SoundEngine.click();
    updateGuessBar();
  }
  input.value = '';
  input.focus({ preventScroll: true });
}

function updateGuessBar() {
  const pct = ((GUESS.low - 1) / 99) * 50 + ((100 - GUESS.high) / 99) * 50;
  const fillPct = Math.min(96, Math.max(4, pct));
  document.getElementById('guessRangeFill').style.width = fillPct + '%';
}

document.getElementById('guessSubmit').addEventListener('click', submitGuess);
document.getElementById('guessInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitGuess();
});
document.getElementById('guessNew').addEventListener('click', () => {
  SoundEngine.click();
  initGuess();
});

/* ===========================================================
   4) MEMORY MATCH
   =========================================================== */
const MEMORY = { cards: [], flipped: [], matched: 0, moves: 0, lock: false };
const MEM_ICONS = ['🚀','🎯','🍀','⭐','🔥','🌙','💎','🎲'];

function initMemory() {
  const icons = [...MEM_ICONS, ...MEM_ICONS];
  shuffleArray(icons);
  MEMORY.cards = icons.map((icon, i) => ({ id: i, icon, flipped: false, matched: false }));
  MEMORY.flipped = [];
  MEMORY.matched = 0;
  MEMORY.moves = 0;
  MEMORY.lock = false;

  document.getElementById('memMoves').textContent = '0';
  document.getElementById('memPairs').textContent = '0/8';
  const best = lsGet('mgh_mem_best', null);
  document.getElementById('memBest').textContent = best ? `${best} moves` : '—';
  setStatus('memStatus', 'Tap two cards to find a match.', '');

  buildMemoryBoard();
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildMemoryBoard() {
  const board = document.getElementById('memoryBoard');
  board.innerHTML = '';
  MEMORY.cards.forEach(card => {
    const cardEl = document.createElement('div');
    cardEl.className = 'mem-card';
    cardEl.dataset.id = card.id;
    cardEl.innerHTML = `
      <div class="mem-inner">
        <div class="mem-face front"></div>
        <div class="mem-face back">${card.icon}</div>
      </div>`;
    cardEl.addEventListener('click', () => flipMemoryCard(card.id));
    board.appendChild(cardEl);
  });
}

function flipMemoryCard(id) {
  if (MEMORY.lock) return;
  const card = MEMORY.cards[id];
  if (card.flipped || card.matched) return;
  if (MEMORY.flipped.length === 2) return;

  card.flipped = true;
  SoundEngine.flip();
  const el = document.querySelector(`.mem-card[data-id="${id}"]`);
  el.classList.add('flipped');
  MEMORY.flipped.push(card);

  if (MEMORY.flipped.length === 2) {
    MEMORY.moves++;
    document.getElementById('memMoves').textContent = MEMORY.moves;
    MEMORY.lock = true;
    const [a, b] = MEMORY.flipped;
    if (a.icon === b.icon) {
      setTimeout(() => {
        a.matched = true; b.matched = true;
        document.querySelector(`.mem-card[data-id="${a.id}"]`).classList.add('matched');
        document.querySelector(`.mem-card[data-id="${b.id}"]`).classList.add('matched');
        MEMORY.matched++;
        document.getElementById('memPairs').textContent = `${MEMORY.matched}/8`;
        SoundEngine.match();
        MEMORY.flipped = [];
        MEMORY.lock = false;

        if (MEMORY.matched === 8) finishMemory();
      }, 350);
    } else {
      setTimeout(() => {
        a.flipped = false; b.flipped = false;
        document.querySelector(`.mem-card[data-id="${a.id}"]`).classList.remove('flipped');
        document.querySelector(`.mem-card[data-id="${b.id}"]`).classList.remove('flipped');
        MEMORY.flipped = [];
        MEMORY.lock = false;
      }, 750);
    }
  }
}

function finishMemory() {
  setStatus('memStatus', `🎉 Solved in ${MEMORY.moves} moves!`, 'good');
  SoundEngine.win();
  const best = lsGet('mgh_mem_best', null);
  if (best === null || MEMORY.moves < best) {
    lsSet('mgh_mem_best', MEMORY.moves);
    document.getElementById('memBest').textContent = `${MEMORY.moves} moves`;
    showToast('🏆 New best score!');
  }
}

document.getElementById('memRestart').addEventListener('click', () => {
  SoundEngine.click();
  initMemory();
});

/* ===========================================================
   5) QUIZ ARENA
   =========================================================== */
const QUIZ_QUESTIONS = [
  { q: 'What does "CPU" stand for?', options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Program Utility', 'Core Processing Unit'], correct: 0 },
  { q: 'Which planet is known as the Red Planet?', options: ['Venus', 'Jupiter', 'Mars', 'Saturn'], correct: 2 },
  { q: 'What is the capital city of Japan?', options: ['Seoul', 'Beijing', 'Bangkok', 'Tokyo'], correct: 3 },
  { q: 'In HTML, what tag is used for the largest heading?', options: ['<h6>', '<h1>', '<head>', '<heading>'], correct: 1 },
  { q: 'How many players are on a standard soccer team on the field?', options: ['9', '10', '11', '12'], correct: 2 },
  { q: 'Which gas do plants primarily absorb from the atmosphere?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'], correct: 2 },
  { q: 'What is the largest ocean on Earth?', options: ['Atlantic', 'Indian', 'Arctic', 'Pacific'], correct: 3 },
  { q: 'Who wrote the play "Romeo and Juliet"?', options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'], correct: 1 },
  { q: 'What is the chemical symbol for gold?', options: ['Go', 'Gd', 'Au', 'Ag'], correct: 2 },
  { q: 'Which programming language is primarily used for styling web pages?', options: ['CSS', 'Python', 'Java', 'SQL'], correct: 0 },
  { q: 'How many continents are there on Earth?', options: ['5', '6', '7', '8'], correct: 2 },
  { q: 'What is the smallest prime number?', options: ['0', '1', '2', '3'], correct: 2 }
];

const QUIZ = { order: [], index: 0, score: 0, answered: false };

function initQuiz() {
  QUIZ.order = [...QUIZ_QUESTIONS.keys()];
  shuffleArray(QUIZ.order);
  QUIZ.order = QUIZ.order.slice(0, 10);
  QUIZ.index = 0;
  QUIZ.score = 0;
  QUIZ.answered = false;

  document.getElementById('quizQuestionWrap').classList.remove('hidden');
  document.getElementById('quizResultWrap').classList.add('hidden');
  document.getElementById('quizNext').classList.add('hidden');
  document.getElementById('quizRestart').classList.add('hidden');

  renderQuizQuestion();
}

function renderQuizQuestion() {
  const qData = QUIZ_QUESTIONS[QUIZ.order[QUIZ.index]];
  QUIZ.answered = false;
  document.getElementById('quizProgressText').textContent = `Question ${QUIZ.index + 1} of ${QUIZ.order.length}`;
  document.getElementById('quizProgressFill').style.width = `${((QUIZ.index) / QUIZ.order.length) * 100}%`;
  document.getElementById('quizQuestion').textContent = qData.q;

  const optWrap = document.getElementById('quizOptions');
  optWrap.innerHTML = '';
  qData.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-opt';
    btn.textContent = opt;
    btn.addEventListener('click', () => handleQuizAnswer(i, qData.correct, btn));
    optWrap.appendChild(btn);
  });

  document.getElementById('quizNext').classList.add('hidden');
}

function handleQuizAnswer(chosen, correct, btnEl) {
  if (QUIZ.answered) return;
  QUIZ.answered = true;
  const allBtns = document.querySelectorAll('.quiz-opt');
  allBtns.forEach(b => b.disabled = true);

  if (chosen === correct) {
    QUIZ.score++;
    btnEl.classList.add('correct');
    SoundEngine.correct();
  } else {
    btnEl.classList.add('wrong');
    allBtns[correct].classList.add('correct');
    SoundEngine.wrong();
  }

  const nextBtn = document.getElementById('quizNext');
  const restartBtn = document.getElementById('quizRestart');
  if (QUIZ.index === QUIZ.order.length - 1) {
    nextBtn.textContent = 'See Results';
  } else {
    nextBtn.textContent = 'Next Question';
  }
  nextBtn.classList.remove('hidden');
  restartBtn.classList.add('hidden');
}

document.getElementById('quizNext').addEventListener('click', () => {
  SoundEngine.click();
  if (QUIZ.index === QUIZ.order.length - 1) {
    showQuizResults();
  } else {
    QUIZ.index++;
    renderQuizQuestion();
  }
});

function showQuizResults() {
  document.getElementById('quizProgressFill').style.width = '100%';
  document.getElementById('quizQuestionWrap').classList.add('hidden');
  document.getElementById('quizResultWrap').classList.remove('hidden');
  document.getElementById('quizNext').classList.add('hidden');
  document.getElementById('quizRestart').classList.remove('hidden');

  const total = QUIZ.order.length;
  const score = QUIZ.score;
  document.getElementById('quizResultScore').textContent = `${score} / ${total}`;

  let icon = '🙂', msg = 'Nice effort — try again to beat your score!';
  const pct = score / total;
  if (pct === 1) { icon = '🏆'; msg = 'Perfect score! You are a certified genius.'; SoundEngine.win(); }
  else if (pct >= 0.8) { icon = '🔥'; msg = 'Excellent! You really know your stuff.'; SoundEngine.win(); }
  else if (pct >= 0.5) { icon = '👍'; msg = 'Good job! A little more practice and you\'ll ace it.'; SoundEngine.draw(); }
  else { icon = '💡'; msg = 'Keep practicing — you\'ll improve fast!'; SoundEngine.lose(); }

  document.getElementById('quizResultIcon').textContent = icon;
  document.getElementById('quizResultMsg').textContent = msg;

  const best = lsGet('mgh_quiz_best', null);
  const bestLine = document.getElementById('quizBestLine');
  if (best === null || score > best) {
    lsSet('mgh_quiz_best', score);
    bestLine.textContent = '🏆 New personal best!';
    showToast('🏆 New best quiz score!');
  } else {
    bestLine.textContent = `Personal best: ${best} / ${total}`;
  }
}

document.getElementById('quizRestart').addEventListener('click', () => {
  SoundEngine.click();
  initQuiz();
});

/* ---------------------------------------------------------
   INITIAL LOAD
   --------------------------------------------------------- */
showView('home');

