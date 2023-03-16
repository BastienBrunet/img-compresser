import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {ElectronService} from '../core/services';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(
    private router: Router,
    private electronService: ElectronService
    ) { }

  ngOnInit(): void {
    console.log('HomeComponent INIT');
  }

  async openDialog(): Promise<void> {
    // Get the selected file path
    const result = await this.electronService.getFile();
  }
}
