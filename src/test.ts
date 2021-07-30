// lib/app.ts
import * as fs from 'fs';
import path from 'path';

import { Logger } from "./Logger";
import { BaseballImage } from './BaseballImage';
import { Cache } from "./Cache";

interface Team {
    redirect: string;
    color1: string;
    color2: string;
    color3: string;
    name: string;
}

interface TeamTable {
    [key: string]: Team;
}

async function run() {
    const logger = new Logger("baseball-builder");

    fs.mkdirSync(__dirname + '/../teams/', { recursive: true });

    const cache = new Cache(logger);

    const baseballImage = new BaseballImage(logger, __dirname, cache);

    let teamTable: TeamTable;

    try {
        const teamTablePath: string = path.join(__dirname, "..", "teams.json");
        const sampleBuffer = fs.readFileSync(teamTablePath);
        teamTable = JSON.parse(sampleBuffer.toString());
    } catch (e) {
        logger.error(`Could not read Teams Table: ${e.text}`);
        return 1;
    }

    logger.log(`type of teams is: ${typeof(teamTable)}`);
    
    if (!Array.isArray(teamTable)) {
        logger.error(`Team table was not the list expected.`);
        logger.log(`${JSON.stringify(teamTable, null, 4)}`);
        
    }
    const teams = Object.keys(teamTable);

    let exitStatus = 0;

    for (const team of teams) 
    // const team = "FENWAY";
    {
        logger.info(`Test: Starting process for team:  ${team}`)
    
        const result = await baseballImage.getImage(team);

        if (result === null || result.imageData === null) {
            logger.error(`Failed to write image for ${team}`);
            exitStatus = 1;
            continue;
        }
    
        logger.info(`Test:   Writing from data: ./teams/${team}.jpg`);
        // We now get result.jpegImg
        fs.writeFileSync(__dirname +'/../teams/' + team + '.jpg', result.imageData.data);
    }

    process.exit(exitStatus);
}

run();