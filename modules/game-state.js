/**
 * Game State Manager
 * Handles the game state machine, scoring, and player management
 * 
 * States:
 *   LOBBY -> QUESTION_REVEAL -> BUZZ_IN -> VERIFICATION -> SCOREBOARD -> (repeat or END)
 */

class GameState {
    constructor() {
        // State constants
        this.STATES = {
            LOBBY: 'LOBBY',
            QUESTION_REVEAL: 'QUESTION_REVEAL',
            BUZZ_IN: 'BUZZ_IN',
            VERIFICATION: 'VERIFICATION',
            SCOREBOARD: 'SCOREBOARD',
            GAME_OVER: 'GAME_OVER'
        };

        this.currentState = this.STATES.LOBBY;

        // Player data
        this.players = {
            player1: { joined: false, score: 0, lives: 3, combo: 0 },
            player2: { joined: false, score: 0, lives: 3, combo: 0 },
            player3: { joined: false, score: 0, lives: 3, combo: 0 },
            player4: { joined: false, score: 0, lives: 3, combo: 0 }
        };

        // Game settings
        this.settings = {
            timePerQuestion: 45, // seconds
            buzzInLockout: 500,   // ms lockout after someone buzzes
            pointsCorrect: 100,
            pointsWrong: 0,
            comboMultiplier: true
        };

        // Current round data
        this.round = {
            selectedAnswer: null,
            buzzedPlayer: null,
            timerValue: 45,
            timerInterval: null,
            locked: false
        };

        // Event listeners
        this.listeners = [];

        // High score
        this.hiScore = parseInt(localStorage.getItem('buzzArcadeHiScore') || '0');
    }

    /**
     * Transition to a new state
     */
    setState(newState) {
        const oldState = this.currentState;
        this.currentState = newState;

        console.log(`[GameState] ${oldState} -> ${newState}`);

        this.emit('stateChange', { from: oldState, to: newState });

        // Handle state-specific logic
        switch (newState) {
            case this.STATES.LOBBY:
                this.resetRound();
                break;
            case this.STATES.QUESTION_REVEAL:
                this.startTimer();
                break;
            case this.STATES.VERIFICATION:
                this.stopTimer();
                break;
            case this.STATES.GAME_OVER:
                this.saveHiScore();
                break;
        }
    }

    /**
     * Player joins the game (press Red buzzer in lobby)
     */
    playerJoin(playerKey) {
        if (this.currentState !== this.STATES.LOBBY) return false;

        if (this.players[playerKey]) {
            this.players[playerKey].joined = true;
            this.players[playerKey].score = 0;
            this.players[playerKey].lives = 3;
            this.players[playerKey].combo = 0;

            console.log(`[GameState] ${playerKey} joined!`);
            this.emit('playerJoined', { player: playerKey });

            return true;
        }
        return false;
    }

    /**
     * Get list of joined players
     */
    getJoinedPlayers() {
        return Object.entries(this.players)
            .filter(([_, data]) => data.joined)
            .map(([key, data]) => ({ key, ...data }));
    }

    /**
     * Handle answer selection
     */
    selectAnswer(playerKey, color) {
        if (this.currentState !== this.STATES.BUZZ_IN &&
            this.currentState !== this.STATES.QUESTION_REVEAL) {
            return false;
        }

        if (this.round.locked) return false;

        // For single player mode or first buzz
        this.round.selectedAnswer = color;
        this.round.buzzedPlayer = playerKey;

        console.log(`[GameState] ${playerKey} selected ${color}`);
        this.emit('answerSelected', { player: playerKey, color });

        return true;
    }

    /**
     * Verify the selected answer
     */
    verifyAnswer(isCorrect, points) {
        const player = this.round.buzzedPlayer || 'player1';

        if (isCorrect) {
            // Apply combo multiplier
            this.players[player].combo++;
            const multiplier = this.settings.comboMultiplier ?
                Math.min(this.players[player].combo, 5) : 1;

            const finalPoints = points * multiplier;
            this.players[player].score += finalPoints;

            console.log(`[GameState] ${player} CORRECT! +${finalPoints} points (x${multiplier} combo)`);
            this.emit('correct', {
                player,
                points: finalPoints,
                combo: this.players[player].combo
            });
        } else {
            // Reset combo on wrong answer
            this.players[player].combo = 0;

            console.log(`[GameState] ${player} WRONG!`);
            this.emit('wrong', { player });
        }

        return {
            player,
            score: this.players[player].score,
            combo: this.players[player].combo
        };
    }

    /**
     * Timer management
     */
    startTimer() {
        this.round.timerValue = this.settings.timePerQuestion;
        this.emit('timerUpdate', { value: this.round.timerValue });

        this.round.timerInterval = setInterval(() => {
            this.round.timerValue--;
            this.emit('timerUpdate', { value: this.round.timerValue });

            if (this.round.timerValue <= 0) {
                this.stopTimer();
                this.emit('timeUp', {});
            }
        }, 1000);
    }

    stopTimer() {
        if (this.round.timerInterval) {
            clearInterval(this.round.timerInterval);
            this.round.timerInterval = null;
        }
    }

    /**
     * Reset round data for next question
     */
    resetRound() {
        this.stopTimer();
        this.round = {
            selectedAnswer: null,
            buzzedPlayer: null,
            timerValue: this.settings.timePerQuestion,
            timerInterval: null,
            locked: false
        };
    }

    /**
     * Get current player score
     */
    getScore(playerKey = 'player1') {
        return this.players[playerKey]?.score || 0;
    }

    /**
     * Get combo for a player
     */
    getCombo(playerKey = 'player1') {
        return this.players[playerKey]?.combo || 0;
    }

    /**
     * Save high score to localStorage
     */
    saveHiScore() {
        const maxScore = Math.max(
            ...Object.values(this.players).map(p => p.score)
        );

        if (maxScore > this.hiScore) {
            this.hiScore = maxScore;
            localStorage.setItem('buzzArcadeHiScore', this.hiScore.toString());
            this.emit('newHiScore', { score: this.hiScore });
        }
    }

    /**
     * Get high score
     */
    getHiScore() {
        return this.hiScore;
    }

    /**
     * Reset game
     */
    resetGame() {
        for (const player of Object.values(this.players)) {
            player.score = 0;
            player.lives = 3;
            player.combo = 0;
        }
        this.resetRound();
        this.setState(this.STATES.LOBBY);
    }

    // Event system
    on(event, callback) {
        this.listeners.push({ event, callback });
    }

    off(event, callback) {
        this.listeners = this.listeners.filter(
            l => l.event !== event || l.callback !== callback
        );
    }

    emit(event, data) {
        for (const listener of this.listeners) {
            if (listener.event === event) {
                listener.callback(data);
            }
        }
    }
}

// Create global instance
window.gameState = new GameState();
