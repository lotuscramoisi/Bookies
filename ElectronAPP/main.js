const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('lang', 'en-US');
const path = require('path');
const { spawn } = require('child_process');  // To start the backend server

let mainWindow;

// Start the backend server
function startBackend() {
    const backend = spawn('node', [path.join(__dirname, '/backend/server.js')]);

    backend.stdout.on('data', (data) => {
        console.log(`Backend stdout: ${data}`);
    });

    backend.stderr.on('data', (data) => {
        console.error(`Backend stderr: ${data}`);
    });

    backend.on('close', (code) => {
        console.log(`Backend server exited with code ${code}`);
    });
}

app.on('ready', () => {
    // Start the backend server
    startBackend();

    // Create the Electron window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 1200,
        fullscreen: true,
        frame: false
    });

    // Load Angular's index.html from the dist folder
    mainWindow.loadFile(path.join(__dirname, 'rw/browser/index.html'));
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
