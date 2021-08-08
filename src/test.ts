/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from "fs";
import path from "path";
import { Logger } from "./Logger";
import { BaseballImage, ImageResult } from "./BaseballImage";
import { Kache } from "./Kache";
import { Team, TeamInfo } from "./TeamInfo";
import { BaseballBuilder } from "./BaseballBuilder";
import { SimpleImageWriter } from "./SimpleImageWriter";

async function run() {
    const logger = new Logger("baseball-builder", "verbose");
    const cache: Kache = new Kache(logger, "baseball-sched-cache.json");
    const simpleImageWriter: SimpleImageWriter = new SimpleImageWriter(logger, ".");
    const baseballBuilder: BaseballBuilder = new BaseballBuilder(logger, cache, simpleImageWriter);
    
    fs.mkdirSync("./teams/", { recursive: true });

    const teamInfo: TeamInfo = new TeamInfo();
    const teamList = teamInfo.getTeamsList(); 
    //const teamList = ["BOS", "NYM", "CHC", "FENWAY"];
    const success: boolean = await baseballBuilder.CreateImages({teamList: teamList});

    return success ? 0 : 1;
}

run();