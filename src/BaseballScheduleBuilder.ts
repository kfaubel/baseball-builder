/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { BaseballImage, ImageResult } from "./BaseballImage";
import { KacheInterface } from "./Kache";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { BaseballData, GameDay } from "./BaseballData";
import { mlbinfo, Team, Venue } from "mlbinfo";
import moment from "moment-timezone"; // https://momentjs.com/timezone/docs/ &  https://momentjs.com/docs/

interface UpdateItem {
    team: Team;
    fileName: string;
    venue?: Venue;
}
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

        // const fuzzyMoment = moment();  // This is the date for the OS timezone, not the team.  IsCachedCurrent will handle this.
        // if (this.baseballData.isCacheCurrent(fuzzyMoment)) {
        //     this.logger.info(`No cache changes since last time, images are up to date.`);
        //     return true;
        // }

        try {
            const baseballImage: BaseballImage = new BaseballImage(this.logger, this.cache);

            if (params.teamList === undefined) {
                this.logger.error("CreateImages: params does not include a teamList");
                return false;
            }

            const updateList: UpdateItem[] = [];

            // Build the update list 
            for (const itemName of params.teamList) {
                let teamName = itemName;
                
                // Is it a venue name
                const venue = mlbinfo.getVenueByShortName(itemName);
                if (typeof venue !== "undefined") {
                    teamName = mlbinfo.getTeamByVenueId(venue.id)?.abbreviation;
                }

                const team = mlbinfo.getTeamByAbbreviation(teamName);

                if (typeof team === "undefined") {
                    this. logger.error(`CreateImages: Unable to find team ${teamName}`);
                    continue;
                }

                const nowMoment = moment().tz(team.timeZone);
                this.logger.verbose(`CreateImages: Starting process for team:  ${teamName} at ${nowMoment.format("MM/DD/YYYY")}`);

                // Check the cache using the date for the specific team we are interested in.
                if (this.baseballData.isCacheCurrent(nowMoment)) {
                    this.logger.info(`CreateImages:   ${itemName}.jpg is up to date`);
                    continue;
                }
                updateList.push({team: team, fileName: `${itemName}.jpg`, venue: venue});
            }
            
            // Update all the teams that are out of date.
            for (const item of updateList) {
                
                // let teamName: string | undefined = itemName;
                // const fileName = `${itemName}.jpg`;

                // // Is it a venue name
                // const venue = mlbinfo.getVenueByShortName(itemName);
                // if (typeof venue !== "undefined") {
                //     teamName = mlbinfo.getTeamByVenueId(venue.id)?.abbreviation;
                // }

                // if (typeof teamName === "undefined") {
                //     this.logger.error(`CreateImages:   teamName for ${itemName} is undefined somehow`);
                //     continue;
                // }

                // const team = mlbinfo.getTeamByAbbreviation(teamName);

                // if (typeof team === "undefined") {
                //     this. logger.error(`CreateImages: Unable to find team ${teamName}`);
                //     continue;
                // }

                // We need to use the date for the team location.  
                // It may be Tuesday 5/24/2022 in UTC or ET but its Monday 5/23/2022 in Seattle
                // const nowMoment = moment("20220619").tz(team.timeZone); // Test for a specific day
                const nowMoment = moment().tz(item.team.timeZone);
                this.logger.verbose(`CreateImages: Starting process for team:  ${item.team.abbreviation} at ${nowMoment.format("MM/DD/YYYY")}`);

                const dayList: Array<GameDay> | null = await this.baseballData.getTeamGames(item.team.abbreviation, nowMoment);

                if (dayList === null) {
                    exitStatus = false;
                    continue;
                }
            
                const result: ImageResult | null = await baseballImage.getImage(item.team.abbreviation, dayList, item.venue?.id);

                if (result !== null && result.imageData !== null) {
                    this.logger.info(`CreateImages:   Writing from data: ${item.fileName}`);
                    this.writer.saveFile(item.fileName, result.imageData.data);
                } else {
                    this. logger.error(`CreateImages: Failed to write image for ${item.team.abbreviation}`);
                    exitStatus = false;
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
