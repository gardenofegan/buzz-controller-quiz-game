/**
 * Main Renderer - UI Controller
 * Handles DOM updates, user interactions, and coordinates modules
 * Supports up to 4 players with buzz-in racing
 */

class GameRenderer {
    constructor() {
        // DOM Elements
        this.elements = {
            // Question
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

            // First buzz banner

            // Lock-in status
            lockinStatus: document.getElementById('lockin-status'),

            // Buttons
            playAgainBtn: document.getElementById('play-again-btn'),

            // Screens
            lobbyScreen: document.getElementById('lobby-screen'),
            gameOverScreen: document.getElementById('game-over-screen'),
            gameContainer: document.querySelector('.game-container'),

            // Game over
            finalScores: document.getElementById('final-scores'),
            statQuestions: document.getElementById('stat-questions'),
            statCorrect: document.getElementById('stat-correct'),
            statCombo: document.getElementById('stat-combo'),

            // Countdown overlay
            countdownOverlay: document.getElementById('countdown-overlay'),
            countdownNumber: document.getElementById('countdown-number')
        };

        // Player score boxes
        this.scoreBoxes = {
            player1: document.getElementById('scorebox-p1'),
            player2: document.getElementById('scorebox-p2'),
            player3: document.getElementById('scorebox-p3'),
            player4: document.getElementById('scorebox-p4')
        };

        // Player score displays
        this.scoreDisplays = {
            player1: document.getElementById('score-p1'),
            player2: document.getElementById('score-p2'),
            player3: document.getElementById('score-p3'),
            player4: document.getElementById('score-p4')
        };

        // Player status displays
        this.statusDisplays = {
            player1: document.getElementById('status-p1'),
            player2: document.getElementById('status-p2'),
            player3: document.getElementById('status-p3'),
            player4: document.getElementById('status-p4')
        };

        // Lock-in dots
        this.lockinDots = {
            player1: document.getElementById('lockin-p1'),
            player2: document.getElementById('lockin-p2'),
            player3: document.getElementById('lockin-p3'),
            player4: document.getElementById('lockin-p4')
        };

        // Player slot elements (lobby)
        this.playerSlots = {
            player1: document.getElementById('slot-p1'),
            player2: document.getElementById('slot-p2'),
            player3: document.getElementById('slot-p3'),
            player4: document.getElementById('slot-p4')
        };

        // Player name inputs (lobby)
        this.nameInputs = {
            player1: document.getElementById('name-p1'),
            player2: document.getElementById('name-p2'),
            player3: document.getElementById('name-p3'),
            player4: document.getElementById('name-p4')
        };

        // Player label elements in HUD
        this.playerLabels = {
            player1: document.querySelector('#scorebox-p1 .player-label'),
            player2: document.querySelector('#scorebox-p2 .player-label'),
            player3: document.querySelector('#scorebox-p3 .player-label'),
            player4: document.querySelector('#scorebox-p4 .player-label')
        };

        // Answer button elements
        this.answerButtons = document.querySelectorAll('.answer-btn');

        // Player indicator containers on answer buttons
        this.playerIndicatorRows = {
            blue: document.querySelector('.player-indicators-row[data-color="blue"]'),
            orange: document.querySelector('.player-indicators-row[data-color="orange"]'),
            green: document.querySelector('.player-indicators-row[data-color="green"]'),
            yellow: document.querySelector('.player-indicators-row[data-color="yellow"]')
        };

        // Game stats
        this.stats = {
            correctAnswers: 0,
            totalQuestions: 0,
            bestCombo: 0
        };

        // Current screen state
        this.currentScreen = 'lobby';

        // Start sequence tracking
        this.startSequence = [];
        this.requiredSequence = ['blue', 'orange', 'green', 'yellow'];
        this.sequenceTimeout = null;

        // Current question data
        this.currentQuestion = null;

        this.init();
    }

    async init() {
        console.log('[Renderer] Initializing...');

        this.setupButtonListeners();
        this.setupKeyboardListeners();
        this.setupGameStateListeners();
        this.setupGamepadListeners();

        try {
            await window.quizEngine.load('quiz.json');
        } catch (error) {
            console.warn('[Renderer] Could not load quiz.json, using sample data');
            this.useSampleData();
        }

        this.showScreen('lobby');
        console.log('[Renderer] Ready!');
    }

    // ==================== SCREEN MANAGEMENT ====================

    showScreen(screen) {
        this.currentScreen = screen;

        this.elements.lobbyScreen.classList.add('hidden');
        this.elements.gameOverScreen.classList.add('hidden');
        this.elements.gameContainer.style.display = 'none';

        switch (screen) {
            case 'lobby':
                this.elements.lobbyScreen.classList.remove('hidden');
                break;
            case 'game':
                this.elements.gameContainer.style.display = 'flex';
                this.updateScoreboardVisibility();
                break;
            case 'gameOver':
                this.elements.gameOverScreen.classList.remove('hidden');
                break;
        }
    }

    // ==================== GAME FLOW ====================

    getPlayerName(playerKey) {
        const input = this.nameInputs[playerKey];
        const defaultName = `P${playerKey.replace('player', '')}`;
        return input && input.value.trim() ? input.value.trim() : defaultName;
    }

    updateHUDLabels() {
        Object.entries(this.playerLabels).forEach(([key, label]) => {
            if (label) {
                label.textContent = this.getPlayerName(key);
            }
        });
    }

    startGame() {
        console.log('[Renderer] Starting game...');

        this.stats = {
            correctAnswers: 0,
            totalQuestions: window.quizEngine.totalQuestions,
            bestCombo: 0
        };

        window.quizEngine.reset();
        window.gameState.resetGame();

        // Re-join all players that were in lobby
        Object.entries(this.playerSlots).forEach(([key, slot]) => {
            if (slot.classList.contains('joined')) {
                window.gameState.playerJoin(key);
            }
        });

        this.showScreen('game');
        this.updateHUDLabels();  // Set player names in HUD
        this.displayQuestion(window.quizEngine.getCurrentQuestion());
        this.updateProgress();
        this.updateAllScores();

        window.gameState.setState(window.gameState.STATES.QUESTION_REVEAL);
    }

    playerJoin(playerKey) {
        if (this.currentScreen !== 'lobby') return;

        const slot = this.playerSlots[playerKey];
        if (slot && !slot.classList.contains('joined')) {
            slot.classList.add('joined');
            slot.querySelector('.slot-status').textContent = 'READY!';
            console.log(`[Renderer] ${playerKey} joined!`);
            this.updateSequenceDisplay();

            // LED: Light up in lobby to show who's joined
            const playerNum = parseInt(playerKey.replace('player', ''));
            if (window.electronAPI?.led) {
                window.electronAPI.led.set(playerNum, true);
            }
        }
    }

    // ==================== START SEQUENCE ====================

    handleStartSequence(color) {
        if (this.currentScreen !== 'lobby') return;

        const joinedCount = document.querySelectorAll('.player-slot.joined').length;
        if (joinedCount === 0) {
            console.log('[Renderer] No players joined yet!');
            return;
        }

        this.startSequence.push(color);
        console.log(`[Renderer] Start sequence: ${this.startSequence.join(' → ')}`);
        this.updateSequenceDisplay();

        if (this.sequenceTimeout) clearTimeout(this.sequenceTimeout);
        this.sequenceTimeout = setTimeout(() => {
            this.startSequence = [];
            this.updateSequenceDisplay();
        }, 2000);

        const expectedColor = this.requiredSequence[this.startSequence.length - 1];
        if (color !== expectedColor) {
            this.startSequence = [];
            this.updateSequenceDisplay();
            return;
        }

        if (this.startSequence.length === this.requiredSequence.length) {
            console.log('[Renderer] Start sequence complete!');
            this.startSequence = [];
            this.startGame();
        }
    }

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

    // ==================== SCOREBOARD ====================

    updateScoreboardVisibility() {
        const joined = window.gameState.getJoinedPlayers();
        const joinedKeys = joined.map(p => p.key);

        Object.entries(this.scoreBoxes).forEach(([key, box]) => {
            if (joinedKeys.includes(key)) {
                box.classList.add('active');
            } else {
                box.classList.remove('active');
            }
        });

        // Also update lock-in dots visibility
        Object.entries(this.lockinDots).forEach(([key, dot]) => {
            if (joinedKeys.includes(key)) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    updateAllScores() {
        const joined = window.gameState.getJoinedPlayers();

        joined.forEach(player => {
            const display = this.scoreDisplays[player.key];
            if (display) {
                display.textContent = player.score.toLocaleString();
            }
        });
    }

    updatePlayerStatuses() {
        const joined = window.gameState.getJoinedPlayers();

        joined.forEach(player => {
            const statusEl = this.statusDisplays[player.key];
            const lockinDot = this.lockinDots[player.key];
            if (!statusEl) return;

            // Reset classes
            statusEl.className = 'player-status';
            lockinDot?.classList.remove('locked');

            if (player.lockedIn) {
                statusEl.textContent = '✓ LOCKED';
                statusEl.classList.add('locked');
                lockinDot?.classList.add('locked');
            } else if (player.selection) {
                statusEl.textContent = 'SELECTING...';
                statusEl.classList.add('selecting');
            } else {
                statusEl.textContent = '';
            }
        });
    }



    displayQuestion(question) {
        if (!question) return;

        this.currentQuestion = question;
        this.clearAllPlayerIndicators();
        this.clearAnswerStates();
        this.resetPlayerStatuses();

        // LED: Turn off all LEDs at start of each question
        if (window.electronAPI?.led) {
            window.electronAPI.led.offAll();
        }

        // Make answer buttons visible
        this.answerButtons.forEach(btn => {
            btn.style.visibility = 'visible';
            btn.style.opacity = '1';
            btn.classList.remove('faded', 'correct-reveal', 'selected');
        });

        // Animate question
        this.elements.questionText.classList.add('animate-slide-in');
        this.elements.questionText.textContent = question.question;

        // Update answers
        this.elements.answerBlue.textContent = question.answers.blue;
        this.elements.answerOrange.textContent = question.answers.orange;
        this.elements.answerGreen.textContent = question.answers.green;
        this.elements.answerYellow.textContent = question.answers.yellow;

        // Animate buttons
        this.answerButtons.forEach((btn, i) => {
            btn.style.opacity = '0';
            setTimeout(() => {
                btn.style.opacity = '1';
                btn.classList.add(i % 2 === 0 ? 'animate-slide-left' : 'animate-slide-right');
            }, 100 + i * 100);
        });

        setTimeout(() => {
            this.elements.questionText.classList.remove('animate-slide-in');
            this.answerButtons.forEach(btn => {
                btn.classList.remove('animate-slide-left', 'animate-slide-right');
            });
        }, 600);
    }

    resetPlayerStatuses() {
        Object.values(this.statusDisplays).forEach(el => {
            if (el) {
                el.textContent = '';
                el.className = 'player-status';
            }
        });
        Object.values(this.lockinDots).forEach(dot => {
            if (dot) dot.classList.remove('locked');
        });
    }

    updateProgress() {
        const progress = window.quizEngine.getProgress();
        this.elements.qCurrent.textContent = String(progress.current).padStart(2, '0');
        this.elements.qTotal.textContent = String(progress.total).padStart(2, '0');
    }

    // ==================== ANSWER HANDLING (MULTIPLAYER) ====================

    // buzzIn is no longer used - all questions are open to everyone

    selectAnswer(playerKey, color) {
        if (this.currentScreen !== 'game') return;

        const success = window.gameState.selectAnswer(playerKey, color);
        if (success) {
            this.updatePlayerIndicators();
            this.updatePlayerStatuses();
        }
    }

    lockInAnswer(playerKey) {
        if (this.currentScreen !== 'game') return;

        const success = window.gameState.lockInAnswer(playerKey);
        if (success) {
            this.updatePlayerIndicators();
            this.updatePlayerStatuses();

            // LED: Turn ON when player locks in
            const playerNum = parseInt(playerKey.replace('player', ''));
            if (window.electronAPI?.led) {
                window.electronAPI.led.set(playerNum, true);
            }

            // Check if all players locked in
            if (window.gameState.areAllPlayersLockedIn()) {
                this.revealAnswer();
            }
        }
    }

    updatePlayerIndicators() {
        this.clearAllPlayerIndicators();

        const selections = window.gameState.getPlayerSelections();

        for (const [playerKey, data] of Object.entries(selections)) {
            const row = this.playerIndicatorRows[data.color];
            if (row) {
                const indicator = document.createElement('div');
                const playerNum = playerKey.replace('player', '');
                indicator.className = `player-indicator p${playerNum}`;
                indicator.textContent = `P${playerNum}`;

                if (data.lockedIn) {
                    indicator.classList.add('locked');
                }

                row.appendChild(indicator);
            }
        }
    }

    clearAllPlayerIndicators() {
        Object.values(this.playerIndicatorRows).forEach(row => {
            if (row) row.innerHTML = '';
        });
    }

    clearAnswerStates() {
        this.answerButtons.forEach(btn => {
            btn.classList.remove('selected', 'faded', 'correct-reveal');
        });
    }

    // ==================== ANSWER REVEAL ====================

    revealAnswer() {
        if (!this.currentQuestion) return;

        const correctColor = this.currentQuestion.correct;
        console.log(`[Renderer] Revealing answer: ${correctColor}`);

        // Get results from game state
        const results = window.gameState.verifyAllAnswers(correctColor);

        // Update stats
        const anyCorrect = results.some(r => r.isCorrect);
        if (anyCorrect) this.stats.correctAnswers++;

        // Track best combo
        const maxCombo = Math.max(...results.map(r => r.combo));
        if (maxCombo > this.stats.bestCombo) {
            this.stats.bestCombo = maxCombo;
        }

        // Visual reveal
        this.answerButtons.forEach(btn => {
            const btnColor = btn.dataset.color;
            if (btnColor === correctColor) {
                btn.classList.add('correct-reveal');
            } else {
                btn.classList.add('faded');
            }
        });

        // Update scores
        this.updateAllScores();

        // Move to next question after delay
        setTimeout(() => {
            // Reset LEDs to "joined" state (solid on for joined players)
            this.resetLEDsToJoined();

            if (window.quizEngine.hasMoreQuestions()) {
                window.quizEngine.nextQuestion();
                this.showCountdown(() => {
                    this.displayQuestion(window.quizEngine.getCurrentQuestion());
                    this.updateProgress();
                    window.gameState.resetRound();
                    window.gameState.setState(window.gameState.STATES.QUESTION_REVEAL);
                });
            } else {
                this.showGameOver();
            }
        }, 4000);  // 4 seconds to see the correct answer
    }

    // ==================== COUNTDOWN ====================

    showCountdown(callback) {
        let count = 3;
        this.elements.countdownNumber.textContent = count;
        this.elements.countdownOverlay.classList.remove('hidden');

        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                this.elements.countdownNumber.textContent = count;
                // Re-trigger animation
                this.elements.countdownNumber.style.animation = 'none';
                void this.elements.countdownNumber.offsetWidth; // Force reflow
                this.elements.countdownNumber.style.animation = 'countdownPop 0.8s ease-out';
            } else {
                clearInterval(interval);
                this.elements.countdownOverlay.classList.add('hidden');
                if (callback) callback();
            }
        }, 1000);
    }

    resetLEDsToJoined() {
        // LEDs should be OFF during countdown/between questions
        if (window.electronAPI?.led) {
            window.electronAPI.led.offAll();
        }
    }

    updateTimer(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        this.elements.timer.textContent = `${mins}:${String(secs).padStart(2, '0')}`;

        if (seconds <= 10) {
            this.elements.timer.classList.add('animate-timer-warning');
        } else {
            this.elements.timer.classList.remove('animate-timer-warning');
        }
    }

    // ==================== GAME OVER ====================

    showGameOver() {
        window.gameState.setState(window.gameState.STATES.GAME_OVER);
        window.gameState.saveHiScore();

        // Build final scores
        const players = window.gameState.getJoinedPlayers();
        const sorted = players.sort((a, b) => b.score - a.score);

        // LED: Victory sequence for winner
        if (sorted.length > 0 && window.electronAPI?.led) {
            const winnerNum = parseInt(sorted[0].key.replace('player', ''));
            window.electronAPI.led.victory(winnerNum);
        }

        const scoresHTML = sorted.map((player, index) => {
            const rank = index === 0 ? '🏆' : (index === 1 ? '🥈' : (index === 2 ? '🥉' : `#${index + 1}`));
            const playerName = this.getPlayerName(player.key);
            const winnerClass = index === 0 ? 'winner' : '';
            return `
                <div class="final-score-row ${winnerClass}">
                    <span class="rank">${rank}</span>
                    <span class="player-name">${playerName}</span>
                    <span class="final-points">${player.score.toLocaleString()}</span>
                </div>
            `;
        }).join('');

        this.elements.finalScores.innerHTML = scoresHTML;
        this.elements.statQuestions.textContent = this.stats.totalQuestions;
        this.elements.statCorrect.textContent = this.stats.correctAnswers;
        this.elements.statCombo.textContent = `x${Math.max(1, this.stats.bestCombo)}`;

        this.showScreen('gameOver');
    }

    restartGame() {
        // LED: Turn off all LEDs
        if (window.electronAPI?.led) {
            window.electronAPI.led.offAll();
        }

        Object.values(this.playerSlots).forEach(slot => {
            slot.classList.remove('joined');
            slot.querySelector('.slot-status').textContent = 'Press 🔴 to join';
        });

        this.showScreen('lobby');
        this.updateSequenceDisplay();
    }

    useSampleData() {
        const sampleQuiz = {
            quizTitle: "Retro Arcade Trivia",
            questions: [
                {
                    id: 1,
                    question: "What was the most popular arcade game of 1982?",
                    answers: { blue: "Pac-Man", orange: "Donkey Kong", green: "Space Invaders", yellow: "Galaga" },
                    correct: "blue",
                    points: 100
                }
            ]
        };

        window.quizEngine.quiz = sampleQuiz;
        window.quizEngine.questions = sampleQuiz.questions;
        window.quizEngine.totalQuestions = sampleQuiz.questions.length;
    }

    // ==================== EVENT LISTENERS ====================

    setupButtonListeners() {
        this.answerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                this.selectAnswer('player1', color);
            });
        });

        if (this.elements.playAgainBtn) {
            this.elements.playAgainBtn.addEventListener('click', () => {
                this.restartGame();
            });
        }
    }

    setupKeyboardListeners() {
        document.addEventListener('keydown', (e) => {
            // Lobby controls
            if (this.currentScreen === 'lobby') {
                if (e.key.toLowerCase() === 'j') {
                    this.playerJoin('player1');
                    return;
                }
                const keyMap = {
                    'b': 'blue', '1': 'blue', 'o': 'orange', '2': 'orange',
                    'g': 'green', '3': 'green', 'y': 'yellow', '4': 'yellow'
                };
                const color = keyMap[e.key.toLowerCase()];
                if (color) this.handleStartSequence(color);
                return;
            }

            // Game over controls
            if (this.currentScreen === 'gameOver') {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.restartGame();
                }
                return;
            }

            // Game controls
            const keyMap = {
                'b': 'blue', '1': 'blue', 'o': 'orange', '2': 'orange',
                'g': 'green', '3': 'green', 'y': 'yellow', '4': 'yellow'
            };
            const color = keyMap[e.key.toLowerCase()];
            if (color) {
                this.selectAnswer('player1', color);
            }

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.lockInAnswer('player1');
            }

            // Fullscreen
            if (e.key === 'F11') {
                e.preventDefault();
                if (window.electronAPI) window.electronAPI.toggleFullscreen();
            }

            // TV mode
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
            this.revealAnswer();
        });
    }

    setupGamepadListeners() {
        window.gamepadManager.on('buttonPress', ({ player, color }) => {
            console.log(`[Renderer] Gamepad: ${player} pressed ${color}`);

            // Lobby
            if (this.currentScreen === 'lobby') {
                if (color === 'red') {
                    this.playerJoin(player);
                } else if (['blue', 'orange', 'green', 'yellow'].includes(color)) {
                    this.handleStartSequence(color);
                }
                return;
            }

            // Game over
            if (this.currentScreen === 'gameOver') {
                if (color === 'red') this.restartGame();
                return;
            }

            // Game - answer selection per player
            if (['blue', 'orange', 'green', 'yellow'].includes(color)) {
                this.selectAnswer(player, color);
            }

            // Red = lock in answer
            if (color === 'red') {
                const playerData = window.gameState.players[player];
                if (playerData && playerData.selection) {
                    this.lockInAnswer(player);
                }
            }
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.renderer = new GameRenderer();
});
