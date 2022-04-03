/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { BaseballImage, ImageResult } from "./BaseballImage";
import { KacheInterface } from "./Kache";
//import { Team, TeamInfo } from "./TeamInfo";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { BaseballData, GameDay } from "./BaseballData";
import { mlbinfo } from "mlbinfo";
import moment from "moment-timezone"; // https://momentjs.com/timezone/docs/ &  https://momentjs.com/docs/

// export interface BaseBallBuilderParams {
//     teamList: Array<string>;
// }

export class BaseballScheduleBuilder {
    private logger: LoggerInterface;
    private cache: KacheInterface;
    private writer: ImageWriterInterface;
    private baseballData: BaseballData;

    constructor(logger: LoggerInterface, cache: KacheInterface, writer: ImageWriterInterface) {
        this.logger = logger;
        this.cache = cache; 
        this.writer = writer;
        this.baseballData = new BaseballData(this.logger, this.cache);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async CreateImages(params: any): Promise<boolean>{
        let exitStatus = true;

        const fuzzyMoment = moment();  // This is the date for the OS timezone, not the team.  IsCachedCurrent will handle this.
        if (this.baseballData.isCacheCurrent(fuzzyMoment)) {
            this.logger.info(`No cache changes since last time, images are up to date.`);
            return true;
        }

        try {
            const baseballImage: BaseballImage = new BaseballImage(this.logger, this.cache);

            if (params.teamList === undefined) {
                this.logger.error("CreateImages: params does not include a teamList");
                return false;
            }
            
            for (const itemName of params.teamList) {
                
                let teamName = itemName;

                // Is it a venue name
                const venue = mlbinfo.getVenueByShortName(itemName);
                if (typeof venue !== "undefined") {
                    teamName = mlbinfo.getTeamByVenueId(venue.id)?.abbreviation;
                }

                const team = mlbinfo.getTeamByAbbreviation(teamName);

                if (typeof team !== "undefined") {
                    // We need to use the date for the team location.  
                    // It may be Tuesday 5/24/2022 in UTC or ET but its Monday 5/23/2022 in Seattle
                    const nowMoment = moment().tz(team.timeZone);
                    this.logger.verbose(`CreateImages: Starting process for team:  ${teamName} at ${nowMoment.format("MM/DD/YYYY")}`);

                    

                    const dayList: Array<GameDay> | null = await this.baseballData.getTeamGames(team.abbreviation, nowMoment);

                    if (dayList === null) {
                        exitStatus = false;
                        continue;
                    }

                    //(`dayList for ${team.abbreviation}\n${JSON.stringify(dayList, null, 4)}`);
                
                    const result: ImageResult | null = await baseballImage.getImage(teamName, dayList, venue?.id);

                    if (result !== null && result.imageData !== null) {
                        const fileName = `${itemName}.jpg`;
                        this.logger.info(`CreateImages:   Writing from data: ${fileName}`);
                        this.writer.saveFile(fileName, result.imageData.data);
                    } else {
                        this. logger.error(`CreateImages: Failed to write image for ${team}`);
                        exitStatus = false;
                    }
                } else {
                    this. logger.error(`CreateImages: Unable to find team ${teamName}`);
                }
            }
        } catch (e) {
            if (e instanceof Error) {
                this.logger.error(`BaseballStandingsBuilder: ${e.stack}`);
            } else {
                this.logger.error(`${e}`);
            }
        }

        return exitStatus;
    }
}
