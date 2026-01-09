import { app, BrowserWindow, Menu, dialog } from 'electron';
import path from 'path';
import { spawn } from 'child_process';

// Handle path resolution without import.meta for CommonJS compatibility
const rootDir = app.getAppPath();
const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null;
let serverProcess: any;

function createWindow() {
    const iconPath = isDev
        ? path.join(rootDir, 'client/public/logo.png')
        : path.join(rootDir, 'dist/logo.png');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: iconPath,
    });

    // In development, load the URL. In production, we might need to wait for the server.
    const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:5000';

    mainWindow.loadURL(startUrl).catch((err) => {
        console.error('Failed to load URL:', err);
        if (app.isPackaged) {
            dialog.showErrorBox('Connection Error', `Failed to connect to server at ${startUrl}.\nError: ${err.message}`);
        }
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', () => {
    // Create custom menu
    const menuTemplate: any[] = [
        {
            label: 'File',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'delete' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'zoom' },
                { role: 'close' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Developed by ENG Youssef EL captain',
                    enabled: false
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);

    // In production, start the server directly in the main process
    if (app.isPackaged) {
        try {
            process.env.NODE_ENV = 'production';
            process.env.PORT = '5000';
            process.env.USER_DATA_PATH = app.getPath('userData');

            // The server is built to dist/index.cjs
            const serverPath = path.join(app.getAppPath(), 'dist/index.cjs');

            console.log('Attempting to start server from:', serverPath);

            // Start the server by requiring it
            // It uses an IIFE to start listening immediately
            require(serverPath);

            console.log('Server started successfully from:', serverPath);
        } catch (error: any) {
            console.error('Failed to start server:', error);
            dialog.showErrorBox('Server Error', `Failed to start application server:\n${error.message}\n${error.stack}`);
        }

        // Give the server a moment to start listening
        setTimeout(createWindow, 1000);
    } else {
        // In dev, assume server is already running via npm run dev
        createWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
