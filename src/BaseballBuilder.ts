/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LoggerInterface } from "./Logger";
import { BaseballImage, ImageResult } from "./BaseballImage";
import { KacheInterface } from "./Kache";
import { Team, TeamInfo } from "./TeamInfo";
import { ImageWriterInterface } from "./SimpleImageWriter";
import { BaseballData, GameDay } from "./BaseballData";
import moment from "moment-timezone";

// export interface BaseBallBuilderParams {
//     teamList: Array<string>;
// }

export class BaseballBuilder {
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
        const nowMoment = moment(); // now

        try {
            if (this.baseballData.isCacheCurrent(nowMoment)) {
                this.logger.info("No cache changes since last time, images are up to date.");
                return true;
            }

            const baseballImage: BaseballImage = new BaseballImage(this.logger, this.cache);
            const teamInfo: TeamInfo = new TeamInfo();

            if (params.teamList === undefined) {
                this.logger.error("CreateImages: params does not include a teamList");
                return false;
            }
            
            for (const teamName of params.teamList) {
                const team: Team | null = teamInfo.lookupTeam(teamName);
                if (team !== null) {
                    this.logger.verbose(`CreateImages: Starting process for team:  ${teamName} at ${nowMoment.format()}`);

                    const dayList: Array<GameDay> | null = await this.baseballData.getTeamGames(team.abbreviation, nowMoment);
                    if (dayList === null) {
                        exitStatus = false;
                        continue;
                    }

                    this.logger.verbose(`dayList for ${team.abbreviation}\n${JSON.stringify(dayList, null, 4)}`);
                
                    const result: ImageResult | null = await baseballImage.getImage(teamName, dayList);

                    if (result !== null && result.imageData !== null) {
                        const fileName = `${teamName}.jpg`;
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
        } catch (e:any) {
            this.logger.error(`CreateImages: exception: ${e}`);
            this.logger.error(`Stack: ${e.stack}`);
        }

        return exitStatus;
    }
}
