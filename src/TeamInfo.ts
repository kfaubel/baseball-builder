export interface Team {
    name: string;
    abbreviation: string;
    backgroundColor: string;
    accentColor: string;
    textColor: string;
    redirect?: string;
}

export interface Teams {
    [key: string]: Team;
}

export class TeamInfo {
    public getTeamsList(): Array<string> {
        return Object.keys(teamsTable);
    }

    public lookupTeam(teamName: string): Team | null {     
        teamName = teamName.toUpperCase();

        const team: Team = teamsTable[teamName];
        if (team === undefined) {
            return null;
        }

        return team;
    }
}

const teamsTable: Teams = {
    ARI: {
        name: "Arizona Diamondbacks",
        abbreviation: "ARI",
        backgroundColor: "#A71930",
        accentColor: "#E3D4AD",
        textColor: "#E3D4AD"
    },
    ATL: {
        name: "Atlanta Braves",
        abbreviation: "ATL",
        backgroundColor: "#13274F",
        accentColor: "#CE1141",
        textColor: "#FFFFFF"
    },
    BAL: {
        name: "Baltimore Orioles",
        abbreviation: "BAL",
        backgroundColor: "#DF4601",
        accentColor: "#000000",
        textColor: "#FFFFFF"
    },
    BOS: {
        name: "Boston Red Sox",
        abbreviation: "BOS",
        backgroundColor: "#BD3039",
        accentColor: "#0C2340",
        textColor: "#FFFFFF"
    },
    CHC: {
        name: "Chicago Cubs",
        abbreviation: "CHC",
        backgroundColor: "#0E3386",
        accentColor: "#CC3433",
        textColor: "#FFFFFF"
    },
    CWS: {
        name: "Chicago White Sox",
        abbreviation: "CWS",
        backgroundColor: "#27251F",
        accentColor: "#C4CED4",
        textColor: "#C4CED4"
    },
    CIN: {
        name: "Cincinnati Reds",
        abbreviation: "CIN",
        backgroundColor: "#C6011F",
        accentColor: "#000000",
        textColor: "#FFFFFF"
    },
    COL: {
        name: "Colorado Rockies",
        abbreviation: "COL",
        backgroundColor: "#33006F",
        accentColor: "#C4CED4",
        textColor: "#C4CED4"
    },
    CLE: {
        name: "Cleveland Indians",
        abbreviation: "CLU",
        backgroundColor: "#0C2340",
        accentColor: "#E31937",
        textColor: "#FFFFFF"
    },
    DET: {
        name: "Detroit Tigers",
        abbreviation: "DET",
        backgroundColor: "#0C2340",
        accentColor: "#FA4616",
        textColor: "#FFFFFF"
    },
    HOU: {
        name: "Houston Astros",
        abbreviation: "HOU",
        backgroundColor: "#002D62",
        accentColor: "#EB6E1F",
        textColor: "#FFFFFF"
    },
    KC: {
        name: "Kansas City Royals",
        abbreviation: "KC",
        backgroundColor: "#004687",
        accentColor: "#BD9B60",
        textColor: "#FFFFFF"
    },
    LAA: {
        name: "Los Angeles Angels of Anaheim",
        abbreviation: "LAA",
        backgroundColor: "#BA0021",
        accentColor: "#003263",
        textColor: "#C4CED4"
    },
    LAD: {
        name: "Los Angeles Dodgers",
        abbreviation: "LAD",
        backgroundColor: "#005A9C",
        accentColor: "#FFFFFF",
        textColor: "#FFFFFF"
    },
    MIA: {
        name: "Miami Marlins",
        abbreviation: "MIA",
        backgroundColor: "#000000",
        accentColor: "#00A3E0",
        textColor: "#FFFFFF"
    },
    MIL: {
        name: "Milwaukee Brewers",
        abbreviation: "MIL",
        backgroundColor: "#12284B",
        accentColor: "#FFC52F",
        textColor: "#FFFFFF"
    },
    MIN: {
        name: "Minnesota Twins",
        abbreviation: "MIN",
        backgroundColor: "#002B5C",
        accentColor: "#D31145",
        textColor: "#FFFFFF"
    },
    NYM: {
        name: "New York Mets",
        abbreviation: "NYM",
        backgroundColor: "#002D72",
        accentColor: "#FF5910",
        textColor: "#FFFFFF"
    },
    NYY: {
        name: "New York Yankees",
        abbreviation: "NYY",
        backgroundColor: "#003087",
        accentColor: "#E4002C",
        textColor: "#FFFFFF"
    },
    OAK: {
        name: "Oakland Athletics",
        abbreviation: "OAK",
        backgroundColor: "#003831",
        accentColor: "#EFB21E",
        textColor: "#FFFFFF"
    },
    PHI: {
        name: "Philadelphia Phillies",
        abbreviation: "PHI",
        backgroundColor: "#E81828",
        accentColor: "#002D72",
        textColor: "#FFFFFF"
    },
    PIT: {
        name: "Pittsburgh Pirates",
        abbreviation: "PIT",
        backgroundColor: "#27251F",
        accentColor: "#FDB827",
        textColor: "#FFFFFF"
    },
    SD: {
        name: "San Diego Padres",
        abbreviation: "SD",
        backgroundColor: "#2F241D",
        accentColor: "#FFC425",
        textColor: "#FFFFFF"
    },
    SF: {
        name: "San Francisco Giants",
        abbreviation: "SF",
        backgroundColor: "#FD5A1E",
        accentColor: "#27251F",
        textColor: "#FFFFFF"
    },
    SEA: {
        name: "Seattle Mariners",
        abbreviation: "SEA",
        backgroundColor: "#0C2C56",
        accentColor: "#005C5C",
        textColor: "#C4CED4"
    },
    STL: {
        name: "St Louis Cardinals",
        abbreviation: "STL",
        backgroundColor: "#C41E3A",
        accentColor: "#FEDB00",
        textColor: "#0C2340"
    },
    TB: {
        name: "Tampa Bay Rays",
        abbreviation: "TB",
        backgroundColor: "#092C5C",
        accentColor: "#8FBCE6",
        textColor: "#F5D130"
    },
    TEX: {
        name: "Texas Rangers",
        abbreviation: "TEX",
        backgroundColor: "#003278",
        accentColor: "#C0111F",
        textColor: "#FFFFFF"
    },
    TOR: {
        name: "Toronto Blue Jays",
        abbreviation: "TOR",
        backgroundColor: "#134A8E",
        accentColor: "#E8291C",
        textColor: "#FFFFFF"
    },
    WSH: {
        name: "Washington Nationals",
        abbreviation: "WSH",
        backgroundColor: "#AB0003",
        accentColor: "#14225A",
        textColor: "#FFFFFF"
    },    
    FENWAY: {
        name: "Boston Red Sox",
        abbreviation: "BOS",
        redirect: "BOS",
        backgroundColor: "#4f7359",
        accentColor: "#E0E0E0",
        textColor: "#E0E0E0"
    }
};