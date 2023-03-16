import {app, BrowserWindow, screen, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {execFile} from 'node:child_process';
import { access, constants, mkdir } from 'node:fs';
import pngquant from 'pngquant-bin';


let win: BrowserWindow = null;
const args = process.argv.slice(1),
  serve = args.some(val => val === '--serve');

function createWindow(): BrowserWindow {

  const size = screen.getPrimaryDisplay().workAreaSize;

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

  if (serve) {
    const debug = require('electron-debug');
    debug();

    require('electron-reloader')(module);
    win.loadURL('http://localhost:4200');
  } else {
    // Path when running electron executable
    let pathIndex = './index.html';

    if (fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
       // Path when running electron in local folder
      pathIndex = '../dist/index.html';
    }

    const url = new URL(path.join('file:', __dirname, pathIndex));
    win.loadURL(url.href);
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
