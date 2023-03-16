export class FileDialogResult {

  constructor(
    private canceled: boolean,
    private filePaths: string[]
  ) {
  }
}
