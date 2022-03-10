/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from "fs";
import path from "path";
import { Logger } from "./Logger";
import { BaseballImage, ImageResult } from "./BaseballImage";
import { Kache } from "./Kache";
import { Team, TeamInfo } from "./TeamInfo";
import { BaseballBuilder } from "./BaseballBuilder";
import { SimpleImageWriter } from "./SimpleImageWriter";
import { Command } from "commander";


async function run() {
    const program = new Command();
    let teamList: string [] = [];

    program 
        .option("--loglevel <level>", "set the log level (error, warn, info, verbose", "info")
        .option("--newcache", "Force a new cache", false)
        .arguments("<teams...>")
        .action(function(teams) {
            teamList = teams;
        });
    
    program.parse();

    const options = program.opts();

    const logLevels = ["error", "warn", "info", "verbose"];
    if (!logLevels.includes(options.loglevel.toLowerCase())) {
        console.log(`Unknown log level: ${options.loglevel}`);
        return false;
    } 

    console.log(teamList);

    const logLevel = options.loglevel.toLowerCase();

    const logger = new Logger("baseball-builder", logLevel);

    const cache: Kache = new Kache(logger, "baseball-sched-cache.json", options.newcache, (logLevel == "verbose"));

    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, "teams");
    const baseballBuilder: BaseballBuilder = new BaseballBuilder(logger, cache, simpleImageWriter);
    
    fs.mkdirSync("./teams/", { recursive: true });

    const teamInfo: TeamInfo = new TeamInfo();
    //const teamList = teamInfo.getTeamsList(); 
    //const teamList = ["BOS", "NYM", "CHC", "FENWAY"];
    const success: boolean = await baseballBuilder.CreateImages({teamList: teamList});

    return success ? 0 : 1;
}

run();