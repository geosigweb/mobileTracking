import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Geolocation,Geoposition } from '@ionic-native/geolocation/ngx';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { HubConnection } from '@aspnet/signalr';
import { Subscription } from 'rxjs';
import { Events } from '@ionic/angular';
import 'rxjs/add/operator/filter';

@Component({})
export class Locator {
    private hubConnection: HubConnection;
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

    async Initialize(connection, idVehicule, idParcours)
    {
        try {
            this.hubConnection = connection;
            this.idVehicule = idVehicule;
            this.idParcours = idParcours;

            var urlAPI = 'https://geosigwebcd19webapi.azurewebsites.net/api/Layers'
            var application = 'CD19 Routes 4.0';
            var url = `${urlAPI}/${application}/newTrack/${idParcours}`;
            let {value} = await this.fetchAsync(url);
            this.trackFile = value;
            this.events.publish("gwInfo", `Received track File name ${this.trackFile}`);
        } catch (error) {
            this.events.publish("gwError", error);
        }
    }

    StartTracking()
    {
        try {
            var options = { enableHighAccuracy: false };
            this.watcher = this.geolocation.watchPosition(options).filter((p) => p.coords !== undefined).subscribe(pos => this.Watch(pos));
        } catch (error) {
            this.events.publish("gwError", error);
        }
    }

    Test()
    {
        try {
            this.hubConnection.invoke("SendMessage",  this.trackFile, this.idVehicule, this.idParcours,"0", "0");
            this.events.publish("gwInfo", "Test executed");
        } catch (error) {
            this.events.publish("gwError", error);
        }
    }

    StopTracking() 
    { 
        try {
            this.watcher.unsubscribe();
            this.hubConnection.invoke("SendMessage",  this.trackFile, this.idVehicule, this.idParcours,"Infinite", "Infinite");
            this.events.publish("gwInfo", "Tracking stopped");
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

    async Watch(pos: Geoposition)
    {
        try {
            let lat: string = pos.coords.latitude.toString();
            let lon: string = pos.coords.longitude.toString();
            this.events.publish("gwInfo", `Watch Sending : lat: ${lat}, lon: ${lon}`);
            await this.hubConnection.invoke("SendMessage", this.trackFile, this.idVehicule, this.idParcours, lat, lon);
            this.events.publish("gwInfo", `Watch Sent : lat: ${lat}, lon: ${lon}`);
        } catch (error) {
            this.events.publish("gwError", error);
        }
    }
}