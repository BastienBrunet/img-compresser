"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompressionService = void 0;
const electron_1 = require("electron");
const node_fs_1 = require("node:fs");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_progressbar_1 = __importDefault(require("electron-progressbar"));
const node_child_process_1 = require("node:child_process");
const pngquant_bin_1 = __importDefault(require("pngquant-bin"));
class CompressionService {
    constructor() {
        this.NOTIFICATION_TITLE = 'Images compressées !';
        this.NOTIFICATION_BODY = "Aller c'est bon tout est compressé :)";
    }
    openFileSelectionDialog() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield electron_1.dialog.showOpenDialog({
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Images', extensions: ['png'] }
                ]
            });
        });
    }
    compressFiles(inputFiles) {
        return __awaiter(this, void 0, void 0, function* () {
            const progressBar = new electron_progressbar_1.default({
                text: 'Compression des images',
                detail: 'Veuillez patienter...'
            });
            progressBar
                .on('completed', function () {
                progressBar.detail = 'Compression terminée';
            })
                .on('aborted', function () {
                console.info(`aborted...`);
            });
            // All the promises of the files compression
            const treatedFiles = [];
            // Get temp directory path
            const directoryPath = electron_1.app.getPath("appData").concat("\\compressed-files\\");
            // Create directory if not exists
            const directoryCheck = new Promise(resolve => (0, node_fs_1.access)(directoryPath, node_fs_1.constants.F_OK, (err) => {
                if (err) {
                    (0, node_fs_1.mkdir)(directoryPath, { recursive: true }, (err) => {
                        if (err)
                            throw err;
                        resolve();
                    });
                }
                else {
                    resolve();
                }
            }));
            // Wait for the check to complete
            yield directoryCheck;
            // Compress all the files and put them in the directory
            inputFiles.forEach(file => {
                const destPath = directoryPath.concat(path_1.default.basename(file));
                let conflictResult = null;
                if (fs_1.default.existsSync(destPath)) {
                    // If file already exists, open a dialog to ask what to do
                    conflictResult = electron_1.dialog.showMessageBoxSync({
                        title: "Conflit",
                        message: "Le fichier " + destPath + " existe déjà, voulez vous le remplacer ?",
                        buttons: ['Remplacer', 'Ignorer']
                    });
                    // If the user wants to replace : delete the file
                    if (conflictResult == 0) {
                        fs_1.default.unlinkSync(destPath);
                    }
                }
                // If no conflict or replace file selected
                if (conflictResult != 1) {
                    treatedFiles.push(new Promise(resolve => (0, node_child_process_1.execFile)(pngquant_bin_1.default, ['-o', destPath, file], error => {
                        resolve(error ? error.message : null);
                    })));
                }
            });
            // Wait for all the files to be treated
            const compressionErrors = yield Promise.all(treatedFiles);
            progressBar.setCompleted();
            if (compressionErrors.filter(m => m != null).length > 0) {
                // Concat
                let messages = "";
                compressionErrors.forEach(message => messages = messages.concat(message + "\n"));
                electron_1.dialog.showMessageBoxSync({ message: messages, title: "Erreur" });
            }
            else {
                // Open the output directory
                yield electron_1.shell.openPath(directoryPath);
            }
            new electron_1.Notification({ title: this.NOTIFICATION_TITLE, body: this.NOTIFICATION_BODY }).show();
        });
    }
}
exports.CompressionService = CompressionService;
//# sourceMappingURL=CompressionService.js.map