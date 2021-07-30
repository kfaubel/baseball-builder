/* eslint-disable @typescript-eslint/no-unused-vars */
import fs = require('fs');
import { Logger } from './Logger';

interface CacheItem {
    expiration: number;
    usefulUntil: number;
    object: unknown;
}

export interface CacheStorage {
    [key: string]: CacheItem;
}

export class Cache {
    private cacheStorage: CacheStorage; 

    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
        this.cacheStorage = {};
    }

    public get(key: string): unknown {
        if (this.cacheStorage[key] !== undefined) {
            const cacheItem: CacheItem = this.cacheStorage[key];

            const expiration: number = cacheItem.expiration;
            const object: unknown    = cacheItem.object;

            const now = new Date();
            if (expiration > now.getTime()) {
                // object is current
                //this.logger.verbose("Cache: Key: " + key + " - cache hit");
                return object;
            } else {
                // object expired
                // this.logger.verbose("Cache: Key: " + key + " - cache expired");
            }
        } else {
            // this.logger.verbose("Cache: Key: " + key + " - cache miss");
        }

        return null;
    }

    public set(key: string, newObject: unknown, expirationTime: number, usefulUntil: number): void {
        const cacheItem = {expiration: expirationTime, usefulUntil: usefulUntil, object: newObject}
        this.cacheStorage[key] =  cacheItem;

        //fs.writeFileSync("cache.json", JSON.stringify(this.cacheStorage, null, 4));
    }

    // static async saveCache() {
    //     console.log("Saving cache.");
    //     fs.writeFile('./cache.json', JSON.stringify(BaseballData.cache, null, 4), function(err) {
    //         if(err) console.log(err)
    //     })
    // }
}