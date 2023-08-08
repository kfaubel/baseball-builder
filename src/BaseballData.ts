/* eslint-disable @typescript-eslint/no-explicit-any */
// tslint:disable: object-literal-sort-keys
// tslint:disable: no-var-requires

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { LoggerInterface } from "./Logger.js";
import { KacheInterface } from "./Kache.js";
import { Team, TeamInfo } from "./TeamInfo";
import moment from "moment-timezone";  // https://momentjs.com/timezone/docs/ &  https://momentjs.com/docs/

// From a post on reddit.   This may be what's next
// You don't actually need a login to get at the data. I found most of the endpoints by watching MLB Gameday's
// http requests during the season and working backwards.
// Endpoints: https://statsapi.mlb.com/docs/endpoints/standings
// Here are some endpoints:
// MLB Schedule - http://statsapi.mlb.com/api/v1/schedule/games/?sportId=1
// MLB Schedule for April 10th, 2018 - http://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=04/10/2018
// Rays v. White Sox Live Feed - http://statsapi.mlb.com//api/v1/game/529572/feed/live
// Rays v. White Sox Boxscore - http://statsapi.mlb.com//api/v1/game/529572/boxscore
// Rays v. White Sox Linescore - http://statsapi.mlb.com//api/v1/game/529572/linescore
// Once you start poking around you can figure things out. You can also get scores from offseason leagues.
// For example, here is a score from a game today: http://statsapi.mlb.com//api/v1/game/569984/feed/live

/**
 * Structure we return so the image can render game data
 * * This is externally facing
 */
export interface GameDetails {
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
    inning?: string;            // 9
    top_inning?: string;        // "N"
}

// Object with a single game for a team for a given day
/**
 * Object with game(s) for a team on any given day.
 * * games[] will have 0, 1 or 2 games
 * * 0 - Off day
 * * 1 - Single game
 * * 2 - Doubleheader
 */
export interface GameDay {
    team: string;               // BOS
    year?: string;
    month?: string;
    day?: string;
    games: Array<GameDetails>;  // normally only 1 entry but 2 for a double header
}

/**
 * Array of games
 * * Each game is formatted and ready to be used to build an image
 * * This array contains GameDay elements for 7 days
 */
export type GameList = GameDetails[]; 

/**
 * Format of the feed element for a given game
 * * This is useful to describe the feed
 * * Elements need to be formatted to be useful
 */
interface FeedGame {
    gamePk?: number;
    gameDate: string;                 // ISO date-time
    gameType: string;                 // "R" - Regular Season
    status?: {
        abstractGameState: string;    // "Final", ...
        codeGameState: string;        // "F"
        stausCode: string;            // 'F', ...
    }
    teams?: {
        away: {
            score?: number;
            team: {
                id: number;
                name: string;
                link: string;
            }
        }
        home: {
            score?: number;
            team: {
                id: number;
                name: string;
                link: string;
            }
        }
    }
}

/**
 * This is the games element of the feed
 * * Each element in the array is a FeedGame type
 * * If there are no games, this array will be empty
 */
 type FeedList = FeedGame[]; 
// interface FeedList {
//     games?: Array<FeedGame>
// }

export class BaseballData {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    /**
     * Quick check to see if there are any changes.
     * * Used to skip processing if nothing in the cache is missing or has expired
     */
    public isCacheCurrent(theMoment: moment.Moment): boolean {
        // Get date 2 days ago through 4 days from now.  7 Days total
        for (let dayIndex = -2; dayIndex <= 4; dayIndex++) { 
            const aMoment = theMoment.clone();          
            const key = aMoment.add(dayIndex, "d").format("YYYY_MM_DD");

            // cache will return null for a missing or expired item
            if (this.cache.get(key) === null) {
                return false;
            }
        }
        // none of the cache elements were missing or expired
        return true;
    }

    /**
     * Get all the games for a given data
     * * If there are no games, the array returned will be empty
     * * There could be more than one game for the same team if there is a double header
     * @param gameDayMoment Moment object
     * @returns an array of games for a given date [{"gamePk": 123456, ...}, ... ]
     */
    private async getGameListForDate(gameDayMoment: moment.Moment): Promise<GameList> {
        const key   = gameDayMoment.format("YYYY_MM_DD");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cachedGameList: GameList | null = this.cache.get(key) as GameList;

        if (cachedGameList !== null) {
            return cachedGameList;
        }

        let feedList: FeedList = [];
        const gameList: GameList = [];
        const teamInfo = new TeamInfo();
        
        const datePart = gameDayMoment.format("MM/DD/YYYY");
        const url = `http://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${datePart}`;

        this.logger.verbose(`BaseballData: Cache miss for game data: ${key}.  Doing fetch`);
        this.logger.verbose("BaseballData: URL: " + url);

        const options: AxiosRequestConfig = {
            responseType: "json",
            headers: {                        
                "Content-Encoding": "gzip"
            },
            timeout: 20000
        };
        
        const startTime = new Date();
        await axios.get(url, options)
            .then((res: AxiosResponse) => {
                if (typeof process.env.TRACK_GET_TIMES !== "undefined" ) {
                    this.logger.info(`BaseballData: GET TIME: ${new Date().getTime() - startTime.getTime()}ms`);
                }

                if (typeof res?.data?.dates?.[0]?.games !== "undefined" ) {
                    feedList = res.data.dates[0].games as FeedList;
                }
                
            })
            .catch((error) => {
                this.logger.warn(`BaseballData: URL: ${url} No data: ${error})`);
            });
        
        try {
            let anyActive = false;
            let anyStillToPlay = false;
            let noGames = false;

            // game is actualy an array of objects
            if (Array.isArray(feedList) && feedList.length !== 0) {
                for (const feedGame of feedList) {
                    if (typeof feedGame?.teams?.home?.team?.id == "undefined" ||
                        typeof feedGame?.teams?.away?.team?.id == "undefined"
                    ) {
                        this.logger.warn("BaseballData: Malformed feedGame. Skipping");
                        this.logger.warn(`BaseballData: URL was: ${url}`);
                        this.logger.verbose(`feedGame: ${JSON.stringify(feedGame, null, 4)}`);
                        continue;
                    }

                    const homeTeamInfo: Team = teamInfo.lookupTeam(feedGame.teams.home.team.id);
                    const awayTeamInfo: Team = teamInfo.lookupTeam(feedGame.teams.away.team.id);

                    const gameMoment = moment(feedGame.gameDate);                    
                    const homeTime = homeTeamInfo.timeZone ? gameMoment.clone().tz(homeTeamInfo.timeZone).format("h:mm A") : ""; // "7:05 PM"                  
                    const awayTime = awayTeamInfo.timeZone ? gameMoment.clone().tz(awayTeamInfo.timeZone).format("h:mm A") : ""; // "7:05 PM"
                    
                    const gameDetail: GameDetails = {
                        status: feedGame.status?.abstractGameState ?? "",               // Final, ...
                        series: (feedGame.gameType === "R" ? "Regular Season" : ""),    // Regular Season
                        game_type: feedGame.gameType ?? "",                             // R
                        day: gameMoment.format("ddd"),                                  // Tue
                        date: gameMoment.format("MMM D"),                               // May 5
                        home_time: homeTime,                                            // 7:05 PM
                        away_time: awayTime,                                            // 10:05 PM
                        home_team_runs: feedGame.teams.home.score !== undefined ? feedGame.teams.home.score.toString() : "",
                        away_team_runs: feedGame.teams.away.score !== undefined ? feedGame.teams.away.score.toString() : "",
                        home_name_abbrev: teamInfo.lookupTeam(feedGame.teams.home.team.id)?.abbreviation ?? "",
                        away_name_abbrev: teamInfo.lookupTeam(feedGame.teams.away.team.id)?.abbreviation ?? "", 
                        inning: "?",
                        top_inning: "N"
                    };

                    if (feedGame.status?.abstractGameState !== undefined) {
                        switch (feedGame.status.abstractGameState) {
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
                            this.logger.warn(`BaseballData: Found new game status: ${feedGame.status}`);
                            anyStillToPlay = true;
                            break;
                        }
                    }

                    gameList.push(gameDetail);
                }
            } else {
                this.logger.verbose("BaseballData: No games");
                noGames = true;
            }

            const midnightThisMorning = moment().clone().hour(0).minute(0).second(0).millisecond(0);
            const midnightTonight     = moment().clone().hour(23).minutes(59).second(59).millisecond(999);
                    
            const nowMs: number = moment().valueOf();
            let expirationMs: number; 

            // If any games for this day are still active, keep checking every 5 minutes
            // If the games were yesterday (and finished), keep for 7 days
            // if the games are tomorrow, check early tomorrow
            // If the games are still to play (Warmup, ...) check in 30 minutes
            // Everything else we will check in 6 hours.

            if (anyActive) {
                expirationMs = nowMs + 15 * 60 * 1000; // 5 minutes
            } else if (gameDayMoment < midnightThisMorning  || noGames) {
                expirationMs = nowMs + 7 * 24 * 60 * 60 * 1000; // previous day so it may be useful for up to 7 days
            } else if (gameDayMoment > midnightTonight) {
                expirationMs = midnightTonight.valueOf() + 5 * 60 * 1000; // 5 minutes after midnight
            } else if (anyStillToPlay) {
                expirationMs = nowMs + 60 * 60 * 1000; // 30 minutes
            } else {
                expirationMs = nowMs + 6 * 60 * 60 * 1000; // 6 hours
            }

            this.logger.verbose(`BaseballData: Updateing cache: ${key}, Expiration: ${moment(expirationMs).format("dddd, MMMM Do YYYY, h:mm:ss a")}`);
            this.cache.set(key, gameList, expirationMs);
        } catch (e: any) {
            this.logger.error("BaseballData: Read baseball sched data: " + e);
            this.logger.error(`Stack: ${e.stack}`);
            gameList == null;
        }
            
        return gameList;
    }

    /**
     * Gets game data for the the 2 previous days game(s), the current days game(s) and 4 future days game(s) 
     * * Each day will have at least one "game", even if the status is "OFF"
     * @param teamAbrev "BOS", "LAD", ...
     * @returns Array of 7 GameDay elements.  {team, day, date, games[]}
     */
    public async getTeamGames(teamAbrev: string, theMoment: moment.Moment): Promise<Array<GameDay> | null> {
        const gameDayList: Array<GameDay> = [];
        // Get date 2 days ago through 4 days from now.  7 Days total
        for (let dayIndex = -2; dayIndex <= 4; dayIndex++) {
            const requestMoment = theMoment.clone();
            requestMoment.add(dayIndex, "d");

            const gameList: GameList = await this.getGameListForDate(requestMoment);
            
            // gameDay will have 1 or 2 entries.  If there was no game we add an "Off" game
            const gameDay: GameDay = {
                team: teamAbrev, 
                year: requestMoment.format("YYYY"),
                month: requestMoment.format("MM"),
                day: requestMoment.format("DD"),
                games: []
            }; 

            try {
                if (Array.isArray(gameList)) {
                    // Loop through all the games for the day and add games for this team to the gameDay games array
                    for (const game of gameList) {
                        if (game.away_name_abbrev === teamAbrev || game.home_name_abbrev === teamAbrev) {
                            gameDay.games.push(game);                        
                        }
                    }
                }
            } catch (e: any) {
                this.logger.error("BaseballData: Error processing, baseballJson from site.  Did the result format change?");
                this.logger.error(`Stack: ${e.stack}`);
            }
            
            if (gameDay.games.length === 0) {
                gameDay.games.push({ 
                    status: "OFF", 
                    day: requestMoment.format("ddd"), 
                    date: requestMoment.format("MMM D") 
                });
            }
            gameDayList.push(gameDay);
        }
        return gameDayList;
    }
}
