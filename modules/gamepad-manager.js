/**
 * Gamepad Manager - Buzz Controller Support
 * Handles detection and input from USB Buzz controllers
 * 
 * Buzz controllers appear as a single HID device with 20 buttons:
 * - 4 players x 5 buttons each (Red buzzer + Blue, Orange, Green, Yellow)
 */

class GamepadManager {
    constructor() {
        this.gamepads = {};
        this.connected = false;
        this.listeners = [];

        // Button mapping for Buzz controllers
        // Each player has 5 buttons: Red (buzzer), then 4 answer buttons
        // Physical layout on Buzz controller (top to bottom): Blue, Orange, Green, Yellow
        // BUT the USB reports them in a specific order that may differ
        // We'll add debug logging to help identify the correct mapping
        this.buttonMap = {
            player1: { red: 0, blue: 4, orange: 3, green: 2, yellow: 1 },
            player2: { red: 5, blue: 9, orange: 8, green: 7, yellow: 6 },
            player3: { red: 10, blue: 14, orange: 13, green: 12, yellow: 11 },
            player4: { red: 15, blue: 19, orange: 18, green: 17, yellow: 16 }
        };

        // Reverse map for quick lookup
        this.indexToButton = {};
        for (const [player, buttons] of Object.entries(this.buttonMap)) {
            for (const [color, index] of Object.entries(buttons)) {
                this.indexToButton[index] = { player, color };
            }
        }

        // Track button states to detect press (not hold)
        this.previousStates = {};

        // Bind event handlers
        this.handleConnect = this.handleConnect.bind(this);
        this.handleDisconnect = this.handleDisconnect.bind(this);
        this.pollGamepads = this.pollGamepads.bind(this);

        this.init();
    }

    init() {
        window.addEventListener('gamepadconnected', this.handleConnect);
        window.addEventListener('gamepaddisconnected', this.handleDisconnect);

        // Start polling loop
        this.pollGamepads();

        console.log('[GamepadManager] Initialized. Waiting for Buzz controllers...');
    }

    handleConnect(event) {
        const gamepad = event.gamepad;
        console.log(`[GamepadManager] Controller connected: ${gamepad.id}`);
        console.log(`[GamepadManager] Buttons: ${gamepad.buttons.length}, Axes: ${gamepad.axes.length}`);

        this.gamepads[gamepad.index] = gamepad;
        this.connected = true;
        this.previousStates[gamepad.index] = new Array(gamepad.buttons.length).fill(false);

        this.emit('connected', {
            id: gamepad.id,
            index: gamepad.index,
            buttonCount: gamepad.buttons.length
        });

        this.updateStatusDisplay(true, gamepad.id);
    }

    handleDisconnect(event) {
        const gamepad = event.gamepad;
        console.log(`[GamepadManager] Controller disconnected: ${gamepad.id}`);

        delete this.gamepads[gamepad.index];
        delete this.previousStates[gamepad.index];

        this.connected = Object.keys(this.gamepads).length > 0;

        this.emit('disconnected', { id: gamepad.id, index: gamepad.index });

        if (!this.connected) {
            this.updateStatusDisplay(false);
        }
    }

    pollGamepads() {
        // Get fresh gamepad state (required in some browsers)
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];

        for (const gamepad of gamepads) {
            if (!gamepad) continue;

            const previous = this.previousStates[gamepad.index] || [];

            // Check each button
            for (let i = 0; i < gamepad.buttons.length; i++) {
                const pressed = gamepad.buttons[i].pressed;
                const wasPressed = previous[i] || false;

                // Detect new press (just pressed, not held)
                if (pressed && !wasPressed) {
                    // Debug: log raw button index
                    console.log(`[GamepadManager] Raw button press: index ${i}`);

                    const buttonInfo = this.indexToButton[i];
                    if (buttonInfo) {
                        console.log(`[GamepadManager] Mapped to: ${buttonInfo.player} ${buttonInfo.color}`);
                        this.emit('buttonPress', {
                            player: buttonInfo.player,
                            color: buttonInfo.color,
                            buttonIndex: i,
                            timestamp: Date.now()
                        });
                    }
                }

                // Update previous state
                previous[i] = pressed;
            }

            this.previousStates[gamepad.index] = previous;
        }

        // Continue polling
        requestAnimationFrame(this.pollGamepads);
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

    // UI helper
    updateStatusDisplay(connected, deviceName = '') {
        const statusEl = document.getElementById('gamepad-status');
        if (statusEl) {
            if (connected) {
                statusEl.textContent = `🎮 ${deviceName}`;
                statusEl.classList.add('connected');
            } else {
                statusEl.textContent = '🎮 No controller detected';
                statusEl.classList.remove('connected');
            }
        }
    }

    // Get the current mapping for debugging
    getButtonMap() {
        return this.buttonMap;
    }

    // Test if a specific player/color is currently pressed
    isPressed(player, color) {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        const buttonIndex = this.buttonMap[player]?.[color];

        if (buttonIndex === undefined) return false;

        for (const gamepad of gamepads) {
            if (gamepad && gamepad.buttons[buttonIndex]) {
                return gamepad.buttons[buttonIndex].pressed;
            }
        }

        return false;
    }
}

// Create global instance
window.gamepadManager = new GamepadManager();
