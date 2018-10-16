import { Component } from '@angular/core';
import { Events } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  errors : string = '';
  infos : string = '';
  constructor(public events: Events)
  {
    this.events.subscribe("gwError", (error)=> this.errors = error.toString());
    this.events.subscribe("gwInfo", (info)=> this.infos += info.toString() + ' !!! ');
  }

  startTracking()
  {
    this.events.publish('startTracking');
  }

  stopTracking()
  {
    this.events.publish('stopTracking');
  }

  testConnection()
  {
    this.events.publish('testConnection');
  }
}
