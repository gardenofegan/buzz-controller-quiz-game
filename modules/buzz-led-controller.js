/**
 * Buzz Controller LED Manager
 * Controls the LEDs in PlayStation Buzz controllers via HID output reports
 * 
 * Protocol: 6-byte report [0x00, 0x00, LED1, LED2, LED3, LED4]
 * LED value: 0xFF = on, 0x00 = off
 */

const HID = require('node-hid');

// Sony Buzz Controller USB IDs
const BUZZ_VENDOR_ID = 0x054C;  // Sony
const BUZZ_PRODUCT_IDS = [
    0x1000,  // Wired Buzz (original)
    0x0002,  // Wired Buzz (alternate)
    0x1001   // Wireless Buzz dongle
];

class BuzzLEDController {
    constructor() {
        this.device = null;
        this.ledState = [false, false, false, false];
        this.flashIntervals = {};
    }

    /**
     * Initialize and find the Buzz controller
     */
    init() {
        try {
            const devices = HID.devices();

            // Find Buzz controller
            const buzzDevice = devices.find(d =>
                d.vendorId === BUZZ_VENDOR_ID &&
                BUZZ_PRODUCT_IDS.includes(d.productId)
            );

            if (buzzDevice) {
                console.log('[BuzzLED] Found Buzz controller:', buzzDevice.product);
                this.device = new HID.HID(buzzDevice.path);
                console.log('[BuzzLED] Connected successfully');

                // Turn off all LEDs initially
                this.setAllLEDs(false);
                return true;
            } else {
                console.log('[BuzzLED] No Buzz controller found');
                console.log('[BuzzLED] Available devices:', devices.filter(d => d.vendorId === BUZZ_VENDOR_ID));
                return false;
            }
        } catch (error) {
            console.error('[BuzzLED] Init error:', error.message);
            return false;
        }
    }

    /**
     * Set individual LED states
     * @param {boolean[]} states - Array of 4 boolean values for LEDs 1-4
     */
    setLEDs(states) {
        if (!this.device) return false;

        this.ledState = states.slice(0, 4);

        const report = [
            0x00,  // Report ID
            0x00,  // Padding
            states[0] ? 0xFF : 0x00,  // LED 1
            states[1] ? 0xFF : 0x00,  // LED 2
            states[2] ? 0xFF : 0x00,  // LED 3
            states[3] ? 0xFF : 0x00   // LED 4
        ];

        try {
            this.device.write(report);
            return true;
        } catch (error) {
            console.error('[BuzzLED] Write error:', error.message);
            return false;
        }
    }

    /**
     * Set a single LED
     * @param {number} index - LED index (0-3)
     * @param {boolean} on - LED state
     */
    setLED(index, on) {
        if (index < 0 || index > 3) return false;

        this.ledState[index] = on;
        return this.setLEDs(this.ledState);
    }

    /**
     * Set all LEDs to the same state
     */
    setAllLEDs(on) {
        return this.setLEDs([on, on, on, on]);
    }

    /**
     * Flash a specific LED
     * @param {number} index - LED index (0-3)
     * @param {number} times - Number of flashes
     * @param {number} interval - Flash interval in ms
     */
    flashLED(index, times = 3, interval = 200) {
        return new Promise((resolve) => {
            // Stop any existing flash on this LED
            this.stopFlash(index);

            let count = 0;
            let on = true;

            this.flashIntervals[index] = setInterval(() => {
                this.setLED(index, on);
                on = !on;
                count++;

                if (count >= times * 2) {
                    this.stopFlash(index);
                    resolve();
                }
            }, interval);
        });
    }

    /**
     * Flash then stay on
     */
    flashThenOn(index, times = 3, interval = 200) {
        return new Promise((resolve) => {
            this.flashLED(index, times, interval).then(() => {
                this.setLED(index, true);
                resolve();
            });
        });
    }

    /**
     * Stop flashing a specific LED
     */
    stopFlash(index) {
        if (this.flashIntervals[index]) {
            clearInterval(this.flashIntervals[index]);
            delete this.flashIntervals[index];
        }
    }

    /**
     * Stop all flashing
     */
    stopAllFlash() {
        for (let i = 0; i < 4; i++) {
            this.stopFlash(i);
        }
    }

    /**
     * Victory sequence - flash winner, then stay lit
     */
    async victorySequence(winnerIndex) {
        this.stopAllFlash();
        this.setAllLEDs(false);

        await this.flashThenOn(winnerIndex, 5, 150);
    }

    /**
     * Close the device connection
     */
    close() {
        this.stopAllFlash();
        if (this.device) {
            try {
                this.setAllLEDs(false);
                this.device.close();
            } catch (e) {
                // Ignore close errors
            }
            this.device = null;
        }
    }
}

module.exports = BuzzLEDController;
