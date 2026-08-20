const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const saveName = 'wildline-nation.save.v1.json';
let windowRef;

async function atomicWrite(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(value, null, 2), 'utf8');
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await fs.rename(tempPath, filePath);
      return;
    } catch (error) {
      if (!['EPERM', 'EACCES', 'EBUSY'].includes(error?.code) || attempt === 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 60 * (attempt + 1)));
    }
  }
}

function savePath() { return path.join(app.getPath('userData'), saveName); }

async function loadSave() {
  try { return JSON.parse(await fs.readFile(savePath(), 'utf8')); }
  catch { return null; }
}

async function save(value) { await atomicWrite(savePath(), value); return { savedAt: new Date().toISOString() }; }

function createWindow() {
  windowRef = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#091116',
    title: 'Wildline Nation',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) windowRef.loadURL(devUrl);
  else windowRef.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('save:load', loadSave);
  ipcMain.handle('save:write', (_event, value) => save(value));
  ipcMain.handle('app:close', async () => { if (windowRef) windowRef.destroy(); });
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
