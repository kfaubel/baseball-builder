// lib/app.ts
import fs = require('fs');
import stream = require('stream');
import util = require('util');

import { Logger } from "./Logger";
import { BaseballImage } from './BaseballImage';
import { Cache } from "./Cache";
import { exit } from 'process';

const teamTable = require('../teams.json');

const logger = new Logger("BaseballImage test");

fs.mkdirSync(__dirname + '/../teams/', { recursive: true });

const cache = new Cache(logger);

// Create a new express application instance
async function run() {
    const baseballImage = new BaseballImage(logger, cache);
    const teams = Object.keys(teamTable);

    let exitStatus = 0;

    for (let team of teams) 
    // const team = "FENWAY";
    {
        logger.info(`Test: Starting process for team:  ${team}`)
    
        const result = await baseballImage.getImageStream(team);

        if (result === null || result.jpegImg === null) {
            logger.error(`Failed to write image for ${team}`);
            exitStatus = 1;
            continue;
        }
    
        logger.info(`Test:   Writing from data: ./teams/${team}.jpg`);
        // We now get result.jpegImg
        fs.writeFileSync(__dirname +'/../teams/' + team + '.jpg', result.jpegImg.data);

        // logger.info(`Writing from stream: ./teams/${team}2.jpg`);

        // if (result.stream !== null) {
        //     const out = fs.createWriteStream(__dirname +'/../teams/' + team + '2.jpg');
        //     const finished = util.promisify(stream.finished);

        //     result.stream.pipe(out);
            
        //     out.on('finish', () =>  logger.info('The jpg from a stream file was created.'));

        //     await finished(out); 
        // } else {
        //     logger.warn("No result stream");
        // }
    }

    process.exit(exitStatus);
}

run();