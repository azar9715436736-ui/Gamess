cardEl.addEventListener('click', () => flipMemoryCard(card.id));
    board.appendChild(cardEl);
  });
}

function flipMemoryCard(id) {
  if (MEMORY.lock) return;

  const card = MEMORY.cards.find(c => c.id === id);
  if (!card || card.flipped || card.matched) return;

  card.flipped = true;
  MEMORY.flipped.push(id);

  const el = document.querySelector(`.mem-card[data-id="${id}"]`);
  if (el) el.classList.add('flipped');

  SoundEngine.flip();

  if (MEMORY.flipped.length < 2) return;

  MEMORY.moves++;
  document.getElementById('memMoves').textContent = MEMORY.moves;

  const [firstId, secondId] = MEMORY.flipped;
  const first = MEMORY.cards.find(c => c.id === firstId);
  const second = MEMORY.cards.find(c => c.id === secondId);

  MEMORY.lock = true;

  if (first.icon === second.icon) {
    first.matched = true;
    second.matched = true;
    MEMORY.matched++;

    document
      .querySelector(`.mem-card[data-id="${firstId}"]`)
      ?.classList.add('matched');

    document
      .querySelector(`.mem-card[data-id="${secondId}"]`)
      ?.classList.add('matched');

    document.getElementById('memPairs').textContent =
      `${MEMORY.matched}/8`;

    SoundEngine.match();
    MEMORY.flipped = [];
    MEMORY.lock = false;

    if (MEMORY.matched === 8) {
      finishMemory();
    } else {
      setStatus(
        'memStatus',
        '✨ Match found! Keep going.',
        'good'
      );
    }

  } else {
    setStatus(
      'memStatus',
      'Not a match — remember their positions.',
      'bad'
    );

    setTimeout(() => {
      first.flipped = false;
      second.flipped = false;

      document
        .querySelector(`.mem-card[data-id="${firstId}"]`)
        ?.classList.remove('flipped');

      document
        .querySelector(`.mem-card[data-id="${secondId}"]`)
        ?.classList.remove('flipped');

      MEMORY.flipped = [];
      MEMORY.lock = false;
    }, 750);
  }
}

function finishMemory() {
  const best = lsGet('mgh_mem_best', null);

  setStatus(
    'memStatus',
    `🎉 All 8 pairs matched in ${MEMORY.moves} moves!`,
    'good'
  );

  SoundEngine.win();

  if (best === null || MEMORY.moves < best) {
    lsSet('mgh_mem_best', MEMORY.moves);
    document.getElementById('memBest').textContent =
      `${MEMORY.moves} moves`;

    showToast('🏆 New Memory best score!');
  }
}

document.getElementById('memNew').addEventListener('click', () => {
  SoundEngine.click();
  initMemory();
});

/* ===========================================================
   5) QUIZ ARENA
   =========================================================== */

const QUIZ = {
  questions: [
    {
      q: 'Which language is mainly used to style web pages?',
      options: ['HTML', 'CSS', 'JavaScript', 'Python'],
      answer: 1
    },
    {
      q: 'What does CPU stand for?',
      options: [
        'Central Processing Unit',
        'Computer Personal Unit',
        'Central Program Utility',
        'Control Processing User'
      ],
      answer: 0
    },
    {
      q: 'Which planet is known as the Red Planet?',
      options: ['Earth', 'Mars', 'Jupiter', 'Venus'],
      answer: 1
    },
    {
      q: 'How many bits are in one byte?',
      options: ['4', '8', '16', '32'],
      answer: 1
    },
    {
      q: 'Which symbol is commonly used for a comment in JavaScript?',
      options: ['//', '<!--', '#', '**'],
      answer: 0
    },
    {
      q: 'What does HTML stand for?',
      options: [
        'HyperText Markup Language',
        'HighText Machine Language',
        'Hyper Transfer Main Link',
        'Home Tool Markup Language'
      ],
      answer: 0
    },
    {
      q: 'Which one is an operating system?',
      options: ['Chrome', 'Linux', 'Google', 'HTML'],
      answer: 1
    },
    {
      q: 'What is 5 × 5?',
      options: ['10', '15', '20', '25'],
      answer: 3
    },
    {
      q: 'Which device is used to move the pointer on a computer?',
      options: ['Keyboard', 'Monitor', 'Mouse', 'Printer'],
      answer: 2
    },
    {
      q: 'Which language is known for the file extension .py?',
      options: ['Java', 'Python', 'C', 'HTML'],
      answer: 1
    }
  ],
  index: 0,
  score: 0,
  answered: false
};

function initQuiz() {
  QUIZ.index = 0;
  QUIZ.score = 0;
  QUIZ.answered = false;

  document.getElementById('quizGame').classList.remove('hidden');
  document.getElementById('quizResult').classList.add('hidden');

  showQuizQuestion();
}

function showQuizQuestion() {
  const question = QUIZ.questions[QUIZ.index];

  QUIZ.answered = false;

  document.getElementById('quizQuestion').textContent =
    question.q;

  document.getElementById('quizProgressFill').style.width =
    `${((QUIZ.index + 1) / QUIZ.questions.length) * 100}%`;

  const optionsEl = document.getElementById('quizOptions');
  optionsEl.innerHTML = '';

  question.options.forEach((option, index) => {
    const button = document.createElement('button');

    button.className = 'quiz-opt';
    button.textContent = option;

    button.addEventListener('click', () => {
      answerQuiz(index);
    });

    optionsEl.appendChild(button);
  });

  setStatus(
    'quizStatus',
    `Question ${QUIZ.index + 1} of ${QUIZ.questions.length}`,
    ''
  );
}

function answerQuiz(selected) {
  if (QUIZ.answered) return;

  QUIZ.answered = true;

  const question = QUIZ.questions[QUIZ.index];
  const buttons = document.querySelectorAll('.quiz-opt');

  buttons.forEach(button => {
    button.disabled = true;
  });

  if (selected === question.answer) {
    QUIZ.score++;

    buttons[selected].classList.add('correct');

    setStatus(
      'quizStatus',
      '✅ Correct!',
      'good'
    );

    SoundEngine.correct();

  } else {
    buttons[selected].classList.add('wrong');
    buttons[question.answer].classList.add('correct');

    setStatus(
      'quizStatus',
      '❌ Wrong answer!',
      'bad'
    );

    SoundEngine.wrong();
  }

  setTimeout(() => {
    QUIZ.index++;

    if (QUIZ.index < QUIZ.questions.length) {
      showQuizQuestion();
    } else {
      finishQuiz();
    }
  }, 900);
}

function finishQuiz() {
  document.getElementById('quizGame').classList.add('hidden');
  document.getElementById('quizResult').classList.remove('hidden');

  document.getElementById('quizResultScore').textContent =
    `${QUIZ.score}/10`;

  let message;

  if (QUIZ.score === 10) {
    message = '🏆 Perfect score!';
  } else if (QUIZ.score >= 8) {
    message = '🔥 Excellent work!';
  } else if (QUIZ.score >= 5) {
    message = '👍 Good job!';
  } else {
    message = '💪 Keep practicing!';
  }

  document.getElementById('quizResultMsg').textContent =
    message;

  const best = lsGet('mgh_quiz_best', null);

  if (best === null || QUIZ.score > best) {
    lsSet('mgh_quiz_best', QUIZ.score);

    document.getElementById('quizBestLine').textContent =
      '🏆 New best score!';

    showToast('🏆 New Quiz best score!');
  } else {
    document.getElementById('quizBestLine').textContent =
      `Best score: ${best}/10`;
  }

  SoundEngine.win();
}

document.getElementById('quizRestart').addEventListener('click', () => {
  SoundEngine.click();
  initQuiz();
});

/* ===========================================================
   STARTUP
   =========================================================== */

refreshHomeBestScores();
syncMuteUI();

console.log('🎮 MINI GAME HUB loaded successfully!');
