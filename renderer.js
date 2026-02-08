/**
 * Main Renderer - UI Controller
 * Handles DOM updates, user interactions, and coordinates modules
 */

class GameRenderer {
    constructor() {
        // DOM Elements
        this.elements = {
            // Scores
            player1Score: document.getElementById('player1-score'),
            hiScore: document.getElementById('hi-score'),
            combo: document.getElementById('combo'),

            // Question
            questionNumber: document.getElementById('question-number'),
            qCurrent: document.getElementById('q-current'),
            qTotal: document.getElementById('q-total'),
            questionText: document.getElementById('question-text'),

            // Answers
            answerBlue: document.getElementById('answer-blue'),
            answerOrange: document.getElementById('answer-orange'),
            answerGreen: document.getElementById('answer-green'),
            answerYellow: document.getElementById('answer-yellow'),

            // Timer
            timer: document.getElementById('timer'),

            // Buttons
            submitBtn: document.getElementById('submit-btn'),
            hintBtn: document.getElementById('hint-btn'),
            skipBtn: document.getElementById('skip-btn'),
            playAgainBtn: document.getElementById('play-again-btn'),

            // Screens
            lobbyScreen: document.getElementById('lobby-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            gameContainer: document.querySelector('.game-container'),

            // Game over stats
            finalScore: document.getElementById('final-score'),
            statQuestions: document.getElementById('stat-questions'),
            statCorrect: document.getElementById('stat-correct'),
            statCombo: document.getElementById('stat-combo')
        };

        // Player slot elements
        this.playerSlots = {
            player1: document.getElementById('slot-p1'),
            player2: document.getElementById('slot-p2'),
            player3: document.getElementById('slot-p3'),
            player4: document.getElementById('slot-p4')
        };

        // Answer button elements
        this.answerButtons = document.querySelectorAll('.answer-btn');

        // Current selection
        this.selectedAnswer = null;

        // Game stats
        this.stats = {
            correctAnswers: 0,
            totalQuestions: 0,
            bestCombo: 0
        };

        // Current screen state
        this.currentScreen = 'lobby'; // 'lobby', 'game', 'gameOver'

        // Start sequence tracking (Blue → Orange → Green → Yellow)
        this.startSequence = [];
        this.requiredSequence = ['blue', 'orange', 'green', 'yellow'];
        this.sequenceTimeout = null;

        this.init();
    }

    async init() {
        console.log('[Renderer] Initializing...');

        // Set up event listeners
        this.setupButtonListeners();
        this.setupKeyboardListeners();
        this.setupGameStateListeners();
        this.setupGamepadListeners();

        // Load quiz
        try {
            await window.quizEngine.load('quiz.json');
        } catch (error) {
            console.warn('[Renderer] Could not load quiz.json, using sample data');
            this.useSampleData();
        }

        // Update initial UI
        this.updateHiScore();

        // Show lobby screen
        this.showScreen('lobby');

        console.log('[Renderer] Ready!');
    }

    /**
     * Show a specific screen
     */
    showScreen(screen) {
        this.currentScreen = screen;

        // Hide all screens first
        this.elements.lobbyScreen.classList.add('hidden');
        this.elements.gameOverScreen.classList.add('hidden');
        this.elements.gameContainer.style.display = 'none';

        switch (screen) {
            case 'lobby':
                this.elements.lobbyScreen.classList.remove('hidden');
                break;
            case 'game':
                this.elements.gameContainer.style.display = 'flex';
                break;
            case 'gameOver':
                this.elements.gameOverScreen.classList.remove('hidden');
                break;
        }
    }

    /**
     * Start the game
     */
    startGame() {
        console.log('[Renderer] Starting game...');

        // Reset stats
        this.stats = {
            correctAnswers: 0,
            totalQuestions: window.quizEngine.totalQuestions,
            bestCombo: 0
        };

        // Reset quiz
        window.quizEngine.reset();
        window.gameState.resetGame();

        // Auto-join player 1 for single player
        window.gameState.playerJoin('player1');

        // Show game screen
        this.showScreen('game');

        // Display first question
        this.displayQuestion(window.quizEngine.getCurrentQuestion());
        this.updateProgress();
        this.updateScore();

        // Start the game
        window.gameState.setState(window.gameState.STATES.QUESTION_REVEAL);
    }

    /**
     * Player join in lobby
     */
    playerJoin(playerKey) {
        if (this.currentScreen !== 'lobby') return;

        const slot = this.playerSlots[playerKey];
        if (slot && !slot.classList.contains('joined')) {
            slot.classList.add('joined');
            slot.querySelector('.slot-status').textContent = 'READY!';

            window.gameState.playerJoin(playerKey);
            console.log(`[Renderer] ${playerKey} joined!`);
        }
    }

    /**
     * Handle start sequence in lobby
     * Requires pressing Blue → Orange → Green → Yellow to start
     */
    handleStartSequence(color) {
        if (this.currentScreen !== 'lobby') return;

        // Check if at least one player has joined
        const joinedCount = document.querySelectorAll('.player-slot.joined').length;
        if (joinedCount === 0) {
            console.log('[Renderer] No players joined yet!');
            return;
        }

        // Add to sequence
        this.startSequence.push(color);
        console.log(`[Renderer] Start sequence: ${this.startSequence.join(' → ')}`);

        // Update visual feedback
        this.updateSequenceDisplay();

        // Clear sequence after timeout (2 seconds of inactivity)
        if (this.sequenceTimeout) {
            clearTimeout(this.sequenceTimeout);
        }
        this.sequenceTimeout = setTimeout(() => {
            this.startSequence = [];
            this.updateSequenceDisplay();
        }, 2000);

        // Check if sequence matches
        const currentLength = this.startSequence.length;
        const expectedColor = this.requiredSequence[currentLength - 1];

        if (color !== expectedColor) {
            // Wrong color, reset sequence
            this.startSequence = [];
            this.updateSequenceDisplay();
            return;
        }

        // Check if complete
        if (this.startSequence.length === this.requiredSequence.length) {
            console.log('[Renderer] Start sequence complete!');
            this.startSequence = [];
            this.startGame();
        }
    }

    /**
     * Update visual display of sequence progress
     */
    updateSequenceDisplay() {
        const instruction = document.querySelector('.lobby-instruction');
        if (!instruction) return;

        const joinedCount = document.querySelectorAll('.player-slot.joined').length;

        if (joinedCount === 0) {
            instruction.textContent = 'PRESS 🔴 RED BUZZER TO JOIN';
        } else if (this.startSequence.length === 0) {
            instruction.innerHTML = 'TO START: 🔵→🟠→🟢→🟡';
        } else {
            const icons = ['🔵', '🟠', '🟢', '🟡'];
            const progress = this.startSequence.map((_, i) => `<span style="opacity:0.3">${icons[i]}</span>`).join('');
            const remaining = icons.slice(this.startSequence.length).join('→');
            instruction.innerHTML = `${progress} ${remaining}`;
        }
    }

    /**
     * Use sample data if quiz.json doesn't exist
     */
    useSampleData() {
        const sampleQuiz = {
            quizTitle: "Retro Arcade Trivia",
            questions: [
                {
                    id: 1,
                    question: "What was the most popular arcade game of 1982?",
                    answers: {
                        blue: "Pac-Man",
                        orange: "Donkey Kong",
                        green: "Space Invaders",
                        yellow: "Galaga"
                    },
                    correct: "blue",
                    points: 100
                }
            ]
        };

        window.quizEngine.quiz = sampleQuiz;
        window.quizEngine.questions = sampleQuiz.questions;
        window.quizEngine.totalQuestions = sampleQuiz.questions.length;
    }

    /**
     * Display a question
     */
    displayQuestion(question) {
        if (!question) return;

        // Clear selection
        this.clearSelection();

        // Make sure answer buttons are visible
        this.answerButtons.forEach(btn => {
            btn.style.visibility = 'visible';
            btn.style.opacity = '1';
        });

        // Update question text with animation
        this.elements.questionText.classList.add('animate-slide-in');
        this.elements.questionText.textContent = question.question;

        // Update answers
        this.elements.answerBlue.textContent = question.answers.blue;
        this.elements.answerOrange.textContent = question.answers.orange;
        this.elements.answerGreen.textContent = question.answers.green;
        this.elements.answerYellow.textContent = question.answers.yellow;

        // Animate buttons in sequence
        this.answerButtons.forEach((btn, i) => {
            btn.style.opacity = '0';
            setTimeout(() => {
                btn.style.opacity = '1';
                btn.classList.add(i % 2 === 0 ? 'animate-slide-left' : 'animate-slide-right');
            }, 100 + i * 100);
        });

        // Remove animation classes after they play
        setTimeout(() => {
            this.elements.questionText.classList.remove('animate-slide-in');
            this.answerButtons.forEach(btn => {
                btn.classList.remove('animate-slide-left', 'animate-slide-right');
            });
        }, 600);
    }

    /**
     * Update progress display
     */
    updateProgress() {
        const progress = window.quizEngine.getProgress();

        this.elements.questionNumber.textContent = String(progress.current).padStart(2, '0');
        this.elements.qCurrent.textContent = String(progress.current).padStart(2, '0');
        this.elements.qTotal.textContent = String(progress.total).padStart(2, '0');
    }

    /**
     * Handle answer selection
     */
    selectAnswer(color) {
        if (this.currentScreen !== 'game') return;

        // Clear previous selection
        this.clearSelection();

        // Set new selection
        this.selectedAnswer = color;

        const button = document.querySelector(`.answer-btn.${color}`);
        if (button) {
            button.classList.add('selected', 'animate-shake');

            // Tell game state
            window.gameState.selectAnswer('player1', color);

            setTimeout(() => {
                button.classList.remove('animate-shake');
            }, 300);
        }
    }

    /**
     * Clear answer selection
     */
    clearSelection() {
        this.selectedAnswer = null;
        this.answerButtons.forEach(btn => {
            btn.classList.remove('selected');
        });
    }

    /**
     * Submit the current answer
     */
    submitAnswer() {
        if (this.currentScreen !== 'game') return;

        if (!this.selectedAnswer) {
            // Visual feedback - shake submit button
            this.elements.submitBtn.classList.add('animate-shake');
            setTimeout(() => {
                this.elements.submitBtn.classList.remove('animate-shake');
            }, 300);
            return;
        }

        // Check answer
        const result = window.quizEngine.checkAnswer(this.selectedAnswer);

        if (result.correct) {
            this.stats.correctAnswers++;
            this.showCorrectFeedback(this.selectedAnswer);
            window.gameState.verifyAnswer(true, result.points);

            // Track best combo
            const currentCombo = window.gameState.getCombo('player1');
            if (currentCombo > this.stats.bestCombo) {
                this.stats.bestCombo = currentCombo;
            }
        } else {
            this.showWrongFeedback(this.selectedAnswer, result.correctAnswer);
            window.gameState.verifyAnswer(false, 0);
        }

        // Update score display
        this.updateScore();

        // Move to next question after delay
        setTimeout(() => {
            if (window.quizEngine.hasMoreQuestions()) {
                window.quizEngine.nextQuestion();
                this.displayQuestion(window.quizEngine.getCurrentQuestion());
                this.updateProgress();
                window.gameState.resetRound();
                window.gameState.setState(window.gameState.STATES.QUESTION_REVEAL);
            } else {
                this.showGameOver();
            }
        }, 1500);
    }

    /**
     * Show correct answer feedback
     */
    showCorrectFeedback(color) {
        const button = document.querySelector(`.answer-btn.${color}`);
        if (button) {
            button.classList.add('animate-correct');
            setTimeout(() => button.classList.remove('animate-correct'), 1500);
        }

        // Pulse the score
        this.elements.player1Score.classList.add('animate-big-pulse');
        setTimeout(() => {
            this.elements.player1Score.classList.remove('animate-big-pulse');
        }, 600);
    }

    /**
     * Show wrong answer feedback
     */
    showWrongFeedback(selectedColor, correctColor) {
        const wrongButton = document.querySelector(`.answer-btn.${selectedColor}`);
        const correctButton = document.querySelector(`.answer-btn.${correctColor}`);

        if (wrongButton) {
            wrongButton.classList.add('animate-wrong');
            setTimeout(() => wrongButton.classList.remove('animate-wrong'), 1000);
        }

        if (correctButton) {
            setTimeout(() => {
                correctButton.classList.add('animate-correct');
                setTimeout(() => correctButton.classList.remove('animate-correct'), 1500);
            }, 500);
        }
    }

    /**
     * Update score display
     */
    updateScore() {
        const score = window.gameState.getScore('player1');
        const combo = window.gameState.getCombo('player1');

        this.elements.player1Score.textContent = score.toLocaleString();
        this.elements.combo.textContent = `COMBO x${Math.max(1, combo)}`;

        // Check for new hi-score
        if (score > window.gameState.getHiScore()) {
            this.elements.hiScore.textContent = score.toLocaleString();
            this.elements.hiScore.classList.add('animate-glow');
        }
    }

    /**
     * Update hi-score display
     */
    updateHiScore() {
        this.elements.hiScore.textContent = window.gameState.getHiScore().toLocaleString();
    }

    /**
     * Update timer display
     */
    updateTimer(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.elements.timer.textContent = `${mins}:${String(secs).padStart(2, '0')}`;

        // Warning animation when low
        if (seconds <= 10) {
            this.elements.timer.classList.add('animate-timer-warning');
        } else {
            this.elements.timer.classList.remove('animate-timer-warning');
        }
    }

    /**
     * Show game over screen
     */
    showGameOver() {
        window.gameState.setState(window.gameState.STATES.GAME_OVER);
        window.gameState.saveHiScore();

        // Update final score display
        const finalScore = window.gameState.getScore('player1');
        this.elements.finalScore.textContent = finalScore.toLocaleString();

        // Update stats
        this.elements.statQuestions.textContent = this.stats.totalQuestions;
        this.elements.statCorrect.textContent = this.stats.correctAnswers;
        this.elements.statCombo.textContent = `x${Math.max(1, this.stats.bestCombo)}`;

        // Show game over screen
        this.showScreen('gameOver');
    }

    /**
     * Restart game
     */
    restartGame() {
        // Reset player slots
        Object.values(this.playerSlots).forEach(slot => {
            slot.classList.remove('joined');
            slot.querySelector('.slot-status').textContent = 'Press 🔴 to join';
        });

        // Go back to lobby
        this.showScreen('lobby');
    }

    // ====================
    // Event Listeners
    // ====================

    setupButtonListeners() {
        // Answer buttons
        this.answerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                this.selectAnswer(color);
            });
        });

        // Submit button
        this.elements.submitBtn.addEventListener('click', () => {
            this.submitAnswer();
        });

        // Play again button
        if (this.elements.playAgainBtn) {
            this.elements.playAgainBtn.addEventListener('click', () => {
                this.restartGame();
            });
        }

        // Hint button
        this.elements.hintBtn.addEventListener('click', () => {
            console.log('[Renderer] Hint requested');
        });

        // Skip button
        this.elements.skipBtn.addEventListener('click', () => {
            if (window.quizEngine.hasMoreQuestions()) {
                window.quizEngine.nextQuestion();
                this.displayQuestion(window.quizEngine.getCurrentQuestion());
                this.updateProgress();
                window.gameState.resetRound();
            }
        });
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // Handle lobby screen
            if (this.currentScreen === 'lobby') {
                // J = Join as player 1
                if (e.key.toLowerCase() === 'j') {
                    this.playerJoin('player1');
                    return;
                }
                // Color keys for start sequence
                const keyMap = {
                    'b': 'blue', '1': 'blue', 'o': 'orange', '2': 'orange',
                    'g': 'green', '3': 'green', 'y': 'yellow', '4': 'yellow'
                };
                const color = keyMap[e.key.toLowerCase()];
                if (color) {
                    this.handleStartSequence(color);
                }
                return;
            }

            if (this.currentScreen === 'gameOver') {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.restartGame();
                }
                return;
            }

            // Game controls
            switch (e.key.toLowerCase()) {
                case '1':
                case 'b':
                    this.selectAnswer('blue');
                    break;
                case '2':
                case 'o':
                    this.selectAnswer('orange');
                    break;
                case '3':
                case 'g':
                    this.selectAnswer('green');
                    break;
                case '4':
                case 'y':
                    this.selectAnswer('yellow');
                    break;
                case 'enter':
                case ' ':
                    e.preventDefault();
                    this.submitAnswer();
                    break;
            }

            // Fullscreen toggle (works on all screens)
            if (e.key === 'F11') {
                e.preventDefault();
                if (window.electronAPI) {
                    window.electronAPI.toggleFullscreen();
                }
            }

            // TV mode toggle
            if (e.key === 't' && e.ctrlKey) {
                document.body.classList.toggle('tv-mode');
            }
        });
    }

    setupGameStateListeners() {
        window.gameState.on('timerUpdate', ({ value }) => {
            this.updateTimer(value);
        });

        window.gameState.on('timeUp', () => {
            this.elements.questionText.textContent = "⏰ TIME'S UP!";
        });
    }

    setupGamepadListeners() {
        window.gamepadManager.on('buttonPress', ({ player, color }) => {
            console.log(`[Renderer] Gamepad: ${player} pressed ${color}`);

            // Handle lobby
            if (this.currentScreen === 'lobby') {
                if (color === 'red') {
                    this.playerJoin(player);
                } else if (['blue', 'orange', 'green', 'yellow'].includes(color)) {
                    this.handleStartSequence(color);
                }
                return;
            }

            // Handle game over
            if (this.currentScreen === 'gameOver') {
                if (color === 'red') {
                    this.restartGame();
                }
                return;
            }

            // Game controls
            if (['blue', 'orange', 'green', 'yellow'].includes(color)) {
                this.selectAnswer(color);
            }

            if (color === 'red') {
                this.submitAnswer();
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.renderer = new GameRenderer();
});
