// tslint:disable: object-literal-sort-keys
// tslint:disable: no-var-requires

const convert = require("xml-js");
const axios = require("axios");
const fs = require("fs");

//import { Cache } from "./Cache";

// From a post on reddit.   This may be what's next
// You don't actually need a login to get at the data. I found most of the endpoints by watching MLB Gameday's
// http requests during the season and working backwards.
// Here are some endpoints:
// MLB Schedule - http://statsapi.mlb.com/api/v1/schedule/games/?sportId=1
// MLB Schedule for April 10th, 2018 - http://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=04/10/2018
// Rays v. White Sox Live Feed - http://statsapi.mlb.com//api/v1/game/529572/feed/live
// Rays v. White Sox Boxscore - http://statsapi.mlb.com//api/v1/game/529572/boxscore
// Rays v. White Sox Linescore - http://statsapi.mlb.com//api/v1/game/529572/linescore
// Once you start poking around you can figure things out. You can also get scores from offseason leagues.
// For example, here is a score from a game today: http://statsapi.mlb.com//api/v1/game/569984/feed/live

// New data source : https://www.baseball.gov/documentation/services-web-api
// Not all data is present

// Key elements in a game object
// "away_file_code": "la",
// "away_loss": "33",
// "away_name_abbrev": "LAD",
// "away_team_runs": "",
// "away_time": "4:05",
// "away_win": "63",
// "game_type": "R",
// "home_loss": "46",
// "home_name_abbrev": "PHI",
// "home_team_runs": "",
// "home_win": "48",
// "inning": "",
// "series": "Regular Season",
// "status": "Scheduled",
// "top_inning": "N"

export class BaseballData {
    private logger;
    private cache;

    constructor(logger: any, cache: any) {
        this.logger = logger;
        this.cache = cache;
    }

    public async getDate(gameDate, theTeam: string) {
        const gameDayObj: any = {
            year: gameDate.getFullYear(), // 2019

            month: ("00" + (gameDate.getMonth() + 1)).slice(-2), // 10       getMonth() returns 0-11
            day: ("00" + gameDate.getDate()).slice(-2), // 04       *clever* way to prepend leading 0s
            games: [] as any[], // Not very satisfying but does prevent an inferred "never" error below
        };

        const key = gameDayObj.year + "_" + gameDayObj.month + "_" + gameDayObj.day;

        let baseballJson: any = null;

        baseballJson = this.cache.get(key);

        if (baseballJson !== null) {
            //this.logger.log(`BaseballData: Cache hit  for ${theTeam} on ${key}`);
        } else {
            const url = `https://gd2.mlb.com/components/game/mlb/year_${gameDayObj.year}/month_${gameDayObj.month}/day_${gameDayObj.day}/miniscoreboard.json`;

            this.logger.info(`BaseballData: Cache miss for game data: ${key}.  Doing fetch`);
            // this.logger.info("BaseballData: URL: " + url);

            await axios
                .get(url)
                .then((response: any) => {
                    baseballJson = response.data;

                    //console.log("MLB response data: " + JSON.stringify(response.data, null, 4));

                    let anyActive: boolean = false;
                    let anyStillToPlay: boolean = false;

                    if (Array.isArray(baseballJson.data.games.game)) {
                        for (const game of baseballJson.data.games.game) {
                            switch (game.status) {
                                case "In Progress":
                                    anyActive = true;
                                    break;
                                case "Warmup":
                                case "Pre-game":
                                case "Preview":
                                case "Scheduled":
                                    anyStillToPlay = true;
                                    break;
                                case "Final":
                                case "Game Over":
                                    break;
                                default:
                                    anyStillToPlay = true;
                                    break;
                            }
                        }
                    } else {
                        this.logger.info("BaseballData: No games");
                    }
                    
                    let midnight = new Date().setHours(0,0,0,0);
                     
                    const nowMs: number = new Date().getTime();
                    let expirationMs: number; 

                    if (gameDate < midnight) {
                        expirationMs = nowMs + 100 * 365 * 24 * 60 * 60 * 1000; // previous day so never expires (100 years from now)
                    } else if (anyActive) {
                        expirationMs = nowMs + 5 * 60 * 1000; // 5 minutes
                    } else if (anyStillToPlay) {
                        expirationMs = nowMs + 60 * 60 * 1000; // 30 minutes
                    } else {
                        expirationMs = nowMs + 6 * 60 * 60 * 1000; // 6 hours
                    }

                    let usefulUntil: number = nowMs + 7 * 24 * 60 * 60 * 1000; // useful for 7 days, then purge it.

                    this.cache.set(key, baseballJson, expirationMs, usefulUntil);
                })
                .catch((error: any) => {
                    // handle error
                    // tslint:disable-next-line:no-console
                    this.logger.error("BaseballData: Error: " + error + " " + error.stack);
                });
        }

        // We have a valid baseballJson

        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        try {
            if (baseballJson !== null && Array.isArray(baseballJson.data.games.game)) {
                let game: any = null;
                for (game of baseballJson.data.games.game) {
                    if (game.away_name_abbrev === theTeam || game.home_name_abbrev === theTeam) {
                        //this.logger.log("BaseballData: Game Day: " + theTeam + " " + JSON.stringify(game.id, null, 4));

                        // the day and date for later
                        game.day = weekdays[gameDate.getDay()];
                        game.date = months[gameDate.getMonth()] + " " + gameDate.getDate();

                        // fix up game time (missing in spring training games)
                        if (typeof game.away_time === "undefined") {
                            game.away_time = game.event_time;
                            game.home_time = game.event_time;
                        }

                        // fix up runs (missing in spring training games)
                        if (typeof game.home_team_runs === "undefined") {
                            game.home_team_runs = game.home_score;
                            game.away_team_runs = game.away_score;
                        }

                        gameDayObj.games.push(game);
                    }
                }
            }
        } catch (e) {
            this.logger.error("BaseballData: Error processing, baseballJson from site.  Did the result format change?");
        }

        // For whatever reason
        if (gameDayObj.games.length === 0) {
            const dayStr = weekdays[gameDate.getDay()];
            const dateStr = months[gameDate.getMonth()] + " " + gameDate.getDate();
            const game = { status: "OFF", day: dayStr, date: dateStr };
            gameDayObj.games.push(game);
        }

        // tslint:disable-next-line:no-console
        // console.log("Game Day: " + JSON.stringify(gameDayObj, null, 4));

        return gameDayObj;
    }
}
