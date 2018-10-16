import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Geolocation,Geoposition } from '@ionic-native/geolocation/ngx';
import { HubConnection } from '@aspnet/signalr';
import { Subscription } from 'rxjs';
import { Events } from '@ionic/angular';

@Component({})
export class Locator {
    private hubConnection: HubConnection;
    private trackFile : string;
    private idVehicule: number;
    private idParcours: number;
    private watcher: Subscription;

    constructor(public events: Events, private geolocation: Geolocation, private platform: Platform ) 
    {
        platform.ready().then(async () => 
        {
            events.subscribe('startTracking', () => this.StartTracking());
            events.subscribe('testConnection', () => this.Test());
            events.subscribe('stopTracking', () => this.StopTracking());

            try {
                var pos = await this.geolocation.getCurrentPosition();
                this.events.publish("gwInfo", `getCurrentPosition : lat: ${pos.coords.latitude}, lon: ${pos.coords.longitude}`);
            } catch (error) {
                this.events.publish("gwError", error)
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
            this.watcher = this.geolocation.watchPosition().subscribe(pos => this.Watch(pos));
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