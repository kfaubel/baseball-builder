"use strict";

import e from "express";

// var timeStamp = new Date().toISOString();

export class Logger {
    private context:any;
    private module: string;

    constructor(context: any, module: string) {
        this.context = context;
        this.module = module;
    }

    public error(text: string) {
        if (this.context !== null) {
            this.context.log.error(`[${this.module}] ${text}`);
        } else {
            console.error(`[${this.module}] ${text}`);
        }
    }

    public warn(text: string) {
        if (this.context !== null) {
            this.context.log.warn(`[${this.module}] ${text}`);
        } else {
            console.warn(`[${this.module}] ${text}`);
        }
    }

    public log(text: string) {
        if (this.context !== null) {
            this.context.log.log(`[${this.module}] ${text}`);
        } else {
            console.log(`[${this.module}] ${text}`);
        }
    }

    public info(text: string) {
        if (this.context !== null) {
            this.context.log.info(`[${this.module}] ${text}`);
        } else {
            console.info(`[${this.module}] ${text}`);
        }
    }

    public verbose(text: string) {
        if (this.context !== null) {
            this.context.log.verbose(`[${this.module}] ${text}`);
        } else {
            console.debug(`[${this.module}] ${text}`);
        }
    }

    public dump(text: string, obj: object) {
        if (this.context !== null) {
            this.context.log(`[${this.module}] ${text} ${JSON.stringify(obj, undefined, 2)}`);
        } else {
            console.log(`[${this.module}] ${text} ${JSON.stringify(obj, undefined, 2)}`);
        }
    }
}