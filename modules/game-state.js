/**
 * Game State Manager
 * Handles the game state machine, scoring, and player management
 * 
 * States:
 *   LOBBY -> QUESTION_REVEAL -> ANSWERING -> VERIFICATION -> SCOREBOARD -> (repeat or END)
 */

class GameState {
    constructor() {
        // State constants
        this.STATES = {
            LOBBY: 'LOBBY',
            QUESTION_REVEAL: 'QUESTION_REVEAL',
            ANSWERING: 'ANSWERING',       // Players selecting answers
            VERIFICATION: 'VERIFICATION', // Showing correct answer
            SCOREBOARD: 'SCOREBOARD',
            GAME_OVER: 'GAME_OVER'
        };

        this.currentState = this.STATES.LOBBY;

        // Player data
        this.players = {
            player1: { joined: false, score: 0, lives: 3, combo: 0, selection: null, lockedIn: false },
            player2: { joined: false, score: 0, lives: 3, combo: 0, selection: null, lockedIn: false },
            player3: { joined: false, score: 0, lives: 3, combo: 0, selection: null, lockedIn: false },
            player4: { joined: false, score: 0, lives: 3, combo: 0, selection: null, lockedIn: false }
        };

        // Game settings
        this.settings = {
            timePerQuestion: 30,       // seconds
            buzzInBonus: 50,           // Extra points for first correct buzz-in
            buzzInPenalty: 50,         // Points lost for wrong first buzz-in
            pointsCorrect: 100,
            pointsWrong: 0,
            comboMultiplier: true
        };

        // Current round data
        this.round = {
            firstBuzzPlayer: null,     // Who buzzed in first
            firstBuzzTime: null,       // When they buzzed
            timerValue: 30,
            timerInterval: null,
            correctAnswer: null        // Set when question is shown
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
                this.resetRoundSelections();
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
        if (this.players[playerKey]) {
            this.players[playerKey].joined = true;
            this.players[playerKey].score = 0;
            this.players[playerKey].lives = 3;
            this.players[playerKey].combo = 0;
            this.players[playerKey].selection = null;
            this.players[playerKey].lockedIn = false;

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
     * Get count of joined players
     */
    getJoinedPlayerCount() {
        return this.getJoinedPlayers().length;
    }

    /**
     * Player buzzes in (presses red button to claim the question)
     */
    buzzIn(playerKey) {
        if (this.currentState !== this.STATES.ANSWERING &&
            this.currentState !== this.STATES.QUESTION_REVEAL) {
            return false;
        }

        const player = this.players[playerKey];
        if (!player || !player.joined) return false;

        // Track first buzz-in
        if (!this.round.firstBuzzPlayer) {
            this.round.firstBuzzPlayer = playerKey;
            this.round.firstBuzzTime = Date.now();
            console.log(`[GameState] 🔔 ${playerKey} BUZZED IN FIRST!`);
            this.emit('firstBuzz', { player: playerKey });
            return true;
        }

        return false; // Someone already buzzed
    }

    /**
     * Handle answer selection (player picks a color)
     */
    selectAnswer(playerKey, color) {
        if (this.currentState !== this.STATES.ANSWERING &&
            this.currentState !== this.STATES.QUESTION_REVEAL) {
            return false;
        }

        const player = this.players[playerKey];
        if (!player || !player.joined || player.lockedIn) return false;

        // Update selection (can change until locked in)
        player.selection = color;

        console.log(`[GameState] ${playerKey} selected ${color}`);
        this.emit('answerSelected', { player: playerKey, color });

        return true;
    }

    /**
     * Lock in answer (player presses red to confirm)
     */
    lockInAnswer(playerKey) {
        if (this.currentState !== this.STATES.ANSWERING &&
            this.currentState !== this.STATES.QUESTION_REVEAL) {
            return false;
        }

        const player = this.players[playerKey];
        if (!player || !player.joined || !player.selection) return false;

        if (player.lockedIn) return false; // Already locked

        player.lockedIn = true;

        console.log(`[GameState] ${playerKey} LOCKED IN: ${player.selection}`);
        this.emit('answerLockedIn', { player: playerKey, color: player.selection });

        // Check if all players are locked in
        if (this.areAllPlayersLockedIn()) {
            this.emit('allPlayersLockedIn', {});
        }

        return true;
    }

    /**
     * Check if all joined players have locked in
     */
    areAllPlayersLockedIn() {
        const joined = this.getJoinedPlayers();
        return joined.length > 0 && joined.every(p => p.lockedIn);
    }

    /**
     * Get all player selections for display
     */
    getPlayerSelections() {
        const result = {};
        for (const [key, player] of Object.entries(this.players)) {
            if (player.joined && player.selection) {
                result[key] = {
                    color: player.selection,
                    lockedIn: player.lockedIn
                };
            }
        }
        return result;
    }

    /**
     * Verify all answers and award points
     */
    verifyAllAnswers(correctColor) {
        this.round.correctAnswer = correctColor;
        const results = [];

        for (const [playerKey, player] of Object.entries(this.players)) {
            if (!player.joined) continue;

            const isCorrect = player.selection === correctColor;
            const isFirstBuzz = this.round.firstBuzzPlayer === playerKey;

            let pointsEarned = 0;
            let bonusApplied = false;
            let penaltyApplied = false;

            if (player.selection) {
                if (isCorrect) {
                    // Base points
                    pointsEarned = this.settings.pointsCorrect;

                    // Combo multiplier
                    player.combo++;
                    const multiplier = this.settings.comboMultiplier ?
                        Math.min(player.combo, 5) : 1;
                    pointsEarned *= multiplier;

                    // First buzz bonus
                    if (isFirstBuzz) {
                        pointsEarned += this.settings.buzzInBonus;
                        bonusApplied = true;
                    }

                    player.score += pointsEarned;
                } else {
                    // Wrong answer
                    player.combo = 0;

                    // First buzz penalty
                    if (isFirstBuzz) {
                        pointsEarned = -this.settings.buzzInPenalty;
                        player.score = Math.max(0, player.score + pointsEarned);
                        penaltyApplied = true;
                    }
                }
            } else {
                // Didn't answer
                player.combo = 0;
            }

            results.push({
                player: playerKey,
                selection: player.selection,
                isCorrect,
                isFirstBuzz,
                pointsEarned,
                bonusApplied,
                penaltyApplied,
                newScore: player.score,
                combo: player.combo
            });
        }

        console.log('[GameState] Round results:', results);
        this.emit('roundResults', { correctColor, results });

        return results;
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
     * Reset round selections (keep timer running)
     */
    resetRoundSelections() {
        this.round.firstBuzzPlayer = null;
        this.round.firstBuzzTime = null;
        this.round.correctAnswer = null;

        for (const player of Object.values(this.players)) {
            player.selection = null;
            player.lockedIn = false;
        }
    }

    /**
     * Reset round data for next question
     */
    resetRound() {
        this.stopTimer();
        this.resetRoundSelections();
        this.round.timerValue = this.settings.timePerQuestion;
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
            player.selection = null;
            player.lockedIn = false;
            // Note: don't reset 'joined' here, that happens in lobby reset
        }
        this.resetRound();
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
