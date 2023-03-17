import {app, dialog, Notification, shell} from "electron";
import {access, constants, mkdir} from "node:fs";
import path from "path";
import fs from "fs";
import ProgressBar from 'electron-progressbar';
import {execFile} from "node:child_process";
import pngquant from "pngquant-bin";

export class CompressionService {

  NOTIFICATION_TITLE = 'Images compressées !';
  NOTIFICATION_BODY = "Aller c'est bon tout est compressé :)";

  async openFileSelectionDialog() {
    return await dialog.showOpenDialog(
      {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Images', extensions: ['png'] }
        ]
      });
  }

  async compressFiles(inputFiles: string[]){
    const progressBar = new ProgressBar({
      text: 'Compression des images',
      detail: 'Veuillez patienter...'
    });

    progressBar
      .on('completed', function() {
        progressBar.detail = 'Compression terminée';
      })
      .on('aborted', function() {
        console.info(`aborted...`);
      });

    // All the promises of the files compression
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

    progressBar.setCompleted();

    if (compressionErrors.filter(m => m != null).length > 0) {
      // Concat
      let messages = "";
      compressionErrors.forEach(message => messages = messages.concat(message + "\n"));
      dialog.showMessageBoxSync({message: messages, title: "Erreur"});
    } else {
      // Open the output directory
      await shell.openPath(directoryPath);
    }

    new Notification({ title: this.NOTIFICATION_TITLE, body: this.NOTIFICATION_BODY }).show()
  }
}
