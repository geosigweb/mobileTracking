import { Component, OnInit } from '@angular/core';

import { LogLevel, HubConnectionBuilder, HubConnection } from '@aspnet/signalr';

import { Platform } from '@ionic/angular';
import { Events } from '@ionic/angular';

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
    public events : Events,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private locator: Locator
  ) {
    this.initializeApp();
  }

  public async GetConnection()
  {
    if (this.hubConnection === undefined)
    {
      try {
        this.hubConnection= new HubConnectionBuilder()
          .withUrl('https://geosigwebcd19webapi.azurewebsites.net/trackingHub')
          .configureLogging(LogLevel.Information)
          .build();
        await this.hubConnection.start();
      } catch (error) {
        this.events.publish("gwError", error.message);
      }
    }
    return this.hubConnection;
  }

  public async TestConnection(trackFile, idVehicule, idParcours)
  {
    if (this.hubConnection === undefined)
    {
      this.hubConnection= new HubConnectionBuilder()
          .withUrl('https://geosigwebcd19webapi.azurewebsites.net/trackingHub')
          .configureLogging(LogLevel.Information)
          .build();
          
      try {
        await this.hubConnection.start();
        await this.hubConnection.invoke("SendMessage",  trackFile, idVehicule, idParcours,"0", "0");
      } catch (error) {
        this.events.publish("gwInfo", 'Start Operation failed because ' + error);
      } 
     }
  }


  initializeApp() {
    this.platform.ready().then(() => 
    {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.locator.Initialize(this, 1,6);
    });
  }

}
