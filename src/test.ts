import * as fs from "fs";
import path, { dirname } from "path";
import { Logger } from "./Logger";
import { BaseballImage, ImageResult } from "./BaseballImage";
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
    const logger = new Logger("baseball-builder", "verbose");

    fs.mkdirSync(__dirname + "/../teams/", { recursive: true });

    const cache: Cache = new Cache(logger, "baseball-sched-cache.json");

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
    
    const teams = Object.keys(teamTable);

    let exitStatus = 0;

    //for (const team of teams) 
    const team = "FENWAY";
    {
        logger.info(`Test: Starting process for team:  ${team}`);
    
        const result: ImageResult | null = await baseballImage.getImage(team);

        if (result !== null && result.imageData !== null) {
            logger.info(`Test:   Writing from data: ./teams/${team}.jpg`);
            fs.writeFileSync(__dirname +"/../teams/" + team + ".jpg", result.imageData.data);
        } else {
            logger.error(`Failed to write image for ${team}`);
            exitStatus = 1;
        }
    }

    process.exit(exitStatus);
}

run();