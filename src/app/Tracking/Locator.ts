import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Geolocation,Geoposition } from '@ionic-native/geolocation/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { HubConnection } from '@aspnet/signalr';
import { Subscription } from 'rxjs';
import { Events } from '@ionic/angular';
import 'rxjs/add/operator/filter';
import { AppComponent } from '../app.component';

@Component({})
export class Locator {
    private appComponent: AppComponent;
    private trackFile : string;
    private idVehicule: number;
    private idParcours: number;
    private watcher: Subscription;

    constructor(public events: Events, private geolocation: Geolocation, private platform: Platform, private androidPermissions: AndroidPermissions, private backgroundMode: BackgroundMode ) 
    {
        platform.ready().then(async () => 
        {
            events.subscribe('startTracking', () => this.StartTracking());
            events.subscribe('testConnection', () => this.Test());
            events.subscribe('stopTracking', () => this.StopTracking());

            try {            

                backgroundMode.disableWebViewOptimizations();
                // backgroundMode.overrideBackButton();
                backgroundMode.enable();
                
                this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION).then(
                    result => this.events.publish("gwInfo",'Has permission?' + result.hasPermission.toString()),
                    err => this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION)
                );
                
                this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
                    result => this.events.publish("gwInfo",'Has permission?' +result.hasPermission.toString()),
                    err => this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
                );

                this.androidPermissions.requestPermissions([this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION, this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION]);

                var pos = await this.geolocation.getCurrentPosition();
                this.events.publish("gwInfo", `getCurrentPosition : lat: ${pos.coords.latitude}, lon: ${pos.coords.longitude}`);
            } catch (error) {
                this.events.publish("gwError", error.message)
            }
        });
    }

    async Initialize(appComponent, idVehicule, idParcours)
    {
        this.appComponent = appComponent;
        this.idVehicule = idVehicule;
        this.idParcours = idParcours;
    }

    async GetTrackFileName()
    {
        try 
        {
            var urlAPI = 'https://geosigwebcd19webapi.azurewebsites.net/api/Layers'
            var application = 'CD19 Routes 4.0';
            var url = `${urlAPI}/${application}/newTrack/${this.idParcours}`;
            let {value} = await this.fetchAsync(url);
            this.events.publish("gwInfo", `Received track File name ${value}`);
            return value;
        } 
        catch (error) 
        {
            this.events.publish("gwError", error);
            return "";
        }
    }

    async StartTracking()
    {
        try {
            this.trackFile = await this.GetTrackFileName();
            var options = { enableHighAccuracy: false };
            this.watcher = this.geolocation.watchPosition(options).filter((p) => p.coords !== undefined).subscribe(pos => this.Watch(pos));
        } catch (error) {
            this.events.publish("gwError", error);
        }
    }

    async StopTracking() 
    { 
        try {
            this.watcher.unsubscribe();
            var connection = await this.appComponent.GetConnection();
            await connection.invoke("SendMessage",  this.trackFile, this.idVehicule, this.idParcours,"Infinite", "Infinite");
            await connection.stop();
            this.events.publish("gwInfo", "Tracking stopped");
        } catch (error) {
            this.events.publish("gwError", error);
        }
    }

    async Test()
    {
        try 
        {
            await this.appComponent.TestConnection(this.trackFile, this.idVehicule, this.idParcours);
        } 
        catch (error) 
        {
            this.events.publish("gwInfo", "Test() " + error.toString());
        }
    }

    async Watch(pos: Geoposition)
    {
        try {
            let lat: string = pos.coords.latitude.toString();
            let lon: string = pos.coords.longitude.toString();
            this.events.publish("gwInfo", `Watch Sending : lat: ${lat}, lon: ${lon}...`);
            var connection = await this.appComponent.GetConnection();
            await connection.invoke("SendMessage", this.trackFile, this.idVehicule, this.idParcours, lat, lon);
            await connection.stop();
            this.events.publish("gwInfo", `Sent!`);
        } catch (error) {
            this.events.publish("gwError", error);
        }
    }    
    
    async fetchAsync (url) 
    {
        try {
            let response = await fetch(url);
            let data = await response.json();
            this.events.publish("gwInfo", `data received from ${url}`);
            return data;
        } catch (error) {
            this.events.publish("gwError", error);
        }
   }


}