import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Geolocation,Geoposition } from '@ionic-native/geolocation/ngx';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { Subscription } from 'rxjs';
import { Events } from '@ionic/angular';
import 'rxjs/add/operator/filter';
import { LogLevel, HubConnectionBuilder, HubConnection } from '@aspnet/signalr';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

@Component({})
export class Locator {
    private trackFile : string;
    private idVehicule: number;
    private idParcours: number;
    private watcher: Subscription;
    private backgroundMode: BackgroundMode;

    constructor(public events: Events, private geolocation: Geolocation, private platform: Platform, private androidPermissions: AndroidPermissions ) 
    {
        platform.ready().then(async () => 
        {
            events.subscribe('startTracking', () => this.StartTracking());
            events.subscribe('testConnection', () => this.Test());
            events.subscribe('stopTracking', () => this.StopTracking());

            try 
            {
                // this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION).then(
                //     result => this.events.publish("gwInfo",'Has permission?' + result.hasPermission.toString()),
                //     err => this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_FINE_LOCATION)
                // );
                
                this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
                    result => this.events.publish("gwInfo",'Has permission?' +result.hasPermission.toString()),
                    err => this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
                );

                this.androidPermissions.requestPermissions([this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION]);

                var pos = await this.geolocation.getCurrentPosition();
                this.events.publish("gwInfo", `getCurrentPosition : lat: ${pos.coords.latitude}, lon: ${pos.coords.longitude}`);
            } catch (error) {
                this.events.publish("gwError", error.message)
            }
        });
    }

    async Initialize(backgroundMode, idVehicule, idParcours)
    {
        this.backgroundMode = backgroundMode;
        this.idVehicule = idVehicule;
        this.idParcours = idParcours;
    }

    async StartTracking()
    {
        try {
            this.trackFile = await this.GetTrackFileName();
            var options = { enableHighAccuracy: false };
                 
            this.backgroundMode.on("activate").subscribe(()=> 
            { 
                this.events.publish("gwInfo", `on activate`);
                this.watcher = this.geolocation.watchPosition(options).filter((p) => p.coords !== undefined).subscribe(pos => this.Watch(pos));
            });
            this.backgroundMode.enable();
        } catch (error) {
            this.events.publish("gwError", error);
        }
    }

    async StopTracking() 
    { 
        try {
            if (this.watcher !== undefined) 
                this.watcher.unsubscribe();
            var connection = await this.GetConnection();
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
            var connection = await this.GetConnection();
            await connection.invoke("SendMessage", this.trackFile, this.idVehicule, this.idParcours,"0", "0");
            await connection.stop();
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
            var connection = await this.GetConnection();
            await connection.invoke("SendMessage", this.trackFile, this.idVehicule, this.idParcours, lat, lon);
            await connection.stop();
            this.events.publish("gwInfo", `Sent!`);
        } catch (error) {
            this.events.publish("gwError", error);
        }
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

   async GetConnection()
   {
       try {
         var hubConnection= new HubConnectionBuilder()
           .withUrl('https://geosigwebcd19webapi.azurewebsites.net/trackingHub')
           .configureLogging(LogLevel.Information)
           .build();
         await hubConnection.start();
       } catch (error) {
         this.events.publish("gwError", error.message);
       }
     
     return hubConnection;
   }
}