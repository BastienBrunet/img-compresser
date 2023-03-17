import {app, BrowserWindow, bativeTheme, screen, Notification, ipcMain, dialog, shell} from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import ProgressBar from 'electron-progressbar';
import {execFile} from 'node:child_process';
import { access, constants, mkdir } from 'node:fs';
import pngquant from 'pngquant-bin';


let win: BrowserWindow = null;
const args = process.argv.slice(1),
serve = args.some(val => val === '--serve');
const ProgressBar = require('electron-progressbar');
const NOTIFICATION_TITLE = 'Images compressées !'
const NOTIFICATION_BODY = "Aller c'est bon tout est compressé :)"

function createWindow(): BrowserWindow {

  const size = screen.getPrimaryDisplay().workAreaSize;
  let progressInterval;

  // Create the browser window.
  win = new BrowserWindow({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
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
  const INCREMENT = 0.03
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
      app.on('ready', () => createWindow);
      
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

  ipcMain.on('start-progress-bar', (event) => {
    
    let value = 0;
    const intervalId = setInterval(() => {
      win.setProgressBar(value)
      if (value < 1) {
        value += INCREMENT
      } else {
        value = (-INCREMENT * 5) // reset to a bit less than 0 to show reset state
      }
      if (value >= 1) {
        clearInterval(intervalId);
        win.setProgressBar(-1)
      }
    }, 100);


    // Other progressbar

    var progressBar = new ProgressBar({
      text: 'Preparing data...',
      detail: 'Wait...'
    });
    
    progressBar
      .on('completed', function() {
        console.info(`completed...`);
        progressBar.detail = 'Task completed. Exiting...';
      })
      .on('aborted', function() {
        console.info(`aborted...`);
      });
    
    // launch a task...
    // launchTask();
    
    // when task is completed, set the progress bar to completed
    // ps: setTimeout is used here just to simulate an interval between
    // the start and the end of a task
    setTimeout(function() {
      progressBar.setCompleted();
      //Notification
      new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show()
    }, 5000);  
  });

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

  ipcMain.handle('file-select', async () => {
    return await dialog.showOpenDialog(
    { properties: ['openFile', 'multiSelections'], filters: [
              { name: 'Images', extensions: ['png'] }] });
  })

  ipcMain.handle('compress-files', async (event, inputFiles: string[]) => {

    const treatedFiles = [];
    // Get temp directory path
    const directoryPath = app.getPath("appData").concat("\\compressed-files\\");

    // Create directory if not exists
    const directoryCheck = new Promise<void>(resolve => access(directoryPath, constants.F_OK, (err) => {
      if(err){
        mkdir(directoryPath, { recursive: true }, (err) => {
          if (err) throw err;
          resolve()
        });
      } else {
       resolve()
      }
    }));

    // Wait for the check to complete
    await directoryCheck;

    // Compress all the files and put them in the directory
    inputFiles.forEach(file => {
      const destPath = directoryPath.concat(path.basename(file));
      let conflictResult = null;
      if (fs.existsSync(destPath)){
        // If file already exists, open a dialog to ask what to do
        conflictResult = dialog.showMessageBoxSync(
          {
            title: "Conflit",
            message: "Le fichier " + destPath + " existe déjà, voulez vous le remplacer ?",
            buttons: ['Remplacer', 'Ignorer']
          }
        );
        // If the user wants to replace : delete the file
        if (conflictResult == 0) {
          fs.unlinkSync(destPath);
        }
      }
      // If no conflict or replace file selected
      if (conflictResult != 1){
        treatedFiles.push(
          new Promise<string>(
            resolve => execFile(pngquant, ['-o', destPath, file ], error => {
              resolve(error ? error.message : null);
            })
          ));
      }
    })

    // Wait for all the files to be treated
    const compressionErrors : string[] = await Promise.all(treatedFiles);

    if (compressionErrors.filter(m => m != null).length > 0) {
      // Concat
      let messages = "";
      compressionErrors.forEach(message => messages = messages.concat(message + "\n"));
      dialog.showMessageBoxSync({message: messages, title: "Erreur"});
    } else {
      // Open the output directory
      await shell.openPath(directoryPath);
    }

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
