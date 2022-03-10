export interface Team {
    name: string;
    abbreviation: string;
    backgroundColor: string;
    accentColor: string;
    textColor: string;
    redirect?: string;
    timeZone: string;
}

export interface TeamId {
    abbreviation: string;
}

export interface Teams {
    [key: string]: Team;
}

export interface TeamIds {
    [key: string]: TeamId;
}

export class TeamInfo {
    public getTeamsList(): Array<string> {
        return Object.keys(teamsTable);
    }

    /**
     * Look up the Team object
     * @param teamName abreviation (BOS) or team ID (111)
     * @returns Team object with name, abr, colors
     */
    public lookupTeam(teamName: string | number): Team {
        if (teamName === undefined) {
            return teamsTable["NUL"];
        } 

        let teamAbbr = "";

        if (typeof teamName === "number") {
            teamAbbr = teamIdTable[teamName].abbreviation;
            if (typeof teamAbbr === "undefined") {
                return teamsTable["NUL"];
            }
        } else {
            teamAbbr = teamName.toUpperCase();
        }
        // // if NOT NOT A NUMBER
        // if (!isNaN(parseInt(teamName))) {
        //     teamAbbr = teamIdTable[teamName].abbreviation;
        //     if (typeof teamAbbr === "undefined") {
        //         return teamsTable["NUL"];
        //     }
        // } else {
        //     teamAbbr = teamName.toUpperCase();
        // }

        const team: Team = teamsTable[teamAbbr];
        if (team === undefined) {
            return teamsTable["NUL"];
        }

        return team;
    }
}

const teamIdTable: TeamIds = {
    108: {
        abbreviation: "LAA"
    },
    109: {
        abbreviation: "ARI"
    },
    110: {
        abbreviation: "BAL"
    },
    111: {
        abbreviation: "BOS"
    },
    112: {
        abbreviation: "CHC"
    },
    113: {
        abbreviation: "CIN"
    },
    114: {
        abbreviation: "CLE"
    },
    115: {
        abbreviation: "COL"
    },
    116: {
        abbreviation: "DET"
    },
    117: {
        abbreviation: "HOU"
    },
    118: {
        abbreviation: "KC"
    },
    119: {
        abbreviation: "LAD"
    },
    120: {
        abbreviation: "WSH"
    },
    121: {
        abbreviation: "NYM"
    },
    133: {
        abbreviation: "OAK"
    },
    134: {
        abbreviation: "PIT"
    },
    135: {
        abbreviation: "SD"
    },
    136: {
        abbreviation: "SEA"
    },
    137: {
        abbreviation: "SF"
    },
    138: {
        abbreviation: "STL"
    },
    139: {
        abbreviation: "TB"
    }, 
    140: {
        abbreviation: "TEX"
    }, 
    141: {
        abbreviation: "TOR"
    }, 
    142: {
        abbreviation: "MIN"
    }, 
    143: {
        abbreviation: "PHI"
    }, 
    144: {
        abbreviation: "ATL"
    }, 
    145: {
        abbreviation: "CWS"
    }, 
    146: {
        abbreviation: "MIA"
    },
    147: {
        abbreviation: "NYY"
    },
    158: {
        abbreviation: "MIL"
    }
};

const teamsTable: Teams = {
    NUL: {
        name: "NULL",
        abbreviation: "NUL",
        backgroundColor: "000000",
        accentColor: "#808080",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    ARI: {
        name: "Arizona Diamondbacks",
        abbreviation: "ARI",
        backgroundColor: "#A71930",
        accentColor: "#E3D4AD",
        textColor: "#FFFFFF",
        timeZone: "America/Los_Angeles"
    },
    ATL: {
        name: "Atlanta Braves",
        abbreviation: "ATL",
        backgroundColor: "#13274F",
        accentColor: "#CE1141",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    BAL: {
        name: "Baltimore Orioles",
        abbreviation: "BAL",
        backgroundColor: "#DF4601",
        accentColor: "#000000",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    BOS: {
        name: "Boston Red Sox",
        abbreviation: "BOS",
        backgroundColor: "#BD3039",
        accentColor: "#0C2340",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    CHC: {
        name: "Chicago Cubs",
        abbreviation: "CHC",
        backgroundColor: "#0E3386",
        accentColor: "#CC3433",
        textColor: "#FFFFFF",
        timeZone: "America/Chicago"
    },
    CWS: {
        name: "Chicago White Sox",
        abbreviation: "CWS",
        backgroundColor: "#27251F",
        accentColor: "#C4CED4",
        textColor: "#FFFFFF",
        timeZone: "America/Chicago"
    },
    CIN: {
        name: "Cincinnati Reds",
        abbreviation: "CIN",
        backgroundColor: "#C6011F",
        accentColor: "#000000",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    COL: {
        name: "Colorado Rockies",
        abbreviation: "COL",
        backgroundColor: "#33006F",
        accentColor: "#C4CED4",
        textColor: "#C4CED4",
        timeZone: "America/Denver"
    },
    CLE: {
        name: "Cleveland Indians",
        abbreviation: "CLU",
        backgroundColor: "#0C2340",
        accentColor: "#E31937",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    DET: {
        name: "Detroit Tigers",
        abbreviation: "DET",
        backgroundColor: "#0C2340",
        accentColor: "#FA4616",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    HOU: {
        name: "Houston Astros",
        abbreviation: "HOU",
        backgroundColor: "#002D62",
        accentColor: "#EB6E1F",
        textColor: "#FFFFFF",
        timeZone: "America/Chicago"
    },
    KC: {
        name: "Kansas City Royals",
        abbreviation: "KC",
        backgroundColor: "#004687",
        accentColor: "#BD9B60",
        textColor: "#FFFFFF",
        timeZone: "America/Chicago"
    },
    LAA: {
        name: "Los Angeles Angels of Anaheim",
        abbreviation: "LAA",
        backgroundColor: "#BA0021",
        accentColor: "#003263",
        textColor: "#C4CED4",
        timeZone: "America/Los_Angeles"
    },
    LAD: {
        name: "Los Angeles Dodgers",
        abbreviation: "LAD",
        backgroundColor: "#005A9C",
        accentColor: "#EF3E42",
        textColor: "#FFFFFF",
        timeZone: "America/Los_Angeles"
    },
    MIA: {
        name: "Miami Marlins",
        abbreviation: "MIA",
        backgroundColor: "#000000",
        accentColor: "#00A3E0",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    MIL: {
        name: "Milwaukee Brewers",
        abbreviation: "MIL",
        backgroundColor: "#12284B",
        accentColor: "#FFC52F",
        textColor: "#FFFFFF",
        timeZone: "America/Chicago"
    },
    MIN: {
        name: "Minnesota Twins",
        abbreviation: "MIN",
        backgroundColor: "#002B5C",
        accentColor: "#D31145",
        textColor: "#FFFFFF",
        timeZone: "America/Chicago"
    },
    NYM: {
        name: "New York Mets",
        abbreviation: "NYM",
        backgroundColor: "#002D72",
        accentColor: "#FF5910",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    NYY: {
        name: "New York Yankees",
        abbreviation: "NYY",
        backgroundColor: "#003087",
        accentColor: "#E4002C",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    OAK: {
        name: "Oakland Athletics",
        abbreviation: "OAK",
        backgroundColor: "#003831",
        accentColor: "#EFB21E",
        textColor: "#FFFFFF",
        timeZone: "America/Los_Angeles"
    },
    PHI: {
        name: "Philadelphia Phillies",
        abbreviation: "PHI",
        backgroundColor: "#E81828",
        accentColor: "#002D72",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    PIT: {
        name: "Pittsburgh Pirates",
        abbreviation: "PIT",
        backgroundColor: "#27251F",
        accentColor: "#FDB827",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    SD: {
        name: "San Diego Padres",
        abbreviation: "SD",
        backgroundColor: "#2F241D",
        accentColor: "#FFC425",
        textColor: "#FFFFFF",
        timeZone: "America/Los_Angeles"
    },
    SF: {
        name: "San Francisco Giants",
        abbreviation: "SF",
        backgroundColor: "#FD5A1E",
        accentColor: "#27251F",
        textColor: "#FFFFFF",
        timeZone: "America/Los_Angeles"
    },
    SEA: {
        name: "Seattle Mariners",
        abbreviation: "SEA",
        backgroundColor: "#0C2C56",
        accentColor: "#005C5C",
        textColor: "#C4CED4",
        timeZone: "America/Los_Angeles"
    },
    STL: {
        name: "St Louis Cardinals",
        abbreviation: "STL",
        backgroundColor: "#C41E3A",
        accentColor: "#FEDB00",
        textColor: "#FFFFFF",
        timeZone: "America/Chicago"
    },
    TB: {
        name: "Tampa Bay Rays",
        abbreviation: "TB",
        backgroundColor: "#092C5C",
        accentColor: "#8FBCE6",
        textColor: "#F5D130",
        timeZone: "America/New_York"
    },
    TEX: {
        name: "Texas Rangers",
        abbreviation: "TEX",
        backgroundColor: "#003278",
        accentColor: "#C0111F",
        textColor: "#FFFFFF",
        timeZone: "America/Chicago"
    },
    TOR: {
        name: "Toronto Blue Jays",
        abbreviation: "TOR",
        backgroundColor: "#134A8E",
        accentColor: "#E8291C",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },
    WSH: {
        name: "Washington Nationals",
        abbreviation: "WSH",
        backgroundColor: "#AB0003",
        accentColor: "#14225A",
        textColor: "#FFFFFF",
        timeZone: "America/New_York"
    },    
    FENWAY: {
        name: "Boston Red Sox",
        abbreviation: "BOS",
        redirect: "BOS",
        backgroundColor: "#4f7359",
        accentColor: "#E0E0E0",
        textColor: "#E0E0E0",
        timeZone: "America/New_York"
    }
};