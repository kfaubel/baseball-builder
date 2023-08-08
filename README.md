# baseball-schedule-builder
Build screens for MLB teams with the the past two games, current game and next 4 games

test.ts shows how to use the module

The normal use of this module is to build an npm module that can be used as part of a bigger progress.

index.d.ts describes the interface for the module

The logger and Kache interfaces are dependency injected into the module.  Simple versions are provided and used by the test wrapper.

Once instanciated, the CreateImages() method can be called with a json object that contains one element that is an array of strings with the team abbreviations (BOS, LAD, KC, SF, ...). The full list along with the colors for each team are in the teams.json file.

To use the test wrapper to build a screen, run the following command.  
```
$ npm start

or

$ node app.js --newcache --loglevel verbose BOS LAD MIL TOR HOU Fenway
```

This example generates screens for the Boston Red Sox, Los Angeles Dodgers, Milwaukee Brewers, Toronto Blue Jays, and Houston Astros.  The screens are generated in the current directory.

The colors are defined in the teams.json file.  The colors are the official colors of the teams.  The colors are used to build the screens.  Note there is a special team called "Fenway" that generates a screen for the Boston Red Sox using the colors of the Green Monster.

--nowcache is used to force the module to download the schedule from MLB.com.  If the module has already downloaded the schedule, it will use the cached version.  If you want to force the module to download the schedule, use --newcache.

--loglevel verbose is used to show the progress of the module.  If you want to see less output, use --loglevel info.

