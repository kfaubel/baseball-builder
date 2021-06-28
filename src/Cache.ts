import fs = require('fs');

export class Cache {
    private cacheStorage: any; 

    private logger: any;

    constructor(logger: any) {
        this.logger = logger;
        this.cacheStorage = {};
    }

    public get(key: any) {
        if (this.cacheStorage[key] !== undefined) {
            const cacheItem: any = this.cacheStorage[key];

            const expiration = cacheItem.expiration;
            const object     = cacheItem.object;

            const now = new Date();
            if (expiration > now.getTime()) {
                // object is current
                //this.logger.verbose("Cache: Key: " + key + " - cache hit");
                return object;
            } else {
                // object expired
                //this.logger.verbose("Cache: Key: " + key + " - cache expired");
            }
        } else {
            //this.logger.verbose("Cache: Key: " + key + " - cache miss");
        }

        return null;
    }

    public set(key: string, newObject: any, expirationTime: number) {
        const cacheItem = {expiration: expirationTime, object: newObject}
        this.cacheStorage[key] =  cacheItem;
    }

    // static async saveCache() {
    //     console.log("Saving cache.");
    //     fs.writeFile('./cache.json', JSON.stringify(BaseballData.cache, null, 4), function(err) {
    //         if(err) console.log(err)
    //     })
    // }
}