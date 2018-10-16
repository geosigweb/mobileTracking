import { Component, OnInit } from '@angular/core';

import { LogLevel, HubConnectionBuilder, HubConnection } from '@aspnet/signalr';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import {Locator} from '../app/Tracking/Locator';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  private hubConnection: HubConnection;
  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private locator: Locator
  ) {
    this.initializeApp();
  }

  GetLocator() : Locator { return this.locator;}

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.hubConnection= new HubConnectionBuilder()
          .withUrl('https://geosigwebcd19webapi.azurewebsites.net/trackingHub')
          .configureLogging(LogLevel.Information)
          .build();
      this.hubConnection.start()
          .then(()=>{ 
            console.log("connection ok"); 
            this.locator.Initialize(this.hubConnection, 1,6); 
          })
          .catch(err => console.error("could not connect :" + err.toString()));
      
    });
  }

}
