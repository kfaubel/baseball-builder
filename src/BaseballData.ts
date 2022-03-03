// tslint:disable: object-literal-sort-keys
// tslint:disable: no-var-requires

import axios, { AxiosResponse } from "axios";
import { LoggerInterface } from "./Logger.js";
import { KacheInterface } from "./Kache.js";

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
    status: string;             // Scheduled, Warmup, Pre-game, Pre-Game, Preview, Delayed, Final, Game Over, Postponed
    series?: string;            // "Regular Season"
    game_type?: string          // "R"
    day: string;                // Tue
    date: string;               // May 5
    home_time?: string;         // "5:05 PM"
    away_time?: string;         // "5:05 PM"
    home_team_runs?: string;    // 4
    away_team_runs?: string;    // 2
    home_name_abbrev?: string;  // BOS
    away_name_abbrev?: string;  // NYY
    event_time?: string;        // "5:05 PM"
    home_score?: string;        // 4
    away_score?: string;        // 2
    inning?: string;            // 9
    top_inning?: string;        // "N"
}

// Object with a single game for a team for a given day
export interface GameDay {
    team: string;
    year?: string;
    month?: string;
    day?: string;
    games: Array<Game>; // normally only 1 entry but 2 for a double header
}

export interface BaseballJson {
    data?: {
        games?: {
            game?: Array<Game>;
        }
    };
}

export class BaseballData {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    private getKeyForDate(date: Date): string {
        const year  = `${date.getFullYear()}`;                     // 2019
        const month = ("00" + (date.getMonth() + 1)).slice(-2);    // 10       getMonth() returns 0-11
        const day   = ("00" + date.getDate()).slice(-2);           // 04       *clever* way to prepend leading 0s
        return `${year}_${month}_${day}`; 
    }

    public isCacheCurrent(): boolean {
        // Get date 2 days ago through 4 days from now.  7 Days total
        for (let dayIndex = -2; dayIndex <= 4; dayIndex++) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() + dayIndex);
            const key = this.getKeyForDate(checkDate);

            // cache will return null for a missing or expired item
            if (this.cache.get(key) === null) {
                return false;
            }
        }
        // none of the cache elements were missing or expired
        return true;
    }

    // Get the games for a given data
    // If its in the cache return the object
    // If its not, fetch the data, add to cache and return it.
    //
    // There could be more than one game for the same team if there is a double header
    public async getMlbDataForDate(gameDate: Date): Promise<BaseballJson | null> {
        const key   = this.getKeyForDate(gameDate); 

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let baseballJson: BaseballJson | null = this.cache.get(key) as BaseballJson;

        if (baseballJson !== null) {
            //this.logger.log(`BaseballData: Cache hit  for ${theTeam} on ${key}`);
            return baseballJson;
        } else {
            const year  = `${gameDate.getFullYear()}`;                     // 2019
            const month = ("00" + (gameDate.getMonth() + 1)).slice(-2);    // 10       getMonth() returns 0-11
            const day   = ("00" + gameDate.getDate()).slice(-2);           // 04       *clever* way to prepend leading 0s
            const url = `https://gd2.mlb.com/components/game/mlb/year_${year}/month_${month}/day_${day}/miniscoreboard.json`;

            this.logger.info(`BaseballData: Cache miss for game data: ${key}.  Doing fetch`);
            this.logger.info("BaseballData: URL: " + url);

            try {
                const response: AxiosResponse = await axios.get(url, {headers: {"Content-Encoding": "gzip"}});
                baseballJson = response.data as BaseballJson;

                // if successful we get:
                // {
                //     ...
                //     "data": {
                //         "games": {
                //             "game": [...]  <== During the offseason, with no games, this is not present
                //         },
                //         "date": "20210111"
                //     }
                // }
                // 
                // If the data is bogus (invalid date) we get: { "message": "Internal server error" } - No data 
                // A completely invalid URL will return a 5xx and be caught below

                let anyActive = false;
                let anyStillToPlay = false;
                let noGames = false;

                // game is actualy an array of objects
                if (baseballJson !== null && 
                    baseballJson !== undefined &&
                    baseballJson.data !== undefined && 
                    baseballJson.data.games !== undefined && 
                    Array.isArray(baseballJson.data.games.game)) {
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

                // If any games for this day are still active, keep checking every 5 minutes
                // If the games were yesterday (and finished), they never expire
                // if the games are tomorrow, check early tomorrow
                // If the games are still to play (Warmup, ...) check in 30 minutes
                // Everything else we will check in 6 hours.

                if (anyActive) {
                    expirationMs = nowMs + 15 * 60 * 1000; // 5 minutes
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
                baseballJson == null;
            }
        }
            
        return baseballJson;
    }

    // This returns a list of 7 day days worth of games for a team
    // Each day will have at least one "game", even if the status is "Off"
    // A day may have 2 games for a double header.
    public async getTeamGames(teamAbrev: string): Promise<Array<GameDay> | null> {
        const dayList: Array<GameDay> = [];
        // Get date 2 days ago through 4 days from now.  7 Days total
        for (let dayIndex = -2; dayIndex <= 4; dayIndex++) {
            const requestDate = new Date();
            requestDate.setDate(requestDate.getDate() + dayIndex);

            const baseballJson: BaseballJson | null = await this.getMlbDataForDate(requestDate);
            if (baseballJson === null) {
                return null;
            }

            const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
            const dayStr: string = weekdays[requestDate.getDay()];
            const dateStr: string = months[requestDate.getMonth()] + " " + requestDate.getDate();
            
            // gameDay will have 1 or 2 entries.  If there was no game we add an "Off" game
            const gameDay: GameDay = {team: teamAbrev, games: []}; 
            try {
                if (baseballJson !== null && 
                    baseballJson.data != undefined && 
                    baseballJson.data.games !== undefined && 
                    Array.isArray(baseballJson.data.games.game)) {
                    let game: Game = { status: "OFF", day: dayStr, date: dateStr };
                    // Loop through all the games for the day and add games for this team to the dayList
                    for (game of baseballJson.data.games.game) {
                        
                        if (game.away_name_abbrev === teamAbrev || game.home_name_abbrev === teamAbrev) {
                            //this.logger.log("BaseballData: Game Day: " + theTeam + " " + JSON.stringify(game.id, null, 4));
    
                            // the day and date for later
                            game.day = dayStr;
                            game.date = dateStr;
    
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
                            gameDay.games.push(game);                        
                        }
                        
                    }
                }
            } catch (e) {
                this.logger.error("BaseballData: Error processing, baseballJson from site.  Did the result format change?");
            }
            // this.logger.info("BaseballImage: [" + teamAbbrev + " (" + teamLookup + ")" + "] Requesting game for date: " + requestDate.toDateString());
            
            if (gameDay.games.length === 0) {
                gameDay.games.push({ status: "OFF", day: dayStr, date: dateStr });
            }
            dayList.push(gameDay);
        }
        return dayList;
    }
}
