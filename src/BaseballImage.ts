// tslint:disable: object-literal-sort-keys
// tslint:disable: no-var-requires
import * as fs from 'fs';
import jpeg from 'jpeg-js';
import path from 'path';
import * as pure from 'pureimage';
import { Cache  } from './Cache.js';
import { Logger } from './Logger.js';
import { BaseballData, GameDayObj, Game } from "./BaseballData";

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

export interface ImageResult {
    expires: string;
    imageType: string;
    imageData: jpeg.BufferRet | null;
}

//const fontDir = __dirname + "/../fonts";

export class BaseballImage {
    private baseballData: BaseballData;
    private dayList: GameDayObj[];
    private logger: Logger;
    private cache: Cache;
    private dirname: string;

    constructor(logger: Logger, dirname: string, cache: Cache) {
        this.logger = logger;
        this.dirname = dirname;
        this.cache = cache;
        this.dayList = [];
        this.baseballData = new BaseballData(this.logger, this.cache);
    }

    // This is the main entry point for this module.
    // Input a 3 letter team abbreviation (see teams.json)
    // Output:
    // return {
    //     jpegImg: jpegImg,
    //     stream: jpegStream,
    //     expires: expires.toUTCString(),
    //     error: ""
    // }
    public async getImage(teamAbbrev: string): Promise<ImageResult> {

        // The teamTable has some extra entries that point to a different abbreviation to lookup
        let teamTable: TeamTable;
        const errorResult: ImageResult = {
            imageData: null,
            expires: "",
            imageType: ""
        };

        try {
            const teamTablePath: string = path.join(this.dirname, "..", "teams.json");
            const sampleBuffer = fs.readFileSync(teamTablePath);
            teamTable = JSON.parse(sampleBuffer.toString());
        } catch (e) {
            this.logger.error(`Could not read Teams Table: ${e.text}`);
            return errorResult;
        }
        
        let teamLookup = "";
        let backgroundColor = "";
        let DrawingColor = "";
        let textColor = "";
        try {
            
            const teamInfo = teamTable[teamAbbrev.toUpperCase()];
            if (teamInfo === undefined) {
                return errorResult;
            }
    
            const redirect: string = teamTable[teamAbbrev.toUpperCase()].redirect;
            if (redirect !== undefined) {
                teamLookup = redirect;
            } else {
                teamLookup = teamAbbrev.toUpperCase();
            }
    
            backgroundColor = teamTable[teamAbbrev].color1; // 'rgb(71, 115, 89)'; // 0xff4f7359 - Fenway green
            DrawingColor = teamTable[teamAbbrev].color2; // 'rgb(200, 200, 200)';
            textColor = teamTable[teamAbbrev].color3; // 'white';
        } catch (e) {
            this.logger.error(`Could not find team ${teamAbbrev}in teams table: ${e.text}`);
            return errorResult;
        }
        

        // let day = await baseballData.getDate(new Date(), teamAbbrev); // Test the cache

        // Get date 2 days ago through 4 days from now.  7 Days total
        for (let dayIndex = -2; dayIndex <= 4; dayIndex++) {
            // const requestDate = new Date("2019/09/10");
            const requestDate = new Date();
            requestDate.setDate(requestDate.getDate() + dayIndex);

            // tslint:disable-next-line:no-console
            // this.logger.info("BaseballImage: [" + teamAbbrev + " (" + teamLookup + ")" + "] Requesting game for date: " + requestDate.toDateString());
            const day: GameDayObj = await this.baseballData.getDate(requestDate, teamLookup);
            this.dayList.push(day);
        }

        // Now sort through the 7 days of games to see which ones to show.
        // * Double headers cause us to show different games than 1/day
        // * dayList  - is the array of 7 days we got above
        // * gameList - is the array of games we will display in the 7 slots
        const gameList: Game[] = [];
        const TODAY = 2; // Index in the array of today's game

        // Slot 0 - if Yesterday was a double header, its game 1, else its the last game from the day before yesterday
        if (this.dayList[TODAY - 1].games.length === 2) {
            gameList[0] = this.dayList[TODAY - 1].games[0]; // First game from yesterday
        } else {
            if (this.dayList[TODAY - 2].games.length === 2) {
                // there was a doubleheader 2 days ago, show the second game
                gameList[0] = this.dayList[TODAY - 2].games[1];
            } else {
                // No double header either day so just show game 1, null if OFF
                gameList[0] = this.dayList[TODAY - 2].games[0];
            }
        }

        // Slot 1 - This is yesterdays game 2 if there was one, otherwise game 1 if played, otherwise null
        if (this.dayList[TODAY - 1].games.length === 2) {
            gameList[1] = this.dayList[TODAY - 1].games[1];
        } else {
            // No double header either day so just show game 1, null if OFF
            gameList[1] = this.dayList[TODAY - 1].games[0];
        }

        // Slots 2..6 - Fill them in with each game.  We may use more slots but we only will display 0-6
        let nextGameSlot = 2; // Today's game 1
        for (let daySlot = TODAY; daySlot <= TODAY + 4; daySlot++) {
            gameList[nextGameSlot++] = this.dayList[daySlot].games[0];

            if (this.dayList[daySlot].games.length === 2) {
                gameList[nextGameSlot++] = this.dayList[daySlot].games[1];
                // console.log("Adding game 2 to the game list");
            }
        }

        const imageHeight = 1080; // 800;
        const imageWidth = 1920; // 1280;

        // const titleFont: string = 'bold 90px sans-serif';   // Title
        // const gamesFont: string = 'bold 90px sans-serif';    // row of game data
        const titleFont = "90px 'OpenSans-Bold'"; // Title
        const gamesFont = "90px 'OpenSans-Bold'"; // row of game data

        const fntBold = pure.registerFont(path.join(this.dirname, "..", "fonts", "OpenSans-Bold.ttf"),'OpenSans-Bold');
        const fntRegular = pure.registerFont(path.join(this.dirname, "..", "fonts", "OpenSans-Regular.ttf"),'OpenSans-Regular');
        const fntRegular2 = pure.registerFont(path.join(this.dirname, "..", "fonts", "alata-regular.ttf"),'alata-regular');

        fntBold.loadSync();
        fntRegular.loadSync();
        fntRegular2.loadSync();

        const OutlineStrokeWidth = 30;
        const boarderStrokeWidth = 30;
        const boxStrokeWidth = 10;

        const TitleOffset = 120;

        const firstGameYOffset = 265;
        const gameYOffset = 130;

        const boxHeight1 = 110;
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

        const title: string = teamTable[teamLookup].name + " Schedule";

        // Fill the bitmap
        ctx.fillStyle = backgroundColor;
        ctx.lineWidth = boarderStrokeWidth;
        ctx.fillRect(0, 0, imageWidth, imageHeight);

        // Draw the title
        ctx.fillStyle = textColor;
        ctx.font = titleFont;
        const textWidth: number = ctx.measureText(title).width;
        ctx.fillText(title, (imageWidth - textWidth) / 2, TitleOffset);

        // Draw the outline
        ctx.strokeStyle = DrawingColor;
        ctx.lineWidth = OutlineStrokeWidth;
        //ctx.strokeRect(0, 0, imageWidth, imageHeight); // Pure does not seem to use lineWidth in strokeRect
        ctx.beginPath();
        ctx.moveTo(0 + OutlineStrokeWidth / 2, 0 + OutlineStrokeWidth / 2);
        ctx.lineTo(imageWidth, 0 + OutlineStrokeWidth / 2);
        ctx.lineTo(imageWidth, imageHeight);
        ctx.lineTo(0 + OutlineStrokeWidth / 2, imageHeight);
        ctx.lineTo(0 + OutlineStrokeWidth / 2, 0); // Y is all the way up to fill in the top corner
        ctx.stroke();

        // Draw the box for today.  Make it bigger if its a double header
        let boxHeight: number = boxHeight1;
        if (this.dayList[2].games.length === 2) {
            boxHeight = boxHeight2;
        }

        const boxWidth = imageWidth - boxHorMargin;
        const boxLeftX = boxHorMargin;

        // Draw the box
        ctx.strokeStyle = DrawingColor;
        ctx.lineWidth = boxStrokeWidth;
        //ctx.strokeRect(boxLeftX, boxTopY, boxWidth, boxHeight); // Pure does not seem to use lineWidth in strokeRect
        ctx.beginPath();
        ctx.moveTo(boxLeftX, boxTopY);
        ctx.lineTo(boxWidth, boxTopY);
        ctx.lineTo(boxWidth, boxTopY + boxHeight);
        ctx.lineTo(boxLeftX, boxTopY + boxHeight);
        ctx.lineTo(boxLeftX, boxTopY - boxStrokeWidth / 2); // Fill in the little corner that was missed
        ctx.stroke();

        // How long is this image good for
        let goodForMins = 60;

        for (let gameIndex = 0; gameIndex <= 6; gameIndex++) {
            const yOffset: number = firstGameYOffset + gameIndex * gameYOffset;

            const game: Game = gameList[gameIndex];

            const gameDay = game.day;
            const gameDate = game.date;

            if (game.status !== "OFF") {
                ctx.fillStyle = textColor;
                ctx.font = gamesFont;

                let opponent = "";
                let usRuns = "";
                let themRuns = "";
                let homeAway = "";
                let topStr = "";
                let gameTime = "";

                if (game.home_name_abbrev === teamLookup) {
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
                        if (game.home_name_abbrev === teamLookup) {
                            usRuns = game.home_team_runs as string;
                            themRuns = game.away_team_runs as string;
                        } else {
                            usRuns = game.away_team_runs as string;
                            themRuns = game.home_team_runs as string;
                        }

                        if (game.top_inning as string === "Y") {
                            topStr = '^'; //"\u25B2"; // up arrow
                        } else {
                            topStr = 'v'; //"\u25BC"; // down arrow
                        }

                        gameText =
                            usRuns +
                            "-" +
                            themRuns +
                            "    " +
                            topStr +
                            game.inning;
                        goodForMins = 10;
                        break;
                    case "Warmup":
                        gameText = "Warm up";
                        goodForMins = 30;
                        break;
                    case "Pre-game":
                    case "Preview":
                    case "Scheduled":
                        gameText = gameTime;
                        goodForMins = 60;
                        break;
                    case "Final":
                    case "Final: Tied":
                    case "Game Over":
                    case "Completed Early: Rain":
                        if (game.home_name_abbrev === teamLookup) {
                            usRuns = game.home_team_runs as string;
                            themRuns = game.away_team_runs as string;
                        } else {
                            usRuns = game.away_team_runs as string;
                            themRuns = game.home_team_runs as string;
                        }

                        gameText = usRuns + "-" + themRuns + " F";
                        goodForMins = 240;
                        break;
                    case "Postponed":
                        gameText = "PPD";
                        goodForMins = 240;
                        break;
                    case "Suspended":
                    case "Suspended: Rain":
                        gameText = "SPND";
                        goodForMins = 240;
                        break;
                    default:
                        gameText = game.status;
                        break;
                }

                // The 'v' or '@' needs to be centered
                const homeAwayX =
                    homeAwayXOffset - ctx.measureText(homeAway).width / 2;

                ctx.fillText(gameDay, dayXOffset, yOffset);
                ctx.fillText(gameDate, dateXOffset, yOffset);
                ctx.fillText(teamLookup, teamXOffset, yOffset);
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

        const expires = new Date();
        expires.setMinutes(expires.getMinutes() + goodForMins);

        const jpegImg = jpeg.encode(img, 50);

        return {
            imageData: jpegImg,
            imageType: "jpg",
            expires: expires.toUTCString()
        };
    }
}
