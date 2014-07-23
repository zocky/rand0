module.exports = {
  pointsToWin: {
    abbr: 'W', min: 3, def: 7, max: 20,
    help: 'The first player to reach this score will win.'
  },
  margin:      {
    abbr: 'M', min: 1, def: 2, max: 2,
    help: 'A player must lead by at least this margin to win the game.'
  },
  suddenDeath: {
    abbr: 'D', min: 1, def: 3, max: 5,
    help: 'When a player reaches pointsToWin + suddenDeath points;  they will win the game regardless of margin.'
  },
  rando:       {
    abbr: 'R', min: 0, def: 1, max: 1,
    help: 'Rando Cardrissian joins the game.'
  },
  goodies:     {
    abbr: 'G', min: 0, def: 0, max: 1,
    help: 'Use goodie cards'
  },
  combinatorix: {
    abbr: 'X', min: 0, def: 1, max: 1,
    help: 'Allows players to combine white cards (e.g. !1+2) in no-goodies mode.'
  },
  cards:       {
    abbr: 'C', min: 2, def: 10, max: 10,
    help: 'How many white cards per player. Influenced by packHeat.'
  },
  packHeat:    {
    abbr: 'H', min: 0, def: 2, max: 2,
    help: 'Players draw at most this many extra cards on multiple pick questions.'
  },
  autoShuffle: {
    abbr: 'S', min: 0, def: 0, max: 1,
    help: 'Should the deck be reshuffled before each game.'
  },
  maxPlayers:  {
    abbr: 'P', min: 3, def: 10, max: 10,
    help: 'Maximum number of players allowed in this game.'
  },
  maxTurns:    {
    abbr: 'T', min: 5, def: 50, max: 300,
    help: 'The game will stop after this many turns, regardless of the score.'
  },
  answerTime:  {
    abbr: 'A', min: 15, def: 90, max: 120,
    help: 'Players have this many seconds to provide an answer.'
  },
  czarTime:    {
    abbr: 'Z', min: 15, def: 90, max: 180,
    help: 'The czar has this many seconds to pick the winner.'
  },
  interval:    {
    abbr: 'I', min: 0, def: 10, max: 30,
    help: 'There will be this many seconds of rest between turns.'
  },
  verbosity:   {
    abbr: 'V', min: 0, def: 4, max: 4,
    help: 'When can players talk: 0 = never; 1 = between turns; 2 = always except during czaring; 3 = like 2; but the czar can talk; 4 = always.'
  }
}
