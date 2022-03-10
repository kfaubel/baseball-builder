// tslint:disable: object-literal-sort-keys
// tslint:disable: no-var-requires
import jpeg from "jpeg-js";
import path from "path";
import * as pure from "pureimage";
import { KacheInterface  } from "./Kache.js";
import { LoggerInterface } from "./Logger.js";
import { GameDay, GameDetails } from "./BaseballData";
import { Team, TeamInfo } from "./TeamInfo";

export interface ImageResult {
    imageType: string;
    imageData: jpeg.BufferRet | null;
}

export class BaseballImage {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    // This optimized fillRect was derived from the pureimage source code: https://github.com/joshmarinacci/node-pureimage/tree/master/src
    // To fill a 1920x1080 image on a core i5, this saves about 1.5 seconds
    // img        - image - it has 3 properties height, width and data
    // x, y       - position of the rect
    // w, h       - size of the rect
    // rgb        - must be a string in this form "#112233"
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private myFillRect(img: any, x: number, y: number, w: number, h: number, rgb: string) {
        const colorValue = parseInt(rgb.substring(1), 16);

        // the shift operator forces js to perform the internal ToUint32 (see ecmascript spec 9.6)
        //colorValue = colorValue >>> 0;
        const r = (colorValue >>> 16) & 0xFF;
        const g = (colorValue >>> 8)  & 0xFF;  
        const b = (colorValue)        & 0xFF;
        const a = 0xFF;

        for(let i = y; i < y + h; i++) {                
            for(let j = x; j < x + w; j++) {   
                const index = (i * img.width + j) * 4;   
                
                img.data[index + 0] = r;
                img.data[index + 1] = g;     
                img.data[index + 2] = b;     
                img.data[index + 3] = a; 
            }
        }
    }

    /**
     * Generate an image with the schedule, scores, times, etc. for a given team
     * @param teamName "BOS"
     * @param dayList Array of 7 days of games (2 back, present and 4 forward) 
     * @returns 
     */
    public async getImage(teamName: string, dayList: Array<GameDay>): Promise<ImageResult | null> {
        const teamInfo: TeamInfo = new TeamInfo();
        const team: Team | null = teamInfo.lookupTeam(teamName);
        if (team === null) {
            this.logger.error(`Could not find team ${teamName}in teams table`);
            return null;
        }

        // Now sort through the 7 days of games to see which ones to show.
        // * Double headers cause us to show different games than 1/day
        // * dayList  - is the array of 7 days we got above
        // * gameList - is the array of games we will display in the 7 slots
        const gameList: GameDetails[] = [];
        const TODAY = 2; // Index in the array of today's game

        // Slot 0 - if Yesterday was a double header, its game 1, else its the last game from the day before yesterday
        if (dayList[TODAY - 1].games.length === 2) {
            gameList[0] = dayList[TODAY - 1].games[0]; // First game from yesterday
        } else {
            if (dayList[TODAY - 2].games.length === 2) {
                // there was a doubleheader 2 days ago, show the second game
                gameList[0] = dayList[TODAY - 2].games[1];
            } else {
                // No double header either day so just show game 1, null if OFF
                gameList[0] = dayList[TODAY - 2].games[0];
            }
        }

        // Slot 1 - This is yesterdays game 2 if there was one, otherwise game 1 if played, otherwise null
        if (dayList[TODAY - 1].games.length === 2) {
            gameList[1] = dayList[TODAY - 1].games[1];
        } else {
            // No double header either day so just show game 1, null if OFF
            gameList[1] = dayList[TODAY - 1].games[0];
        }

        // Slots 2..6 - Fill them in with each game.  We may use more slots but we only will display 0-6
        let nextGameSlot = 2; // Today's game 1
        for (let daySlot = TODAY; daySlot <= TODAY + 4; daySlot++) {
            gameList[nextGameSlot++] = dayList[daySlot].games[0];

            if (dayList[daySlot].games.length === 2) {
                gameList[nextGameSlot++] = dayList[daySlot].games[1];
                // console.log("Adding game 2 to the game list");
            }
        }

        const imageHeight = 1080; 
        const imageWidth = 1920; 

        const titleFont = "90px 'OpenSans-Bold'"; // Title
        const gamesFont = "90px 'OpenSans-Bold'"; // row of game data

        // When used as an npm package, fonts need to be installed in the top level of the main project
        const fntBold     = pure.registerFont(path.join(".", "fonts", "OpenSans-Bold.ttf"),"OpenSans-Bold");
        const fntRegular  = pure.registerFont(path.join(".", "fonts", "OpenSans-Regular.ttf"),"OpenSans-Regular");
        const fntRegular2 = pure.registerFont(path.join(".", "fonts", "alata-regular.ttf"),"alata-regular");

        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        const boarderStrokeWidth = 20;
        const boxStrokeWidth = 10;

        const TitleOffset = 120;

        const firstGameYOffset = 265;
        const gameYOffset = 130;

        const boxHeight1 = 115;
        const boxHeight2 = boxHeight1 + gameYOffset; // Double header
        const boxHorMargin = 30;
        const boxTopY = 440;

        
        const dayXOffset = 40;
        const dateXOffset = 320;
        const teamXOffset = 700;
        const homeAwayXOffset = 955;
        const opponentXOffset = 1050;
        const gameTextXOffset = 1300;

        //const canvas = createCanvas(imageWidth, imageHeight);
        //const ctx = canvas.getContext('2d');
        const img = pure.make(imageWidth, imageHeight);
        const ctx = img.getContext("2d");

        // Canvas reference
        // origin is upper right
        // coordinates are x, y, width, height in that order
        // to set a color: ctx.fillStyle = 'rgb(255, 255, 0)'
        //                 ctx.fillStyle = 'Red'
        //                 ctx.setFillColor(r, g, b, a);
        //                 ctx.strokeStyle = 'rgb(100, 100, 100)';

        const title: string = team.name + " Schedule";

        // Fill the bitmap
        ctx.fillStyle = team.backgroundColor;
        //ctx.lineWidth = boarderStrokeWidth;
        //ctx.fillRect(0, 0, imageWidth, imageHeight);
        this.myFillRect(img, 0, 0, imageWidth, imageHeight, team.backgroundColor);

        // Draw the title
        ctx.fillStyle = team.textColor;
        ctx.font = titleFont;
        const textWidth: number = ctx.measureText(title).width;
        ctx.fillText(title, (imageWidth - textWidth) / 2, TitleOffset);

        // Draw the outline
        ctx.strokeStyle = team.accentColor;
        ctx.lineWidth = boarderStrokeWidth;
        //ctx.strokeRect(0, 0, imageWidth, imageHeight); // Pure does not seem to use lineWidth in strokeRect
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(imageWidth, 0);
        ctx.lineTo(imageWidth, imageHeight);
        ctx.lineTo(0, imageHeight);
        ctx.lineTo(0, boarderStrokeWidth/2); 
        ctx.stroke();

        // Draw the box for today.  Make it bigger if its a double header
        let boxHeight: number = boxHeight1;
        if (dayList[2].games.length === 2) {
            boxHeight = boxHeight2;
        }

        const boxWidth = imageWidth - boxHorMargin;
        const boxLeftX = boxHorMargin;

        // Draw the box
        ctx.strokeStyle = team.accentColor;
        ctx.lineWidth = boxStrokeWidth;
        //ctx.strokeRect(boxLeftX, boxTopY, boxWidth, boxHeight); // Pure does not seem to use lineWidth in strokeRect
        ctx.beginPath();
        ctx.moveTo(boxLeftX - boxStrokeWidth / 2, boxTopY);
        ctx.lineTo(boxWidth, boxTopY);
        ctx.lineTo(boxWidth, boxTopY + boxHeight);
        ctx.lineTo(boxLeftX, boxTopY + boxHeight);
        ctx.lineTo(boxLeftX, boxTopY + boxStrokeWidth / 2); // Fill in the little corner that was missed
        ctx.stroke();

        for (let gameIndex = 0; gameIndex <= 6; gameIndex++) {
            const yOffset: number = firstGameYOffset + gameIndex * gameYOffset;

            const game: GameDetails = gameList[gameIndex];

            const gameDay = game.day;
            const gameDate = game.date;

            if (game.status !== "OFF") {
                ctx.fillStyle = team.textColor;
                ctx.font = gamesFont;

                let opponent = "";
                let usRuns = "";
                let themRuns = "";
                let homeAway = "";
                let topStr = "";
                let gameTime = "";

                if (game.home_name_abbrev === team.abbreviation) {
                    opponent = game.away_name_abbrev as string;
                    gameTime = game.home_time as string;
                    homeAway = "v";
                } else {
                    opponent = game.home_name_abbrev as string;
                    gameTime = game.away_time as string;
                    homeAway = "@";
                }

                let gameText = "";
                switch (game.status) {
                case "In Progress":
                    if (game.home_name_abbrev === team.abbreviation) {
                        usRuns = game.home_team_runs as string;
                        themRuns = game.away_team_runs as string;
                    } else {
                        usRuns = game.away_team_runs as string;
                        themRuns = game.home_team_runs as string;
                    }

                    if (game.top_inning as string === "Y") {
                        topStr = "Top "; //"\u25B2"; // up arrow
                    } else {
                        topStr = "Bot "; //"\u25BC"; // down arrow
                    }

                    gameText =
                            usRuns +
                            "-" +
                            themRuns +
                            "   " +
                            topStr +
                            game.inning;
                    break;
                case "Warmup":
                    gameText = "Warm up";
                    break;
                case "Pre-game":
                case "Preview":
                case "Scheduled":
                    gameText = gameTime;
                    break;
                case "Final":
                case "Final: Tied":
                case "Game Over":
                case "Completed Early: Rain":
                    if (game.home_name_abbrev === team.abbreviation) {
                        usRuns = game.home_team_runs as string;
                        themRuns = game.away_team_runs as string;
                    } else {
                        usRuns = game.away_team_runs as string;
                        themRuns = game.home_team_runs as string;
                    }

                    gameText = usRuns + "-" + themRuns + " F";
                    break;
                case "Postponed":
                    gameText = "PPD";
                    break;
                case "Suspended":
                case "Suspended: Rain":
                    gameText = "SPND";
                    break;
                default:
                    gameText = game.status;
                    break;
                }

                // The 'v' or '@' needs to be centered
                const homeAwayX = homeAwayXOffset - ctx.measureText(homeAway).width / 2;

                ctx.fillText(gameDay, dayXOffset, yOffset);
                ctx.fillText(gameDate, dateXOffset, yOffset);
                ctx.fillText(team.abbreviation, teamXOffset, yOffset);
                ctx.fillText(homeAway, homeAwayX, yOffset);
                ctx.fillText(opponent, opponentXOffset, yOffset);
                ctx.fillText(gameText, gameTextXOffset, yOffset);
            } else {
                // No game
                ctx.fillText(gameDay, dayXOffset, yOffset);
                ctx.fillText(gameDate, dateXOffset, yOffset);
                ctx.fillText("Off", gameTextXOffset, yOffset);
            }
        }

        const jpegImg = jpeg.encode(img, 90);

        return {
            imageData: jpegImg,
            imageType: "jpg"
        };
    }
}
