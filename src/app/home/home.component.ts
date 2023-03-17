import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ElectronService } from '../core/services';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  isChecked: boolean;

  constructor(private router: Router, private electronService: ElectronService) { }

  async ngOnInit() {
    console.log('HomeComponent INIT');
  }

  async openDialog(): Promise<void> {
    // Get the selected file path
    const result = await this.electronService.getFile();

    console.log(result);

    if (!result.canceled){
      console.log('Compress files ...');
      // Process the images
      await this.electronService.compressFiles(result.filePaths);

      console.log('End');
    }
  }
  async toggleDarkMode() {
    await this.electronService.toggleDarkMode();
  }

  async resetDarkMode() {
    await this.electronService.resetDarkMode();
    this.isChecked=false;
  }

  startProgress() {
    // ProgressBar native
    this.electronService.progressBar();
  }

}
