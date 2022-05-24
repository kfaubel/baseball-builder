/* eslint-disable @typescript-eslint/no-explicit-any */
// tslint:disable: object-literal-sort-keys
// tslint:disable: no-var-requires

import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { LoggerInterface } from "./Logger.js";
import { KacheInterface } from "./Kache.js";
import { mlbinfo } from "mlbinfo";
import moment from "moment-timezone";  // https://momentjs.com/timezone/docs/ &  https://momentjs.com/docs/

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

/**
 * Structure we return so the image can render game data
 * * This is externally facing
 */
export interface GameDetails {
    abstractState: string;      // Final. Live, Preview (We add Off if there we no games scheduled)
    detailedState?: string;     // Scheduled, Warmup, Pre-game, Pre-Game, Preview, "In Progress"Delayed, Final, Game Over, Postponed
    reason?: string;            // Not always included, value see so far is "Rain"
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
// Observed status values:
// abstractGameState      detailedState      codedGameState    stausCode    abstractGameCode   Comment
// Final                  Final              F                 F            F
// Final                  Completed Early    F                 FO           F                  Tie 
// Final                  Completed Early    F                 OO           F                  Tie
// Final                  Game Over          O                 O            F                  
// Final                  Final              F                 FT           F                  Tie
// Final                  Cancelled          C                 CR           F                  Cancelled
// Final                  Postponed          
// Final                  Suspended   
// Final                  Postponed          D                 DR           F                  reason=Rain 
// Final                  Postponed          D                 DI           F                  Reason=Inclement Weather      
// Live                   Pre-Game           P                 P            P                  Check this.
// Live                   Warmup             P                 PW           L
// Live                   In Progress        I                 I            L                  Live - active
// Preview                Pre-Game           P                 P            P                  Future Game - < 1hr??
// Preview                Scheduled          S                 S            P                  Future game - > 2:10 hr??
// Preview                Delayed Start      P                 PO           P                  

// RIght now only abstractGameState and detailedState are used.

const knownAbstractGameStates = ["Final", "Live", "Preview", "Off"];
const knownDetailedStates = ["Final", "Completed Early", "Cancelled", "Game Over", "Warmup", "Pre-Game", 
    "In Progress", "Scheduled", "Postponed", "Suspended", "Delayed Start"];
const knownCodedGameState = ["F", "P", "I", "S", "O", "C", "D"];
const knownStatusCodes = ["F", "P", "I", "S", "FT", "FO", "OO", "O", "CR", "FR", "PW", "DR", "DI"];
const knownAbstractGameCode = ["F", "P", "L"];

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
        abstractGameState: string;    // "Final", "Live"...
        detailedState: string;        // "In Progress", "Completed Early"
        codedGameState: string;       // "F"
        statusCode: string;           // 'F', 'FO' ...
        abstractGameCode: string;     // "F"
        reason?: string;              // Not always included, e.g.: "Rain"
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

export class BaseballData {
    private logger: LoggerInterface;
    private cache: KacheInterface;

    constructor(logger: LoggerInterface, cache: KacheInterface) {
        this.logger = logger;
        this.cache = cache;
    }

    /**
     * Quick check to see if there are any changes.
     * 
     * @param theMoment The time for the team we are checking 
     * @returns true if the cache is up to date
     */
    public isCacheCurrent(theMoment: moment.Moment): boolean {
        // Get date 2 days ago through 4 days from now.  7 Days total
        for (let dayIndex = -2; dayIndex <= 4; dayIndex++) { 
            const aMoment = theMoment.clone();          
            const key = aMoment.add(dayIndex, "d").format("YYYY_MM_DD");

            // cache will return null for a missing or expired item
            if (this.cache.get(key) === null) {
                this.logger.verbose(`BaseballData::IsCacheCurrent key: ${key} not found, cache is not current.`);
                return false;
            }
        }
        // none of the cache elements were missing or expired
        this.logger.verbose(`BaseballData::IsCacheCurrent cache is current.`);
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
        this.logger.verbose(`BaseBallData: getGameListForDate: ${gameDayMoment.format()}`);
        const key   = gameDayMoment.format("YYYY_MM_DD");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cachedGameList: GameList | null = this.cache.get(key) as GameList;

        if (cachedGameList !== null) {
            return cachedGameList;
        }

        let feedList: FeedList = [];
        const gameList: GameList = [];
        
        const datePart = gameDayMoment.format("MM/DD/YYYY");
        const url = `http://statsapi.mlb.com/api/v1/schedule/games/?sportId=1&date=${datePart}`;

        this.logger.verbose(`BaseballData: Cache miss for game data: ${key}.  Doing fetch`);
        //this.logger.info(`BaseballData: ${key} Fetching update: ${url}`);

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
            .catch((error: any) => {
                this.logger.warn(`BaseballData: URL: ${url} No data: ${error})`);
            });
        
        try {
            let anyActive = false;
            let anyStillToPlay = false;
            let anyGamesSoon = false;
            let noGames = false;
            const nowMoment = moment();
            let soonestGameMoment = moment().add(10, "d"); // Start 10 days from now

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

                    //const homeTeamInfo: Team = teamInfo.lookupTeam(feedGame.teams.home.team.id);
                    //const awayTeamInfo: Team = teamInfo.lookupTeam(feedGame.teams.away.team.id);
                    const homeTeamInfo = mlbinfo.getTeamById(feedGame.teams.home.team.id);
                    const awayTeamInfo = mlbinfo.getTeamById(feedGame.teams.away.team.id);

                    const gameMoment = moment(feedGame.gameDate);                    
                    const homeTime = homeTeamInfo?.timeZone ? gameMoment.clone().tz(homeTeamInfo.timeZone).format("h:mm A") : ""; // "7:05 PM"                  
                    const awayTime = awayTeamInfo?.timeZone ? gameMoment.clone().tz(awayTeamInfo.timeZone).format("h:mm A") : ""; // "7:05 PM"

                    // Is this game in the future and sooner than any game we have seen so far?
                    if (gameMoment.isAfter(nowMoment) && gameMoment.isBefore(soonestGameMoment)) {
                        soonestGameMoment = gameMoment;
                    }
                    
                    const gameDetail: GameDetails = {
                        abstractState: feedGame.status?.abstractGameState ?? "",        // Final, ...
                        detailedState: feedGame.status?.detailedState ?? "",            // Final, ...
                        reason: feedGame.status?.reason,
                        series: (feedGame.gameType === "R" ? "Regular Season" : ""),    // Regular Season
                        game_type: feedGame.gameType ?? "",                             // R
                        day: gameMoment.format("ddd"),                                  // Tue
                        date: gameMoment.format("MMM D"),                               // May 5
                        home_time: homeTime,                                            // 7:05 PM
                        away_time: awayTime,                                            // 10:05 PM
                        home_team_runs: feedGame.teams.home.score !== undefined ? feedGame.teams.home.score.toString() : "",
                        away_team_runs: feedGame.teams.away.score !== undefined ? feedGame.teams.away.score.toString() : "",
                        home_name_abbrev: homeTeamInfo?.abbreviation, //teamInfo.lookupTeam(feedGame.teams.home.team.id)?.abbreviation ?? "",
                        away_name_abbrev: awayTeamInfo?.abbreviation, //teamInfo.lookupTeam(feedGame.teams.away.team.id)?.abbreviation ?? "", 
                        inning: "?",
                        top_inning: "?"
                    };
                      
                    const gameStr = `${gameMoment.format("MMM DD")} ${gameDetail.home_name_abbrev} v ${gameDetail.away_name_abbrev}       `;

                    if (!knownAbstractGameStates.includes(feedGame.status?.abstractGameState ?? "undefined")) {
                        this.logger.info(`BaseballData: +++ ${gameStr.substring(0, 15)} Unknown abstractGameState: ${feedGame.status?.abstractGameState} `);
                        this.logger.info(`basebllDataa: +++ Full Status: ${JSON.stringify(feedGame.status, null, 4)}`);
                    }

                    if (!knownDetailedStates.includes(feedGame.status?.detailedState ?? "undefined")) {
                        this.logger.info(`BaseballData: +++ ${gameStr.substring(0, 15)} Unknown detailedState: ${feedGame.status?.detailedState} `);
                        this.logger.info(`basebllDataa: +++ Full Status: ${JSON.stringify(feedGame.status, null, 4)}`);
                    }

                    if (!knownCodedGameState.includes(feedGame.status?.codedGameState ?? "undefined")) {
                        this.logger.info(`BaseballData: +++ ${gameStr.substring(0, 15)} Unknown codedGameState: ${feedGame.status?.codedGameState} `);
                        this.logger.info(`basebllDataa: +++ Full Status: ${JSON.stringify(feedGame.status, null, 4)}`);
                    }

                    if (!knownStatusCodes.includes(feedGame.status?.statusCode ?? "undefined")) {
                        this.logger.info(`BaseballData: +++ ${gameStr.substring(0, 15)} Unknown statusCode: ${feedGame.status?.statusCode} `);
                        this.logger.info(`basebllDataa: +++ Full Status: ${JSON.stringify(feedGame.status, null, 4)}`);
                    }

                    if (!knownAbstractGameCode.includes(feedGame.status?.abstractGameCode ?? "undefined")) {
                        this.logger.info(`BaseballData: +++ ${gameStr.substring(0, 15)} Unknown abstractGameCode: ${feedGame.status?.abstractGameCode} `);
                        this.logger.info(`basebllDataa: +++ Full Status: ${JSON.stringify(feedGame.status, null, 4)}`);
                    }
                    
                    switch (feedGame.status?.abstractGameState) {
                    //const knownAbstractGameStates = ["Final", "Live", "Preview", "Off"];
                    //const knownDetailedStates = ["Final", "Completed Early", "Cancelled", "Game Over", "Warmup", "Pre-Game", "In Progress", "Scheduled", "Postponed", "Suspended", "Delayed Start"];
                    case "Final":
                        break;
                    case "Live":
                        anyActive = true;
                        break;
                    case "Preview":
                        anyStillToPlay = true;
                        if (feedGame.status?.detailedState !== undefined && feedGame.status?.detailedState === "Pre-Game" ) {
                            anyGamesSoon = true;
                        }
                        break;
                    default:
                        this.logger.warn(`BaseballData: Unknown abstractGameState: (Date: ${gameDetail.date} Home: ${gameDetail.home_name_abbrev}):  ${feedGame.status?.abstractGameState}, assuming still to play`);
                        //this.logger.warn(`  ${JSON.stringify(feedGame.status, null, 4)}`);
                        anyStillToPlay = true;
                        break;
                    }

                    gameList.push(gameDetail);
                }
            } else {
                this.logger.verbose("BaseballData: No games");
                noGames = true;
            }
                    
            const nowMs: number = moment().valueOf();
            const soonestGameMs = soonestGameMoment.valueOf();
            const soonestGameDuration = moment.duration(soonestGameMs - nowMs);

            let expirationMs: number; 

            // If any games for this day are still active, keep checking every 10 minutes, it could be 2AM the next day
            // If the games were yesterday (and finished), keep for 7 days
            // if the games are tomorrow, check early tomorrow
            // If the games are still to play (Warmup, ...) check in 30 minutes
            // Everything else we will check in 6 hours.
            
            if (noGames) {
                expirationMs = nowMs + 7 * 24 * 60 * 60 * 1000; // no games - save this record for 7 days
            } else {
                // There are games scheduled for this day
                if (anyActive) {
                    // Games are underway, update in 10 minutes
                    expirationMs = nowMs + 10 * 60 * 1000;
                } else {
                    // No games are active
                    if (anyStillToPlay) {
                        // Still games for this day
                        //this.logger.info(`BaseballData: ${key}: Soonest future game is in: ${soonestGameDuration.humanize()}`);
                        if (anyGamesSoon) {
                            // Some games are in Pre-Game or Warmup
                            expirationMs = nowMs + 30 * 60 * 1000; // 30 minutes
                        } else {
                            if (soonestGameDuration.asMilliseconds() < 60 * 60 * 1000) {
                                // Not sure how a game can start in less than an hour but not be in Warmup...
                                expirationMs = nowMs + 60 * 60 * 1000; 
                            } else if (soonestGameDuration.asMilliseconds() < 26 * 60 * 60 * 1000) {
                                // Soonest game is within 26 hours, check every 2 hours for changes
                                // We don't want to check for exactly 24 hours or we could miss the Warmup
                                expirationMs = nowMs + 2 * 60 * 60 * 1000;
                            } else {
                                // soonest game is a day away, check back in 24 hours
                                expirationMs = nowMs + 24 * 60 * 60 * 1000;
                            }
                        }
                    } else {
                        // All games are finished, possibly on previous days
                        expirationMs = nowMs + 7 * 24 * 60 * 60 * 1000; 
                    }
                }
            }
            this.logger.info(`BaseballData: ${key}: anyActive: ${anyActive ? "Y" : "N"}, anyStillToPlay: ${anyStillToPlay ? "Y" : "N"}, anyGamesSoon: ${anyGamesSoon ? "Y" : "N"}, noGames: ${noGames ? "Y" : "N"}  Exp: ${moment(expirationMs).format()}`);

            //this.logger.info(`BaseballData: ${key}:  Recheck after: ${moment(expirationMs).format()}`); //("dddd, MMMM Do YYYY, h:mm:ss a Z")}`);
            this.cache.set(key, gameList, expirationMs);
        } catch (e: any) {
            this.logger.error("BaseballData: Read baseball sched data: " + e);
            this.logger.error(`Stack: ${e.stack}`);
        }
            
        return gameList;
    }

    /**
     * Gets game data for the the 2 previous days game(s), the current days game(s) and 4 future days game(s) 
     * * Each day will have at least one "game", even if the status is "OFF"
     * @param teamAbrev "BOS", "LAD", ...
     * @param theMoment Moment object for the day to get the data.
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
            } catch (e) {
                if (e instanceof Error) {
                    this.logger.error(`BaseballScheduleData: ${e.stack}`);
                } else {
                    this.logger.error(`${e}`);
                }
            }
            
            if (gameDay.games.length === 0) {
                gameDay.games.push({ 
                    abstractState: "Off", 
                    day: requestMoment.format("ddd"), 
                    date: requestMoment.format("MMM D") 
                });
            }
            gameDayList.push(gameDay);
        }
        return gameDayList;
    }
}
