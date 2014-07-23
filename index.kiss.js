
if(!process.argv[2] != 'test') process.on('uncaughtException', function(err) {
  console.dir(err);
});

var getUrl = function(u, onResult) {

    var prot = http;
    var req = prot.request(url.parse(u), function(res)
    {
        var output = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
          output += chunk;
        });
        res.on('end', function() {
          console.log(res.statusCode);
          onResult(res.statusCode, output);
        });
    });

    req.on('error', function(err) {
        onResult(err);
    });
    req.end();
};

var capitalize = function(n) {
  n = String(n);
  return n[0].toUpperCase() + n.substr(1);
}

var channel = 'botsagainsthumanity';
var irc = require('irc');
var http = require('http');
var url = require('url');

var client = new irc.Client('irc.freenode.net', 'Rand0', {
    channels: ['#'+channel],
//    userName: 'Rand0:g0ldf1sh',
});

client.addListener('names' , function (ch,names) {
  console.log('names for '+ch);
  if (ch!='#'+channel) return;
  Object.keys(names).forEach(function(nick) {
    if (nick==client.nick) return;
    user(nick).joined();
  })
  client.say('NickServ','IDENTIFY g0ldf1sh');
});

client.addListener('registered', function (msg) {
  console.log('registered:',msg);
});
client.addListener('motd', function (msg) {
  console.log('motd:',msg);
});

client.addListener('join#' + channel, function (nick) {
  
  if (nick==client.nick) {
    console.log('joined #'+channel);
    return;
  }
  user(nick).joined();
});

client.addListener('part#' + channel, function (nick) {
  user(nick).parted();
});

client.addListener('quit', function (nick) {
  user(nick).parted();
});



function MSORT (what, how, opt) {
  how = String(how);
  var keys = Object.keys(what);
  var fnkey = function(n){ return n};
  var fnval = function(n){ return what[n]};

  var by = fnval;
  var ret = fnval;
  var method = function(a,b){return a < b ? -1 : a > b ? 1 : 0 };
  var reverse = false;
  var filter = function() { return true};

  if (how.match(/\bkeys\b/)) ret = by = fnkey;
  if (how.match(/\bvalues\b/)) ret = by = fnval;
  if (how.match(/\bbykey\b/)) by = fnkey;
  if (how.match(/\bbyvalue\b/)) by = fnval;
  if (how.match(/\balpha\b/)) method = function(a,b) {return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0 }
  if (how.match(/\bdesc\b/)) reverse = true;;
  if (how.match(/\breverse\b/)) reverse = true;;
  
  opt = opt || {};
  if (typeof (opt) == 'function') {
    filter = opt;
  } else {
    if (opt.by) by = opt.by;
    if (opt.ret) ret = opt.ret;
    if (opt.method) method = opt.method;
    if (opt.filter) method = opt.method;
    if ('reverse' in opt) reverse = !!opt.reverse;
  }  
  var ret = keys
  .filter(filter)
  .sort(function(a,b){
    return method(by(a),by(b))
  })
  .map(ret);
  
  if(reverse) ret.reverse();
  return ret;
}




onGlobalCmd = function(from,message,respond,respondError) {
  respondError = respondError || respond;
  var m = message.match(/^\s*!(\S+)(\s+(\S+))?(\s+(\S+))?\s*$/);
  if (!m) return;
  var cmd = m[1];
  var a1 = m[3];
  var a2 = m[5];
  switch(cmd) {
  case 'help':
    respond('!list, !new, !join [nick], !wiki, !reload');
    break;

  case 'list':
    var ret = [];
    for (var i in Game.games) {
      var g = Game.games[i];
      ret.push(g.owner + ' (' + g.countPlayers + '/' + g.settings.maxPlayers + ') ' + (g.state == 'wait' ? 'waiting' : 'in progress '));
    }
    respond( (ret.length ? formatWhite(ret) : 'no games exist at the moment.'));
    break;
  case 'new':
    if (player(from)) {
      return respondError('you\'re already playing in a game. Use !leave first.');
    }
    new Game(from);
    return respond('you created a game. Check your private messages.');
    break;
  case 'join':
    var gg = Object.keys(Game.games);
    if (!a1 && gg.length == 1) {
      Game.games[gg[0]].joinPlayer(from);
      return respond('you joined a game. Check your private messages.');
    }
    if (!a1) return respondError('specify the user you want to join.');
    if (Number(a1)>0 && a1 <= gg.length) a1 = gg[a1-1];
    var p1 = player(a1);
    if (!p1) return respondError(a1 + ' is not in any game.');
    p1.game.joinPlayer(from);
    respond('you joined a game. Check your private messages.');
    return;
  case 'leave':
    var p = player(from);
    if (!p) return respondError('you are not in any game.');
    p.game.leavePlayer(p);
    return respond('You left the game.');
  case 'users':
    return respond(Object.keys(User.users).map(function(u) { return (!User.users[u].present ? '[-]':'')+(User.users[u].player ? '[×]':'')+u} ).join(', '));
  case 'reload':
    Cards.load(function() {
      respond('you reloaded the cards.');
    })
    return;
  case 'wiki':
    return respond(Cards.wiki+Cards.root);
  case 'decks':
  case 'deck':
    return respond(formatDecks(''));
  default:
    return respond('Unknown command. Use !help.');
  }
}

client.addListener('message#' + channel, function (from, message) {
  onGlobalCmd(from, message, function(msg) {
    client.say('#'+channel,from+', ' +msg)
  })
});

client.addListener('pm', function (from, message) {
  if (!user(from).present) {
    client.say(from,"Join #"+channel+" and then we'll talk.");
    return;
  }
  var p = player(from);
  if (message[0]=='?') message = '!wtf ' + message.slice(1);
  var m = message.match(/^[!.,]([^\s.]\S*)(\s+(\S+))?(\s+(\S+))?\s*.*$/);
  if (!m) {
    if (!p) client.say(from,'Join a game from #'+channel+' and then we\'ll talk.');
    else p.game.onSay(p,message);
    return;
  }
  var cmd = m[1];
  var a1 = m[3];
  var a2 = m[5];
  if (p) p.game.doCmd(p,message.slice(1));
  else onGlobalCmd(from, message, function(msg) {
    client.say(from,('           !'+cmd).slice(-12) + ' | '+ msg);
  });
});

function User(nick) {
  this.nick = nick;
  this.score = 0;
}

User.users = {};

function user(nick) {
  if (!User.users[nick]) User.users[nick] = new User(nick);
  return User.users[nick];
}

User.prototype = {
  tell: function(msg) {
    client.say(this.nick,msg);
  },
  joined: function() {
    this.present = true;
  },
  parted: function() {
    if (this.player) this.player.leaveGame();
    this.present = false;
  },
  toString: function() {
    return this.nick;
  }
}


var Player = function( game , u ) {
//  console.log('making player ' + u + ' for game ' + game);
  this.game = game;
  this.user = user(u);
  this.nick = this.user.nick;
  this.user.player = this;
  game.players[ this.nick ] = this;
  this.white = [];
}

Player.prototype = {
  destroy: function() {
    delete this.user.player;
    delete this.game.players[ this.nick ];
  },
  leaveGame: function() {
    this.game.leavePlayer(this);
  },
  toString: function() {
    return this.nick;
  },
  tell: function(msg) {
    this.user.tell(msg);
  }
}

var player = function(nick) {
  return user(nick).player;
}


Array.prototype.shuffle = function() {
  array = this.concat();
  var tmp, current, top = array.length;

  if(top) while(--top) {
      current = Math.floor(Math.random() * (top + 1));
      tmp = array[current];
      array[current] = array[top];
      array[top] = tmp;
  }
  return array;
}

Object.shuffle = function(obj) {
  var keys = Object.keys(obj).shuffle();
  var ret = {};
  keys.forEach(function(i){
    ret[i] = obj[i];
  });
  return ret;
}
var formatWhite = function (list,prefix,wrap) {
  console.log(list);
  var l = 0;
  var bits = list.map(function(n,i) {
    if (prefix===undefined) var p ='!' + (i+1);
    else if (typeof prefix == 'function') var p = prefix(n,i+1);
    else var p = prefix + (i+1);

    if (wrap===undefined) var v = n+'';
    else if (typeof wrap == 'function') var v = wrap(n,i+1);
    else v = wrap ;

    var nl = '';
/*    if (l>200) {
      var nl = '\n\n             | ';
      l = 0;
    }
    
    l+=p.length+v.length+4;
*/    
    return nl + '4,0 '+ p +'1,0'+(p?' ':'') +v+' ';
  });
  return bits.join(' ');
}

var formatDecks = function (prefix) {
  var decks = MSORT(Cards.decks,'keys');
  
  return decks.map(function(n,i) {
    var d = Cards.decks[n];
    if (prefix===undefined) var p ='!' + (i+1);
    else if (typeof prefix == 'function') var p = prefix(n,i+1)+(i+1);
    else var p = prefix + (i+1);

    var v = n + ' ' + (d.black ? d.black.length : d.white.length);
    
    return d.black ? '5,1 '+ p +'0,1 ' +v+' ' : '4,0 '+ p +'1,0 ' +v+' ';
  }).join(' ')
}

function Game(owner,opt) {
//  console.log('starting game '+owner);
  opt = opt || {};
  this.settings = {};
  for (var i in Game.settings) this.set(i,opt[i] !== undefined ? opt[i] : opt[i.toLowerCase()]);
  this.scores = {};
  this.usedBlack = [];
  this.usedWhite = [];
  this.players = {};
  this.countPlayers = 0;
//  this.nicks = [];
  this.state = 'wait';
  this.id = owner;  
  Game.games[this.id] = this;
  this.joinPlayer(user(owner));
  this.owner = this.players[owner];
  this.tell(this.owner, "You have successfully created a game. Other players can now !join you. Once enough players join, use !start to start the game.");
  this.decks = {DefaultW:true,DefaultB:true};
}

Game.games = {};
Game.settings = {
//  minPlayers:   [3,3,10],
  pointsToWin:        ['W',3,7,20,'The first player to reach this score will win.'],
  margin:             ['M',1,2,2,'A player must lead by at least this margin to win the game.'],
  suddenDeath:        ['D',1,3,5,'When a player reaches pointsToWin + suddenDeath points, they will win the game regardless of margin.'],
  rando:              ['R',0,1,1,'Rando Cardrissian joins the game.'],
  combinatorix:       ['X',0,1,1,'Allows players to combine white cards (e.g. !1+2).'],
  cards:              ['C',2,10,10,'How many white cards per player. Influenced by packHeat.'],
  packHeat:           ['H',0,2,2,'Players draw at most this many extra cards on multiple pick questions.'],
  autoShuffle:        ['S',0,0,1,'Should the deck be reshuffled before each game.'],
  maxPlayers:         ['P',3,10,10,'Maximum number of players allowed in this game.'],
  maxTurns:           ['T',5,50,300,'The game will stop after this many turns, regardless of the score.'],
  answerTime:         ['A',15,90,120,'Players have this many seconds to provide an answer.'],
  czarTime:           ['Z',15,90,180,'The czar has this many seconds to pick the winner.'],
  interval:           ['I',0,10,30,'There will be this many seconds of rest between each turn.'],
  verbosity:          ['V',0,4,4,'When can players talk: 0 = never, 1 = between turns, 2 = always except during czaring, 3 = like 2, but the czar can talk, 4 = always.']
}


Game.prototype = {
  toString: function() {
    return this.id;
  },
  get leaders()  {
    return MSORT(this.scores,'keys byvalue desc');
  },
  get leaderScores()  {
    return MSORT(this.scores,'desc');
  },
  get topScore() {
    return MSORT(this.scores,'desc')[0];
  },
  get topLeaders() {
    var me = this;
    var top = this.topScore;
    return this.leaders.filter(function(n){return me.scores[n] == top })
  },
  get nicks()  {
    return MSORT(this.players,'keys');
  },
  get activeNicks()  {
    var me = this;
    return Object.keys(this.players).filter(function(n){return !me.players[n].asleep});
  },
  destroy: function() {
    clearTimeout(this.timeout);
    for (var i in this.players) {
      if (i!=this.owner) this.leavePlayer(i);
    }
    this.leavePlayer(this.owner);
    delete Game.games[this.id];
  },
  set: function(name,value) {
    var setting = Game.settings[name];
    if(!setting) return;
    var min = setting[1];
    var def = setting[2];
    var max = setting[3];
    this.settings[name] = Math.max(min,Math.min(max,value!==undefined ? value: def)) ;
  },
  say: function(msg,except,from,wrap,wrapmsg) {
    var msg  = (wrap||'')+((from||'')+'            ').slice(0,12)+' 15│ ' + (wrapmsg||'') + msg + '';
    var list = Object.keys(this.players).filter(function(n){return n!=except});
    while (list.length > 0 ) {
      var sublist = list.splice(0,4).join(',');
      client.say(sublist,msg);
    }    
/*    for (var i in this.players) {
      this.players[i].tell(msg);
    };
*/    
  },
  sayDivider: function(which) {
    var list = Object.keys(this.players);
    while (list.length > 0 ) {
      var sublist = list.splice(0,4).join(',');
      switch (which) {
      case 'bottom':
        client.say(sublist,'15─────────────┴───────────────────────────────────────────────────────────────────────────────────────────');
        break;
      case 'middle':
        client.say(sublist,'15─────────────┼───────────────────────────────────────────────────────────────────────────────────────────');
        break;
      case 'top':
      default:   
        client.say(sublist,'15─────────────┬───────────────────────────────────────────────────────────────────────────────────────────');
      }
    }    
  },
  sayStatus: function(msg) {
    this.say(msg,null,null,null,'03');
  },
  sayGame: function(msg,from) {
    this.say(msg,null,from,'');
  },
  tell: function(nick,msg,from,wrap,wrapmsg) {
    this.players[nick] && this.players[nick].user.tell((wrap||'')+((from||'')+'            ').slice(0,12)+' 15│ ' + (wrapmsg||'') + msg + '');
  },
  tellError: function(nick,msg,from) {
    this.tell(nick,msg,from||'ERROR','04');
  },
  canJoinPlayer: function(nick) {
    if (player(nick)) return "You're already playing in another game! Use !leave first.";
    if (this.countPlayers >= this.settings.maxPlayers) return "Sorry, we're full!";
    return true;
  },
  joinPlayer: function(nick) {
    var res = this.canJoinPlayer(nick);
    if (res!== true) {
      client.say('#'+channel, nick+', '+res);
      return;
    }
    new Player(this,nick);
    this.scores[nick] = this.scores[nick] || 0;
    
//    console.log('nicks:',this.nicks);
    this.tell(nick,'Welcome. This game is owned by '+(this.owner || 'you')+'. ' + (this.state=='wait' ? 'Wait for the owner to start the game.' : 'The game is in progress. You can join in on the next turn.'));
    this.sayStatus(nick+' has joined the game.',null,null,'');
    this.countPlayers++;
    return true;
  },
  sleepPlayer: function(nick) {
    var p = this.players[nick];
    if(!p) return;
    if (this.owner == nick && this.activeNicks.length<2) {
      this.sayStatus(p + " is the last active player and can't sleep");
      return;
    }
    this.doSleepPlayer(nick);
    this.sayStatus (p + ' is now asleep.');
  },
  wakePlayer: function(nick) {
    var p = this.players[nick];
    if(!p || !p.asleep) return;
    this.doWakePlayer(p);
    this.sayStatus (p + ' is now awake.');
  },
  doWakePlayer: function(nick) {
    var p = this.players[nick];
    p.asleep = false;  
    this.awakePlayers++;
    if (this.state == 'turn') {
      if (!this.answerCards[nick]) {
        this.turnPlayers ++;
      }
    }
  },
  doSleepPlayer: function(nick) {
    var p = this.players[nick];
    if (!p) return;
    var me = this;
    if (p.asleep) return;
    
    if (this.czar == nick) {
      if (this.state!='wait') this.cancelTurn();
    }
    this.players[nick].asleep = true;
    this.awakePlayers--;
    if (this.owner == nick) {
//      console.log(this.activeNicks);
      this.owner = this.players[this.activeNicks[0]];
      this.sayStatus (this.owner + ' now owns this game.');
    }
    if (this.state == 'turn') {
      if (!this.answerCards[nick]) {
        this.turnPlayers --;
        if(this.turnPlayers < 1) this.judgeTurn();
      }
    }
  },
  leavePlayer: function(nick) {
    if(!this.players[nick]) return;
    this.countPlayers--;
    this.sayStatus(nick+' has left the game. '+this.countPlayers+' players left.');
    this.doSleepPlayer(nick);
    this.players[nick].destroy();
    if (this.countPlayers == 0) {
      this.destroy();
      return;
    } 
  },
  printScore:function() {
    var me = this;
//    console.log(me.scores);
    return this.leaders
    .filter(function(n){
      return (me.settings.rando && n=='Rando Cardrissian') || me.players[n] && !me.players[n].asleep || me.scores[n]>0;
    })
    .map(function(u) { 
      return u + ' ('+me.scores[u]+')'
    })
    .join(', ');
  },
  newGame: function() {
    if (this.loading > 0) {
      this.tellError(this.owner,"Can't start a game while cards are loading");
      return;
    };
    this.countTurns = 0;

    this.scores = {
      'Rando Cardrissian':0
    };
    this.stats = {
      votes : {}
    }
    for (var i in this.players) {
      this.scores[i] = 0;
      this.players[i].white=[];
    }
    this.shuffleCards(this.settings.autoShuffle);
    this.usedWhite = [];
    this.usedBlack = [];
    this.state = 'interval';
    this.czar = this.nicks.shuffle().pop();
    this.newTurn();
  },
  shuffleCards: function(reshuffle) {
    if (reshuffle) {
      this.usedBlack = [];
      this.usedWhite = [];
    }
    var me = this;
    this.black = [];
    this.white = [];
    for (var i in this.decks) {
      if (!this.decks[i]) continue;
      if (!Cards.decks[i]) continue;
      if (Cards.decks[i].black) {
        this.black = this.black.concat(Cards.decks[i].black.filter(function(n){return me.usedBlack.indexOf(''+n)<0}));
      }
      if (Cards.decks[i].white) {
        this.white = this.white.concat(Cards.decks[i].white.filter(function(n){return me.usedWhite.indexOf(''+n)<0}));
      }
      this.white = this.white.shuffle();
      this.black = this.black.shuffle();
    }
  },
  get totalBlack() {
    var n=0;
    for (var i in this.decks) {
      if (!Cards.decks[i]) continue;
      if (!this.decks[i]) continue;
      var d = Cards.decks[i];
      if (d.black) n+=d.black.length;
    }
    return n;
  },
  get totalWhite() {
    var n=0;
    for (var i in this.decks) {
      if (!Cards.decks[i]) continue;
      if (!this.decks[i]) continue;
      var d = Cards.decks[i];
      if (d.white) n+=d.white.length;
    }
    return n;
  },
  printCountCards: function() {
    return "Total "+this.totalBlack+' black and ' + this.totalWhite+' white cards.';
  },
  endGame: function() {
    clearTimeout(this.timeout);
    this.sayGame('The game has ended. Final standings: ' + this.printScore(),'END');
    this.state = 'wait';
  },
  dealWhite: function(p) {
    p = this.players[p];
    var handSize = this.settings.cards + Math.min(this.settings.packHeat,this.answersExpected-1);
    if (this.white.length<handSize) {
      this.usedWhite = [];
      this.shuffleCards();
    }
    while(p.white.length<handSize) {
      var w = this.white.shift();
      p.white.push(w);
      this.usedWhite.push(w+'');
    }
    var white = formatWhite(p.white.map(
      function(n){return capitalize(n);
    }));
    this.tell(p,white,'WHITE','');
  },
  maybeEndGame: function() {
    var me = this;
    if (
      ( 
        this.topScore >= this.settings.pointsToWin
        || 
        this.countTurns >= this.settings.maxTurns
      ) 
      && 
      (
        this.topScore >= this.settings.pointsToWin+ this.settings.suddenDeath 
        ||
        this.topScore >= this.leaderScores[1] + this.settings.margin
      )
    ) {
      var leaders = this.leaders;
      var winner = leaders[0];
      var second = leaders[1];
      var last = leaders.slice(-1).join();
      var secondlast = leaders.slice(-2,1).join();
      var report = winner == this.lastWinner ? 'The winner and still the champion, '+ winner +'.'  : winner + ' wins the game';
      var congrat = [
        '. Congratulations!',
        '. Congrats!',
        '. Well done.',
        '. Good job.',
        '. Way to go!',
        '. Nice going.',
        '. Good game.',
        '. The others lose.',
        '. For great justice!',
        '. (' + winner + ' is doing Kegels right now.)',
        '. Better than all the rest.',
        '. Suckers.',
        '. Cry losers!',
        ', the rest of you suck.',
        '. Booyaah!',
        '. Born champion.',
        ' by pure luck.',
        '. Move all zig!',
        ".. So what? It's just a stupid game.",
        ". If it's any consolation, your mum's a winner too.",
        ". So there.",
        ". Better luck next time.",
        ". GO "+winner.toUpperCase()+'!',
        ". " + second + " lost.", 
        ". " + second + " was robbed.", 
        ". " + second + " cries softly.",
        ". " + second + " wasn't funny enough.",
        ". " + second + " didn't have enough mojo.",
        ". " + second + " lacks stamina.",
        ". " + last + " came last.", 
        ". " + last + " has poor disciprine.",
        ". " + last + " did almost as well.", 
        ". There but for the grace of God goes " + last+'.',
        ", watched by " + (this.countPlayers-1) + " other losers.",
        ". How quaint.",
        ". Panda sex.",
        ". Walk proud, (man|bot).",
        ". Sad geeks, the lot of you.",
        ". VIVA LA REVOLUCION!",
      ].shuffle().shift();
      this.sayGame(''+ report + congrat,'WINNER');
      this.lastWinner = winner;
      this.endGame();
      return true;
    } else return false;
  },
  describeTurn: function() {
    var me = this;
    var diff = 2;

    var scoresNoCzar = MSORT(this.scores,'desc', function(n){ 
      return n != me.czar.nick 
    });
//    console.log('scoresNoCzar',scoresNoCzar);
    var scores = this.leaderScores;
    var leaders = this.leaders;
    
    var first = leaders[0];
    var last = leaders.slice(-1).join();
    var rand = this.white.shift();
    this.white.push(rand);
    var white = String(rand);
   
    if (scores[0] >= this.settings.pointsToWin-1) {

      var inlead = this.topLeaders;
      var inleadNoCzar = inlead.filter( function (n){
        return n!=me.czar.nick
      });
      if (this.settings.margin<2) return '5Match point for ' + me.joinList(inleadNoCzar)+'.';
      if (scores[0]>=scores[1]+this.settings.margin-1 && this.czar.nick != first) return '5Match point for ' + leaders[0] +'.';
      if (inlead.length>1  && scores[0]>=this.settings.pointsToWin+this.settings.suddenDeath-1) return "0,5" + " SUDDEN DEATH 5 " + me.joinList(inleadNoCzar)+'.';
      if (inlead.length>1) return "3" + ['Deuce','Treuce','Quadreuce','Quinteuce','Sexteuce','Septeuce','Octeuce','Noneuce','Not going to happen'][inlead.length-2]+": " + me.joinList(inlead)+'.';
      
    }
    return '' +
    Cards.messages.BeforeTurn
    .shuffle()
    .shift()
    .replace(/\{\{\{first\}\}\}/g, first)
    .replace(/\{\{\{last\}\}\}/g, last)
    .replace(/\{\{\{czar\}\}\}/g, String(this.czar))
    .replace(/\{\{\{white\}\}\}/g, white)
     + '';
      
    return "";
  },
  newTurn: function(repeat) {
    var me = this;
    if (!repeat) {
      this.countTurns++;
      if (this.black.length<1) {
        this.usedBlack = [];
        this.shuffleCards();
      }
      this.question = this.black.shift();
      this.usedBlack.push(this.question+'');
    }
    
    if (this.maybeEndGame()) return;
      
    this.turnPlayers = -1; 
    for (var i in this.players) if (!this.players[i].asleep) this.turnPlayers ++;
    var i;
    var awake = this.nicks.filter(function(n){return !me.players[n].asleep});
    for (i=0; i<awake.length; i++) {
      if (awake[i] > this.czar || repeat && awake[i]==this.czar) break;
    }
    this.czar = this.players[awake[(i) % awake.length]];

    this.answersExpected = Math.max(1,String(this.question).replace(/[^_]/g,'').length);
    this.questionText = String(this.question).replace(/_/g,'……………………');
    this.answerCards = {};
    this.answerText = {};
//    this.answers = {};
    this.sayDivider();
    this.sayGame (''+this.czar +' is the Card Czar for this turn. | ' + this.describeTurn(), 'TURN '+ this.countTurns  );
    this.sayGame ('0,1 ' + this.questionText + '  Pick ' + this.answersExpected + '.','BLACK');
    this.sayDivider('middle');
    var delay = 0;
    for (var i in this.players) {
      if (i==this.czar) {
        this.tell(i,'You are the Card Czar for this turn. Sit back and relax while other players choose their answers.');
      } else {
        (function(n,d){ 
          setTimeout(function() { me.dealWhite(n); },d);
        })(i,delay);
        delay += 250;
      }
    }
    var me = this;
    this.timeout = setTimeout(function() {
      me.sayGame('10 seconds to go.');
      me.timeout = setTimeout(function() {
        var missing = me.joinList( me.nicks.filter( function (n) {
          return n!=String(me.czar) && !me.players[n].asleep && !me.answerCards[n];
        }));
        
        me.sayGame('Time has run out for ' + missing + '.');
        me.judgeTurn();
      }, 10000);
    }, (this.settings.answerTime - 10) * 1000);
    this.state = 'turn';
  },
  joinList: function(list) {
    var l = list.concat();
    if (l.length>1) {
      var tail = l.pop();
      return l.join(', ') + ' and ' + tail;
    }
    return l.length ? l[0] : ''
  },
  judgeTurn: function() {
    clearTimeout(this.timeout);
    if (this.settings.rando) {
      var ans = [];
      for (var i = 0; i < this.answersExpected; i++) {
        var n = 8;
        if (this.settings.combinatorix) var l = 4-Math.max(1,Math.ceil(Math.log(Math.random()*n*n*n)/Math.log(n)));
        else var l = 1;
        var a = this.white.splice(0,l).join(' ');
        ans.push(capitalize(a));
      }
      this.answerText['Rando Cardrissian'] = ans.join(' | ');
    }
    this.czarChoices = Object.keys(this.answerText).shuffle();
    this.sayGame('The Card Czar will now choose their favourite answer.');
    this.tell(this.czar,this.czar + ', You are the Card Czar. Choose wisely.'
      + '\nQUESTION     15│ 0,1 ' + this.question + ' '
    );
    var g = this;
    this.sayGame(this.czarChoices.map(function(me,i) {
      return  '4,0 !'+(i+1)+'1,0 ' + g.answerText[me]+' ';
    }).join(' ')
    , 'ANSWERS');
    this.state = 'judge';
    var me = this;
    this.timeout = setTimeout(function() {
      me.tell(me.czar,'You have 10 seconds left to choose the winner.');
      me.timeout = setTimeout(function() {
        me.sayGame('Time has run out. The Card Czar made no choice.');
        me.cancelTurn();
      },10000);
    },(this.settings.czarTime - 10) * 1000);
  },
  endTurn: function(answer) {
    clearTimeout(this.timeout);
    this.state = 'interval';
    var winner = this.czarChoices[answer];
    this.scores[winner] = (this.scores[winner]|0)+1;
        
    this.sayGame (
      this.czar +' chose 1,0 ' + this.answerText[winner]+'   ' 
      +winner + ' wins '+(this.scores[winner]==1? 'their first':'one')+' point. '
      +'Current standings: ' + this.printScore(),'CZAR');
    this.sayDivider('bottom');
    
    for (var i in this.answerCards) for(var j = 0; j< this.answerCards[i].length; j++) this.players[i].white.splice(this.answerCards[i][j],1);
    var me = this;
    this.stats.votes[winner] = this.stats.votes[winner] || [];
    this.stats.votes[winner][this.czar] = this.stats.votes[winner][this.czar] || 0;
    this.stats.votes[winner][this.czar]++;
    if (this.maybeEndGame()) return;

    this.timeout = setTimeout(function() {
      me.newTurn();
    }, this.settings.interval * 1000);
    
//    console.log('nicks',this.nicks);
//    console.log('activeNicks',this.activeNicks);
//    console.log('leaders',this.leaders);
//    console.log('leaderScores',this.leaderScores);
//    console.log('topLeaders',this.topLeaders);
//    console.log('topScore',this.topScore);
  },
  cancelTurn: function(pause) {
    clearTimeout(this.timeout);
    this.state = 'interval';
    this.sayGame ('No points will be scored and your white cards will be returned to you.');
    var me = this;
    this.sayDivider('bottom');
    
    if (!pause) this.timeout = setTimeout(function() {
      me.newTurn();
    }, this.settings.interval * 1000);
  },
  answerPlayer: function(p,answer) {
    var me = this;
    if (this.state == 'turn') {
      if (p == this.czar) return this.tellError(p,'You were told to sit back and relax.');
      if (answer.length!=this.answersExpected) return this.tellError(p,"You must pick "+this.answersExpected+" cards, like this: " + ("!1 2 3 4 5").slice(0,this.answersExpected*2));
      var ans = [];
      var cards = [];
      for (var i=0; i<answer.length; i++) {
        var subans = [];
        var parts = answer[i].split(/[+]/);
        if (!this.settings.combinatorix && parts.length>1) return this.tellError(p,"No combinatorix allowed in this game.");
        for (var j = 0; j<parts.length; j++) {
          var A = parts[j]-1;
          if (A < 0) return this.tellError(p,"Unexpected division by zero aught nothing.");
          if (A >= p.white.length) return this.tellError(p,"You don't have that many white cards.");
          if (cards.indexOf(A)>-1) return this.tellError(p,"You can't play the same card more than once.");
          cards.push(A);
          subans.push(p.white[A]);
        }
        var s = subans.join(' ');
        ans.push(capitalize(s));
      }
      if (this.players[p].asleep) this.wakePlayer(p);
      if (!this.answerText[p]) this.turnPlayers --;
      this.answerText[p] = ans.join(' │ ');
//      this.answerCards[p] = cards.sort(function(a,b) {return b-a});
      this.answerCards[p] = MSORT(cards,'desc');

//      console.log(this.answerCards[p]);
      
      this.tell(p, "You answered: 1,0 "+this.answerText[p]+'  ');
      if (this.turnPlayers == 0) this.judgeTurn();
      return;
    }
    if (this.state == 'judge') {
      if (p != this.czar) return me.tellError(p,'Not now.');
      if (answer.length > 1) return this.tellError(p,'You can only choose one answer.');
      if (answer[0].match(/[+]/)) return this.tellError(p,"You can only vote for one answer.");
      if (answer[0]<1) return this.tellError(p,"You can't vote for 0.");
      if (this.czarChoices.length<answer[0]) return this.tellError(p,"You don't have that many choices.");
      this.endTurn(answer[0]-1);
      return;
    } 
  },
  doCmd: function(p, text) {
    var args = text.trim().split(/\s+/);
    var cmd = args.shift();
    var method = this['cmd_' +cmd+'_'+args.length] || this['cmd_' +cmd];

    var me = this;
    var respond = function (msg) {
      me.tell(p,msg,'!'+cmd);
    };
    respond.error = function(msg) {
      me.tellError(p,msg,'!'+cmd);
    }

    if (!method) {
      var usage = this['cmd_'+cmd+'_usage'];
      if (usage) return respond.error(usage);
      return this.onCmd(p,cmd,args[0],args[1],text);
    }
    
    
    switch(this['cmd_' +cmd+'_'+args.length+'_auth'] || this['cmd_'+cmd+'_auth']) {
    case 'owner':
      if (p != this.owner) return respond.error('Only the owner can do that.');
    }
    
    var mangleArgs = this['cmd_'+cmd+'_args'];
    if (mangleArgs) args = mangleArgs.apply(this,[args]);
    return method.apply(this, [p, respond].concat(args));
  },
// PLAYERS
  cmd_players_usage: '!players',
  cmd_players_0: function(p,respond) {
    var me = this;
    respond(formatWhite(Object.keys(this.players),function(n,i){
      return (me.players[n].asleep ? '-' : '+') + i;
    }));
  },

// SCORE
  cmd_score_usage: '!score',
  cmd_score_0: function(p,respond) {
    if (this.state == 'wait') return respondError("The game hasn't started yet");
    return respond(this.printScore());
  },

// START
  cmd_start_usage: '!start',
  cmd_start_auth: 'owner',
  cmd_start_0: function(p,respond) {
    if (this.state != 'wait') return respond.error('The game has already started.');
    this.newGame();
  },
// CLOSE
  cmd_close_usage: '!close',
  cmd_close_auth: 'owner',
  cmd_close_0: function(p,respond) {
    this.destroy();
  },


// KICK
  cmd_kick_usage: '!kick [player]',
  cmd_kick_auth: 'owner',
  cmd_kick_0: function(p,respond) {
    respond.error('Kick whom?');
    this.cmd_players_0(p,respond);
  },
  cmd_kick_1: function(p,respond,a1) {
    if (Number(a1)>0 && Number(a1)<=this.nicks.length) a1 = Object.keys(this.players)[a1-1];
    if (!this.players[a1]) return respond.error('No player ' + a1+ ' in this game.');
    this.sayStatus (a1+' has been kicked by ' + p + '.');
    this.leavePlayer(a1);
  },

// OWNER
  cmd_owner_usage: '!owner, !owner [player]',
  cmd_owner_0: function (p, respond) {
    respond('This game is owned by '+this.owner);
  },
  cmd_owner_1_auth: 'owner',
  cmd_owner_1: function (p, respond, a1) {
    if (Number(a1)>0 && Number(a1)<=this.nicks.length) a1 = Object.keys(this.players)[a1-1];
    if (!this.players[a1]) return respond.error('No player ' + a1+ ' in this game.');
    this.owner = this.players[a1];
    this.sayStatus('This game is now owned by ' + a1 + '.');
  },

//SET  
  cmd_set_0: function(p,respond) {
    var me = this;
    respond(formatWhite(Object.keys(Game.settings).map(function(n){
      return n.replace(RegExp('('+Game.settings[n][0]+')','i'),'5,0$11,0')   
      + ' ' + (Game.settings[n][1]==0 && Game.settings[n][3]==1 ? (me.settings[n] ? "ON" : "OFF") : me.settings[n]);
    }), function(){return ''}));
  },



  
  onCmd: function(p,cmd,a1,a2,whole) {
    var me = this;
    function respond(msg) {
      me.tell(p,msg,'!'+cmd);
    }
    function respondError(msg) {
      me.tellError(p,msg,'!'+cmd);
    }
    if (whole.match (/^[\d+]+(\s+[\d+]+)*\s*$/)) {
      var ans = whole.split(/\s+/g);
//      console.log('ans',ans);
      this.answerPlayer(p,ans);
      return;
    }
    switch(cmd) {
    case 'help':
      respond('player commands !players | !score | !ask | !owner | !set | !deck | !sleep | !wake | !leave');
      if (p == this.owner) respond('owner commands !start | !end | !owner [nick] | !set [setting] [value] | !deck +[wanted] -[unwanted] | !shuffle | !sleep [nick] | !kick [nick] | !skip | !czar');
      return;
    case 'ask':
      this.tell (p,''+this.czar +' is the Card Czar for this turn.', 'TURN '+ this.countTurns  );
      this.tell (p,'0,1 ' + this.questionText + '  Pick ' + this.answersExpected + '.','BLACK');
      this.wakePlayer(p);
      this.dealWhite(p);
      return;
    case 'drop':
      if (!whole.match (/^drop\s+\d+(\s+\d+)*\s*$/)) return respondError('You can drop any of your white cards, and lose one point. Type !drop [number] [number] ..');
      if (this.scores[p]<1) return respondError('You have no points to trade for new cards.');
      
      var ans = whole.split(/\s+/g);
      ans.shift();
      for (var i = 0; i<ans.length;i++) {
        if (ans[i]<1 || ans[i]>p.white.length) return respondError('Out of range: '+ans[i]);
        ans[i] = Number(ans[i]);
      }
      this.scores[p]--;
      this.sayGame(p+' drops ' + ans.length + ' white card' + (ans.length>1 ? 's' :'') + ' and loses 1 point.');
//      ans = ans.sort(function(a,b) {return b-a});
      ans = MSORT(ans,'desc');
      for (var i = 0; i<ans.length;i++) {
        p.white.splice(ans[i]-1,1);
      }
      this.dealWhite(p);
      return;

    case 'end':
      if (p != this.owner) return respondError('Only the owner can do that.');
      if (this.state == 'wait') return respondError('The game has\'nt started yet.');
      this.endGame();
      return;
    case 'wtf':
      if (!this.question) return respondError('Not now.');
      if (a1 == '?') return respond(this.question.desc);
      if (a1 === undefined  || !(Number(a1)>0)) return respondError('Usage: !wtf [number] or !wtf ? or ?[number] or ??');
      if (this.state == 'turn' && a1 <= this.players[p].white.length) return respond(this.players[p].white[a1-1].desc);
      if (this.state == 'judge' && a1 <= this.czarChoices.length) {
        var p2 = this.czarChoices[a1-1];
        this.answerCards[p2].forEach(function(n) {respond(me.players[p2].white[n].desc)});
      }
      return;
    case 'preset':
      var presets = Object.keys(Cards.presets);
      if (a1 === undefined) return respond(formatWhite(presets, ''));
      if (p != this.owner) return respondError('Only the owner can do that.');
      if (Number(a1)>0) a1 = presets[a1-1];
      var preset = presets[a1];
      if (!preset) return respondError('No such preset.');
      for (var i in preset) this.set(i,preset[i]);
      this.sayStatus(p+' loaded preset '+a1);
      return this.sayGame(formatWhite(settings.map(function(n){
        return n +' ' + me.settings[n];
      }), ''));
      
    case 'settings':
    case 'set':
      var settings = Object.keys(Game.settings);
      console.log(settings);
      if (a1===undefined) return;
      if (a1.match(/[^+-]/)) {
        a2 = a1[0];
        a1 = a1.slice(1);
      }
      if (a1.length == 1) for (var i in Game.settings) {
        if (Game.settings[i][0].toLowerCase() == a1.toLowerCase()) {
          a1 = i;
          break;
        }
      }
      if (Number(a1)>0) a1 = settings[a1-1];
      var setting = Game.settings[a1];
      if (!setting) return respondError('Unknown setting. Try !set.');
      if (a2===undefined) return respond(setting[4] + ' | current value = ' + this.settings[a1] +' | min = '+setting[1]+ ' | max = '+setting[3]+ ' | default = '+setting[2]);
      if (p != this.owner) return respondError('Only the owner can do that.');
      if (a2 == '+') a2 = setting[3];
      else if (a2 == '-') a2 = setting[1];
      else if (String(a2).match(/^on$/i)) a2 = 1;
      else if (String(a2).match(/^off$/i)) a2 = 0;
      
      this.set(a1,a2);
      this.sayStatus( p +' sets '+ a1 + ' to ' + this.settings[a1]+'.');
      break;
    case 'skip':
      if (p != this.owner) return respondError('Only the owner can do that.');
      if (this.state == 'wait') return respondError('Not now.')
      this.sayGame("Question skipped by " + p + ".");
      this.cancelTurn();
      break;
    case 'czar':
      if (p != this.owner) return respondError('Only the owner can do that.');
      if (this.state != 'turn') return respondError('Not now.');
      this.sayGame("Czaring forced by " + p + ".");
      this.judgeTurn();
      break;

    case 'leave':
      this.leavePlayer(p);
      return;
    case 'sleep':
      if (a1 === undefined) {
        if (p.asleep) return respondError ("You were already asleep.");
        this.sleepPlayer(p);
        return;
      }
      if (p != this.owner) return respondError('Only the owner can do that.');
      if (Number(a1)>0 && Number(a1)<=this.nicks.length) a1 = Object.keys(this.players)[a1-1];
      if (!this.players[a1]) return respondError('No ' + a1+ ' in this game');
      this.sleepPlayer(a1);
      return;
    case 'wake':
      if (a1 === undefined) {
        if (!p.asleep) return respondError ("You are already awake.");
        this.wakePlayer(p);
        return;
      }
      return;
//    case 'kick':
//      if (p != this.owner) return respondError('Only the owner can do that.');
//      if (!a1) return respondError('Kick whom? ' + formatWhite(Object.keys(this.players),''));
//      if (Number(a1)>0 && Number(a1)<=this.nicks.length) a1 = Object.keys(this.players)[a1-1];
//      if (!this.players[a1]) return respondError('No player ' + a1+ ' in this game.');
//      this.sayStatus (a1+' has been kicked by ' + p + '.');
//      this.leavePlayer(a1);
//      return;
    case 'decks':
    case 'deck':
      var decks = Object.keys(Cards.decks).sort();
      if (a1 === undefined) {
        return respond(formatDecks(function(n){return me.decks[n] ? '+' : '-';})+' '+this.printCountCards());
      }
      if (p != this.owner) return respondError('Only the owner can do that.');
      var m = whole.match(/^decks?\s+[+-]\S+.*$/);
      if (!m) return respondError('Usage: !deck +[deck] [deck] -[deck] [deck], or just !deck +all. Use !deck to see a list of decks.');
      var args = whole.split(/\s+/g);
      var err = [];
      var changed = false;
      var c;
      for (var i=1; i< args.length;i++) {
        if (args[i].match(/[+-]/)) {
          c = args[i][0];
          var d = args[i].slice(1);
        } else {
          var d = args[i];
        }

        if (d == 'all') {
          for (var i in Cards.decks) me.decks[i] = c =='+';
          changed = true;
        } else {
          if (Number(d)>0) d = decks[d-1];
          if (Cards.decks[d]) {
            changed = true;
            me.decks[d] = c =='+';
          } else if (Cards.decks[d+'W'] || Cards.decks[d+'B']) {
            if (Cards.decks[d+'W']) {
              changed = true;
              me.decks[d+'W'] = c =='+';
            } 
            if (Cards.decks[d+'B']) {
              changed = true;
              me.decks[d+'B'] = c =='+';
            }
          } else {
            err.push(d);
          }
        }
      }
      if (err.length) this.tellError(p,'Not found: '+err.join(', ')+'. Use !decks to see a list of decks.','!deck');
      if (changed) {
        if (this.totalBlack <10) this.decks['DefaultB']=true;
        if (this.totalWhite <30) this.decks['DefaultW']=true;
        this.sayStatus(p + ' changes deck settings');
        this.sayGame(formatDecks(function(n){return me.decks[n] ? '+' : '-';})+' '+this.printCountCards(),'!deck');
        this.shuffleCards();
      }
      return;
    case 'shuffle':
      if (p != this.owner) return respondError('Only the owner can do that.');
      me.shuffleCards(true);
      this.sayStatus(p+ ' reshuffled the deck. Previously used cards will appear again.');
      return;
    case 'reload':
      if (p != this.owner) return respondError('Only the owner can do that.');
      Cards.load(function(){
        me.shuffleCards()
        me.sayStatus(p+ ' reloaded the cards.');
      });
      return;
    case 'stop':
    case 'pause':
      if (p != this.owner) return respondError('Only the owner can do that.');
      if (this.state=='wait') return respondError("The game hasn't started yet-");
      this.sayStatus(p+ ' paused the game.');
      this.cancelTurn(true);
      this.state = 'stopped';
      return;    
    case 'continue':
    case 'unpause':
      if (p != this.owner) return respondError('Only the owner can do that.');
      if (this.state!='stopped') return respondError("The game isn't paused.");
      this.sayStatus(p+ ' unpaused the game.');
      this.newTurn(true);
      return;
    case 'stats':
    case 'stat':
      if(!me.stats) return respondError('No stats yet. Wait for the game to start.');
      switch (a1) {
      case 'votes':
        for (var i in this.stats.votes) {
          respond(
            i + ' has ' + this.scores[i] + 'votes (' 
          + Object.keys(this.stats.votes[i])
            .sort(function(a,b) {
              return me.stats.votes[i][b]-me.stats.votes[i][a]
            }).map(function(n) {
            }).join(', ')
          + ')'
          );
        }
        return;
      default: 
        return respondError ('Use !stat votes');
      }
    default:
      var me = this;
      onGlobalCmd(p,'!'+whole, respond, respondError);
    }
  },
  onSay: function(p,msg) {
    switch (this.settings.verbosity) {
    case '0':
      return this.tell(p,'Shh!');
    case '1':
      if (this.state == 'turn' || this.state == 'czar') return this.tell(p,'Shh!');
      break;
    case '2':
      if (this.state == 'czar') return this.tell(p,'Shh!');
      break;
    case '3':
      if (this.state == 'czar' && p!=this.czar.nick) return this.tell(p,'Shh!');
      break;
    }
    this.say(msg,p,p,'13','13');
    return;
  }
}

var Cards = {
  wiki: 'http://zocky.wiki.mitko.si/',
  root: 'Zcardbot',
  loading:0,
  
  load: function(cb,cbFail) {
    var me = this;
    me.loading = 1;
    getUrl(
      me.wiki+'w/api.php?action=query&generator=allpages&gapprefix='+me.root+'/&prop=revisions&rvprop=content&format=json',
      function(code,content) {
        try {
          var obj = JSON.parse(content);
        } catch (e) {
          console.log(e);
          cbFail && cbFail();
        }
        me.decks = {};
        me.messages = {};
        me.presets = {};
        for (var i in obj.query.pages) {
          var p = obj.query.pages[i];

          var m = p.title.match(/^Zcardbot[/](Black|White|Messages)[/](\S+)$/);
          if (!m) continue;
          //console.log(m);
          var text = p.revisions[0]['*'];
          var parts = 
          text
          .replace(/<noinclude>.*?<\/noinclude>/g,'')
          .replace(/<.*?>/g,'')
          .replace(/ +/g,' ')
          .replace(/^\s+|\s+$/g,'')
          .split(/\s*\n\s*/)
          .filter(function(n) {
            return !n.match(/^[=:]/);
          })
          var d = m[2]+m[1][0];
          var c = m[1].toLowerCase();
          switch (c) {
          case 'presets':
            try {
              me.presets[m[2]] = JSON.parse(text);
            } catch(e) {
            }
          case 'messages':
            me.messages[m[2]] = parts;
//            console.log('messages',m[2], me.messages[m[2]]);
            break;
          case 'black':
          case 'white':
            me.decks[d] = me.decks[d] || {};
            me.decks[d].color = c;
            me.decks[d][c] = parts.map(function(n, i){
              var parts = n.split(/\|/);
              var ret = {val:'', toString:function(){return String(this.val)}, valueOf:function(){return String(this.val)},__proto__:String.prototype,constructor:String};
              ret.__proto__ = String;
  //            ret.toString = function() {return this.value;}
              if (parts.length>1) {
                ret.expl = parts.pop().trim();
                ret.val = parts.join('|').trim();
              } else {
                ret.val = parts[0];              
              }
              ret.deck = d;
              ret.pos = i;
              ret.desc = (ret.expl||'no explanation provided') + ' ('+d+' #'+i+')';
              return ret;
            });
            break;
          }
        }
        me.loading = 0;
        cb && cb();
      }
    )
  },
  decks:{},
  black:{},
  white:{}
};
Cards.load();
