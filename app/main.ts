import {app,ipcMain, BrowserWindow,nativeTheme, screen, Notification, Tray, Menu, nativeImage,dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {CompressionService} from "./services/CompressionService";


let win: BrowserWindow = null;
const args = process.argv.slice(1),
serve = args.some(val => val === '--serve');
const trayIcon = nativeImage.createFromPath(path.join('icon.png'))

const compressionService = new CompressionService()

function createWindow(): BrowserWindow {

  const size = screen.getPrimaryDisplay().workAreaSize;
  let progressInterval;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    icon : trayIcon,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: (serve),
      contextIsolation: false,  // false if you want to run e2e test with Spectron
    },
  });

  //Dark mode
  ipcMain.handle('dark-mode:toggle', () => {
    if (nativeTheme.shouldUseDarkColors) {
      nativeTheme.themeSource = 'light'
    } else {
      nativeTheme.themeSource = 'dark'
    }
    return nativeTheme.shouldUseDarkColors
  })

  ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
  })


  //ProgressBar
  const INCREMENT = 0.02
  const INTERVAL_DELAY = 100 // ms

  let c = 0
  progressInterval = setInterval(() => {
    // update progress bar to next value
    // values between 0 and 1 will show progress, >1 will show indeterminate or stick at 100%
    win.setProgressBar(c)

    // increment or reset progress bar
    if (c < 1) {
      c += INCREMENT
    } else {
      c = (-INCREMENT * 5) // reset to a bit less than 0 to show reset state
    }
    if (c >= 1) {
      // clear progress interval
      clearInterval(progressInterval);
      win.setProgressBar(-1)
    }
  }, INTERVAL_DELAY);

// before the app is terminated, clear both timers
app.on('before-quit', () => {
  clearInterval(progressInterval)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

  if (serve) {
    const debug = require('electron-debug');
    debug();

    require('electron-reloader')(module);
    win.loadURL('http://localhost:4200');
    win.maximize();
  } else {
    // Path when running electron executable
    let pathIndex = './index.html';

    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
       // Path when running electron in local folder
      pathIndex = '../dist/index.html';
    }

    console.log(pathIndex)

    const url = new URL(path.join('file:', __dirname, pathIndex));
    win.loadURL(url.href);
    win.maximize();
  }

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  win.on('close', (event) => {
    ipcMain.removeHandler("dark-mode:toggle")
    ipcMain.removeHandler("dark-mode:system")
    event.preventDefault()
    win.hide()
  })

  ipcMain.handle('file-select', async () => {
    return compressionService.openFileSelectionDialog();
  })

  ipcMain.handle('compress-files', async (event, inputFiles: string[]) => {
    return await compressionService.compressFiles(inputFiles);
  });

  let tray = null

  app.whenReady().then(() => {
    tray = new Tray(trayIcon)

    const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Ouvrir l’application',
      click: () => {
        win.show()
      }
    },
    {
      label: 'Sélectionner des images',
      click: async () => {
        const selectedFiles = await compressionService.openFileSelectionDialog();
        await compressionService.compressFiles(selectedFiles.filePaths);
      }
    },
    {
      label: 'Fermer l’application',
      click: () => {
        app.quit()
        win = null;
        tray.destroy()

      }
    }
  ])
  tray.setToolTip('Con-Prêt-Soeur')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    // Code pour gérer un clic sur l'icône de la barre d'état
    win.show()
  })
})

  return win;

}
try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on('ready', () => setTimeout(createWindow, 400));

  // Quit when all windows are closed.
  app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

} catch (e) {
  // Catch Error
  // throw e;
}
