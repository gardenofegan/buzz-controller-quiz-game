/**
 * Quiz Engine - Loads and manages quiz content
 * Reads quiz.json and provides question sequencing
 */

class QuizEngine {
    constructor() {
        this.quiz = null;
        this.questions = [];
        this.currentIndex = 0;
        this.totalQuestions = 0;
    }

    /**
     * Load quiz from JSON file
     * @param {string} path - Path to quiz.json file
     */
    async load(path = 'quiz.json') {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load quiz: ${response.status}`);
            }

            this.quiz = await response.json();
            this.questions = this.quiz.questions || [];
            this.totalQuestions = this.questions.length;
            this.currentIndex = 0;

            console.log(`[QuizEngine] Loaded "${this.quiz.quizTitle}" with ${this.totalQuestions} questions`);

            return this.quiz;
        } catch (error) {
            console.error('[QuizEngine] Error loading quiz:', error);
            throw error;
        }
    }

    /**
     * Get the current question
     */
    getCurrentQuestion() {
        if (this.currentIndex < 0 || this.currentIndex >= this.questions.length) {
            return null;
        }
        return this.questions[this.currentIndex];
    }

    /**
     * Move to the next question
     */
    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            return this.getCurrentQuestion();
        }
        return null; // No more questions
    }

    /**
     * Move to the previous question
     */
    previousQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return this.getCurrentQuestion();
        }
        return null;
    }

    /**
     * Jump to a specific question by index
     */
    goToQuestion(index) {
        if (index >= 0 && index < this.questions.length) {
            this.currentIndex = index;
            return this.getCurrentQuestion();
        }
        return null;
    }

    /**
     * Check if an answer is correct
     * @param {string} selectedColor - 'blue', 'orange', 'green', or 'yellow'
     */
    checkAnswer(selectedColor) {
        const question = this.getCurrentQuestion();
        if (!question) return null;

        const isCorrect = question.correct === selectedColor;

        return {
            correct: isCorrect,
            correctAnswer: question.correct,
            selectedAnswer: selectedColor,
            points: isCorrect ? question.points : 0
        };
    }

    /**
     * Get progress information
     */
    getProgress() {
        return {
            current: this.currentIndex + 1,
            total: this.totalQuestions,
            percentage: Math.round(((this.currentIndex + 1) / this.totalQuestions) * 100)
        };
    }

    /**
     * Check if there are more questions
     */
    hasMoreQuestions() {
        return this.currentIndex < this.questions.length - 1;
    }

    /**
     * Reset to the beginning
     */
    reset() {
        this.currentIndex = 0;
    }

    /**
     * Shuffle questions for variety
     */
    shuffle() {
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }
        this.currentIndex = 0;
    }

    /**
     * Get quiz title
     */
    getTitle() {
        return this.quiz?.quizTitle || 'Quiz';
    }
}

// Create global instance
window.quizEngine = new QuizEngine();
