const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),

    // Quiz file loading
    loadQuiz: async (filename) => {
        return ipcRenderer.invoke('load-quiz', filename);
    },

    // LED Control API
    led: {
        // Turn single LED on/off (player: 1-4)
        set: (player, on) => ipcRenderer.send('led-set', { player, on }),

        // Turn all LEDs on/off
        setAll: (on) => ipcRenderer.send('led-set-all', on),

        // Flash a single LED (player: 1-4)
        flash: (player, times = 3, interval = 200) =>
            ipcRenderer.send('led-flash', { player, times, interval }),

        // Flash then stay on
        flashThenOn: (player, times = 3, interval = 200) =>
            ipcRenderer.send('led-flash-then-on', { player, times, interval }),

        // Victory sequence for winner (player: 1-4)
        victory: (winner) => ipcRenderer.send('led-victory', { winner }),

        // Turn off all LEDs
        offAll: () => ipcRenderer.send('led-off-all')
    }
});

// Expose a simple console log for debugging gamepad
contextBridge.exposeInMainWorld('debug', {
    log: (...args) => console.log('[Renderer]', ...args)
});
