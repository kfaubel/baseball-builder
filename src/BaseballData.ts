// tslint:disable: object-literal-sort-keys
// tslint:disable: no-var-requires

import axios, { AxiosResponse } from "axios";
import { Logger } from "./Logger.js";
import { Kache } from "./Kache.js";

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

export interface Game {
    status: string;           // "Scheduled"
    series?: string;          // "Regular Season"
    game_type?: string        // "R"
    day: string;
    date: string;
    home_time?: string;
    away_time?: string;
    home_team_runs?: string;
    away_team_runs?: string;
    home_name_abbrev?: string; // BOS
    away_name_abbrev?: string;
    event_time?: string;
    home_score?: string;
    away_score?: string;
    inning?: string;
    top_inning?: string;        // "N"
}

export interface GameDayObj {
    year: string;
    month: string;
    day: string;
    games: Array<Game>;
}

export class BaseballData {
    private logger: Logger;
    private cache: Kache;

    constructor(logger: Logger, cache: Kache) {
        this.logger = logger;
        this.cache = cache;
    }

    public async getDate(gameDate: Date, theTeam: string): Promise<GameDayObj> {
        const gameDayObj: GameDayObj = {
            year: `${gameDate.getFullYear()}`,                    // 2019
            month: ("00" + (gameDate.getMonth() + 1)).slice(-2),  // 10       getMonth() returns 0-11
            day: ("00" + gameDate.getDate()).slice(-2),           // 04       *clever* way to prepend leading 0s
            games: [], 
        };

        const key: string = gameDayObj.year + "_" + gameDayObj.month + "_" + gameDayObj.day;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let baseballJson: any = this.cache.get(key);

        if (baseballJson !== null) {
            //this.logger.log(`BaseballData: Cache hit  for ${theTeam} on ${key}`);
        } else {
            const url = `https://gd2.mlb.com/components/game/mlb/year_${gameDayObj.year}/month_${gameDayObj.month}/day_${gameDayObj.day}/miniscoreboard.json`;

            this.logger.info(`BaseballData: Cache miss for game data: ${key}.  Doing fetch`);
            // this.logger.info("BaseballData: URL: " + url);

            try {
                const response: AxiosResponse = await axios.get(url, {headers: {"Content-Encoding": "gzip"}});
                baseballJson = response.data;

                //this.logger.verbose("MLB response data: " + JSON.stringify(response.data, null, 4));

                let anyActive = false;
                let anyStillToPlay = false;
                let noGames = false;

                // game is actualy an array of objects
                if (Array.isArray(baseballJson.data.games.game)) {
                    for (const game of baseballJson.data.games.game) {
                        switch (game.status) {
                        case "In Progress":
                            anyActive = true;
                            break;
                        case "Warmup":
                        case "Pre-game":
                        case "Pre-Game":
                        case "Preview":
                        case "Scheduled":
                        case "Delayed: Rain":
                            anyStillToPlay = true;
                            break;
                        case "Final":
                        case "Game Over":
                        case "Postponed":
                            break;
                        default:
                            this.logger.warn(`Found new game status: ${game.status}`);
                            anyStillToPlay = true;
                            break;
                        }
                    }
                } else {
                    this.logger.info("BaseballData: No games");
                    noGames = true;
                }
                    
                const midnightThisMorning: Date = new Date();
                midnightThisMorning.setHours(0,0,0,0);
                const midnightTonight: Date = new Date();
                midnightTonight.setHours(23,59,59,0);
                     
                const nowMs: number = new Date().getTime();
                let expirationMs: number; 

                // If any games for this day are still active, keep checking
                // If the games were yesterday (and finished), they never expire
                // if the games are tomorrow, check early tomorrow
                // If the games are still to play (Warmup, ...) check in 30 minutes
                // Everything else we will check in 6 hours.

                if (anyActive) {
                    expirationMs = nowMs + 5 * 60 * 1000; // 5 minutes
                } else if (gameDate < midnightThisMorning  || noGames) {
                    expirationMs = nowMs + 7 * 24 * 60 * 60 * 1000; // previous day so it may be useful for up to 7 days
                } else if (gameDate > midnightTonight) {
                    expirationMs = new Date(midnightTonight).getTime() + 5 * 60 * 1000; // 5 minutes after midnight
                } else if (anyStillToPlay) {
                    expirationMs = nowMs + 60 * 60 * 1000; // 30 minutes
                } else {
                    expirationMs = nowMs + 6 * 60 * 60 * 1000; // 6 hours
                }

                this.cache.set(key, baseballJson, expirationMs);
            } catch (e) {
                this.logger.error("Read baseball sched data: " + e);
            }
            
           
        }

        // We have a valid baseballJson

        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        try {
            if (baseballJson !== null && Array.isArray(baseballJson.data.games.game as Game)) {
                let game: Game;
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
            const dayStr: string = weekdays[gameDate.getDay()];
            const dateStr: string = months[gameDate.getMonth()] + " " + gameDate.getDate();
            const game: Game  = { status: "OFF", day: dayStr, date: dateStr };
            gameDayObj.games.push(game);
        }

        return gameDayObj;
    }
}
