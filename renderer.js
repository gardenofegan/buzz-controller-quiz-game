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
            skipBtn: document.getElementById('skip-btn')
        };

        // Answer button elements
        this.answerButtons = document.querySelectorAll('.answer-btn');

        // Current selection
        this.selectedAnswer = null;

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
            this.displayQuestion(window.quizEngine.getCurrentQuestion());
            this.updateProgress();
        } catch (error) {
            console.warn('[Renderer] Could not load quiz.json, using sample data');
            this.useSampleData();
        }

        // Update initial UI
        this.updateHiScore();

        // Start game
        window.gameState.setState(window.gameState.STATES.QUESTION_REVEAL);

        console.log('[Renderer] Ready!');
    }

    /**
     * Use sample data if quiz.json doesn't exist
     */
    useSampleData() {
        // Sample question data for testing
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

        this.displayQuestion(window.quizEngine.getCurrentQuestion());
        this.updateProgress();
    }

    /**
     * Display a question
     */
    displayQuestion(question) {
        if (!question) return;

        // Clear selection
        this.clearSelection();

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
            this.showCorrectFeedback(this.selectedAnswer);
            window.gameState.verifyAnswer(true, result.points);
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

        this.elements.questionText.textContent = '🎮 GAME OVER! 🎮';
        this.elements.questionText.classList.add('animate-big-pulse');

        // Hide answer buttons
        this.answerButtons.forEach(btn => {
            btn.style.visibility = 'hidden';
        });
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

        // Hint button
        this.elements.hintBtn.addEventListener('click', () => {
            console.log('[Renderer] Hint requested');
            // TODO: Implement hint logic
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
                    this.submitAnswer();
                    break;
                case 'f11':
                    e.preventDefault();
                    if (window.electronAPI) {
                        window.electronAPI.toggleFullscreen();
                    }
                    break;
            }
        });
    }

    setupGameStateListeners() {
        window.gameState.on('timerUpdate', ({ value }) => {
            this.updateTimer(value);
        });

        window.gameState.on('timeUp', () => {
            // Auto-submit or show time up
            this.elements.questionText.textContent = "⏰ TIME'S UP!";
        });
    }

    setupGamepadListeners() {
        window.gamepadManager.on('buttonPress', ({ player, color }) => {
            console.log(`[Renderer] Gamepad: ${player} pressed ${color}`);

            // Map color buttons to answer selection
            if (['blue', 'orange', 'green', 'yellow'].includes(color)) {
                this.selectAnswer(color);
            }

            // Red button = submit
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
