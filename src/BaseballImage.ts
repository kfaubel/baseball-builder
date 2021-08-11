// tslint:disable: object-literal-sort-keys
// tslint:disable: no-var-requires
import jpeg from "jpeg-js";
import path from "path";
import * as pure from "pureimage";
import { KacheInterface  } from "./Kache.js";
import { LoggerInterface } from "./Logger.js";
import { GameDay, Game } from "./BaseballData";
import { Team, TeamInfo } from "./TeamInfo";

export interface ImageResult {
    expires: string;
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

    public async getImage(teamName: string, dayList: Array<GameDay>): Promise<ImageResult | null> {
        // The teamTable has some extra entries that point to a different abbreviation to lookup
        // let teamTable: TeamTable;
        // const teamTablePath: string = path.resolve("teams.json");
        // try {
        //     const sampleBuffer = fs.readFileSync(teamTablePath);
        //     teamTable = JSON.parse(sampleBuffer.toString());
        // } catch (e) {
        //     this.logger.error(`Could not read Teams Table: ${teamTablePath} ${e.text}`);
        //     return null;
        // }

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
        const gameList: Game[] = [];
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

        const OutlineStrokeWidth = 30;
        const boarderStrokeWidth = 30;
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
        ctx.lineWidth = boarderStrokeWidth;
        ctx.fillRect(0, 0, imageWidth, imageHeight);

        // Draw the title
        ctx.fillStyle = team.textColor;
        ctx.font = titleFont;
        const textWidth: number = ctx.measureText(title).width;
        ctx.fillText(title, (imageWidth - textWidth) / 2, TitleOffset);

        // Draw the outline
        ctx.strokeStyle = team.accentColor;
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
                        topStr = "^"; //"\u25B2"; // up arrow
                    } else {
                        topStr = "v"; //"\u25BC"; // down arrow
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
                    if (game.home_name_abbrev === team.abbreviation) {
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
