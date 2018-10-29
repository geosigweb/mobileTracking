import { Component, OnInit } from '@angular/core';

import { Platform } from '@ionic/angular';
import { Events } from '@ionic/angular';

import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

import {Locator} from '../app/Tracking/Locator';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html'
})
export class AppComponent {
  constructor(
    public events : Events,
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    private backgroundMode: BackgroundMode,
    private locator: Locator
  ) 
  {
    this.platform.ready().then(() => 
    {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
      this.backgroundMode.disableWebViewOptimizations();
      this.backgroundMode.overrideBackButton();
 
      this.backgroundMode.on("enable").subscribe(()=> { this.events.publish("gwInfo", `on enable`); });
      this.backgroundMode.on("disable").subscribe(()=> { this.events.publish("gwInfo", `on disable`); });
      this.backgroundMode.on("deactivate").subscribe(()=> { this.events.publish("gwInfo", `on deactivate`); });
      this.backgroundMode.on("failure").subscribe(()=> { this.events.publish("gwInfo", `on failure`); });
      
      this.locator.Initialize(this.backgroundMode, 1,6);
    });
  }
}
