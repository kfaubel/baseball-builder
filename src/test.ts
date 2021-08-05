/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from "fs";
import path from "path";
import { Logger } from "./Logger";
import { BaseballImage, ImageResult } from "./BaseballImage";
import { Kache } from "./Kache";
import { Team, TeamInfo } from "./TeamInfo";

async function run() {
    const logger = new Logger("baseball-builder", "verbose");

    fs.mkdirSync("./teams/", { recursive: true });

    const cache: Kache = new Kache(logger, "baseball-sched-cache.json");

    const baseballImage = new BaseballImage(logger, cache);

    const teamInfo: TeamInfo = new TeamInfo();
    const teamList = teamInfo.getTeamsList(); 
    //const teamList = ["BOS", "NYM", "CHC", "FENWAY"];

    let exitStatus = 0;

    for (const teamName of teamList) 
    {
        const team: Team | null = teamInfo.lookupTeam(teamName);
        if (team !== null) {
            logger.info(`Test: Starting process for team:  ${teamName}`);
        
            const result: ImageResult | null = await baseballImage.getImage(teamName);

            if (result !== null && result.imageData !== null) {
                const fileName = `./teams/${teamName}.jpg`;
                logger.info(`Test:   Writing from data: ${fileName}`);
                fs.writeFileSync(fileName, result.imageData.data);
            } else {
                logger.error(`Failed to write image for ${team}`);
                exitStatus = 1;
            }
        } else {
            logger.error(`Unable to find team ${teamName}`);
        }
    }

    process.exit(exitStatus);
}

run();