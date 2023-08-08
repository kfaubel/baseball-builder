/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from "fs";
import { Logger } from "./Logger";
import { Kache } from "./Kache";
import { BaseballScheduleBuilder } from "./BaseballScheduleBuilder";
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

    const logLevel = options.loglevel.toLowerCase();

    const logLevels = ["error", "warn", "info", "verbose"];
    if (!logLevels.includes(logLevel)) {
        console.log(`Unknown log level: ${options.loglevel}`);
        return false;
    } 

    const logger = new Logger("baseball-schedule-builder", logLevel);

    const cache: Kache = new Kache(logger, "baseball-sched-cache.json", options.newcache, (logLevel == "verbose"));

    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, "teams");
    const baseballScheduleBuilder: BaseballScheduleBuilder = new BaseballScheduleBuilder(logger, cache, simpleImageWriter);
    
    fs.mkdirSync("./teams/", { recursive: true });

    //const teamList = ["BOS", "NYM", "CHC", "FENWAY"];
    const success: boolean = await baseballScheduleBuilder.CreateImages({teamList: teamList});

    return success ? 0 : 1;
}

run();