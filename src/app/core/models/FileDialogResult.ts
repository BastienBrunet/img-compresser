export class FileDialogResult {

  constructor(
    public canceled: boolean,
    public filePaths: string[]
  ) {
  }
}
