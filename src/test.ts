// lib/app.ts
import fs = require('fs');
import stream = require('stream');
import util = require('util');

import { Logger } from "./Logger";
import { BaseballImage } from './BaseballImage';

const teamTable = require('../teams.json');

const logger = new Logger(null, "test");

fs.mkdirSync(__dirname + '/../teams/', { recursive: true })

// Create a new express application instance
async function run() {
    const baseballImage = new BaseballImage(new Logger(null, "baseball-builder"));
    const teams = Object.keys(teamTable);

    for (let team of teams) 
    // const team = "FENWAY";
    {
        logger.info(`Test: Starting process for team:  ${team}`)
    
        const result = await baseballImage.getImageStream(team);
    
        logger.info(`Test: Writing from data: ./teams/${team}.jpg`);
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
}

run();