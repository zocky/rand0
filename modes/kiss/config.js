module.exports = {
  pointsToWin: {
    abbr: 'W', min: 4, def: 7, max: 15,
    help: 'The first player to reach this score will win.'
  },
  lives:  {
    abbr:'L',
    def: 3,
    min: 1,
    max: 7,
  },
  margin: undefined,
  suddenDeath: undefined,
  rando:       {
    def: 1,
    hide: true,
  },
  friends: {
    abbr: 'F', min: 1, def: 3, max: 10,
    help: 'The likelihood tha rando will be joined by friends on each turn.'
  },
  combinatorix: {
    def: 0,
    hide:true
  },
  maxPlayers:  {
    def: 2,
    min: 2,
    max: 2,
    hide: true
  },
  maxTurns: {
    def: 20
  },
  answerTime:  {
    def: 30, 
    max: 45,
  },
  czarTime:    {
    def: 30, 
    max: 45,
  },
  verbosity:   {
    def: 4,
    hide: true 
  }
}
