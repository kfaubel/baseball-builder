/* eslint-disable @typescript-eslint/no-unused-vars */
import fs = require("fs");
import path from "path";
import { LoggerInterface } from "./Logger";

interface KacheItem {
    expiration: number;
    comment: string;
    item: unknown;
}

export interface KacheStorage {
    [key: string]: KacheItem;
}

export interface KacheInterface {
    get(key: string): unknown;
    set(key: string, newItem: unknown, expirationTime: number): void;
}

export class Kache implements KacheInterface {
    private cacheStorage: KacheStorage; 
    private cacheName: string;
    private cachePath: string;

    private logger: LoggerInterface;
    private detailedLogging: boolean;
    
    /**
     * Construct the cache instance
     * @param logger Logger instance
     * @param cacheName Name of the cache (filename)
     * @param detailedLogging Report as verbose, details of the cache workings.
     */
    constructor(logger: LoggerInterface, cacheName: string, newCache = false, detailedLogging = false) {
        this.logger = logger;
        this.cacheName = cacheName;
        this.cachePath = path.resolve(__dirname, "..", this.cacheName);

        if (newCache) {
            this.logger.info("Cache: removing any previous cache.");
            fs.unlinkSync(this.cachePath);
        }

        this.cacheStorage = {};
        this.detailedLogging = detailedLogging;

        try {
            const cacheData: Buffer | null | undefined = fs.readFileSync(this.cachePath);
            if (cacheData !== undefined && cacheData !== null) {
                (this.detailedLogging) && this.logger.verbose(`Cache: Using: ${this.cacheName}`); // ${JSON.stringify(this.cacheStorage, null, 4)}`);
  
                this.cacheStorage = JSON.parse(cacheData.toString());

                for (const [key, value] of Object.entries(this.cacheStorage)) {
                    const cacheItem = this.cacheStorage[key];
        
                    if (cacheItem.expiration < new Date().getTime()) {
                        (this.detailedLogging) && this.logger.verbose(`Cache load: '${key}' has expired, deleting`);
                        delete this.cacheStorage[key];
                    } else {
                        (this.detailedLogging) && this.logger.verbose(`Cache load: '${key}' still good.`);
                    }
                }
            } else {
                (this.detailedLogging) && this.logger.verbose(`Cache: Creating: ${this.cacheName}`);
            }
        } catch (e) {
            (this.detailedLogging) && this.logger.verbose(`Cache: Creating: ${this.cacheName}`);
        }
    }

    // Quick check to see if the cache is up to date
    public check(key: string): boolean {
        const cacheItem: KacheItem = this.cacheStorage[key as keyof CacheStorage];
        if (cacheItem === undefined) {
            return false;
        }

        return (cacheItem.expiration > new Date().getTime());
    }    

    public get(key: string): unknown {
        const cacheItem: KacheItem = this.cacheStorage[key as keyof CacheStorage];
        if (cacheItem !== undefined) {
            if (cacheItem.expiration > new Date().getTime()) {
                // object is current
                (this.detailedLogging) && this.logger.verbose(`Cache: Key: '${key}' - cache hit`);
                return cacheItem.item;
            } else {
                // object expired
                (this.detailedLogging) && this.logger.verbose(`Cache: Key: '${key}' - cache expired`);
            }
        } else {
            // object not in cache
            (this.detailedLogging) && this.logger.verbose(`Cache: Key: '${key}' - cache miss`);
        }

        return null;
    }

    public set(key: string, newItem: unknown, expirationTime: number): void {
        const comment: string = new Date(expirationTime).toString();
        (this.detailedLogging) && this.logger.verbose(`Cache set: Key: ${key}, exp: ${comment}`);

        const cacheItem = {expiration: expirationTime, comment: comment, item: newItem};
        this.cacheStorage[key as keyof CacheStorage] =  cacheItem;

        // Does this need to be synchronous?
        fs.writeFileSync(this.cachePath, JSON.stringify(this.cacheStorage, null, 4));
    }
}