const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    toggleFullscreen: () => ipcRenderer.send('toggle-fullscreen'),

    // Quiz file loading (for Phase 3)
    loadQuiz: async (filename) => {
        return ipcRenderer.invoke('load-quiz', filename);
    }
});

// Expose a simple console log for debugging gamepad
contextBridge.exposeInMainWorld('debug', {
    log: (...args) => console.log('[Renderer]', ...args)
});
