var conf = require('./config.json');

process.title = 'rand0';

process.on('SIGINT', function () {
  console.log('disconnecting');
  client.disconnect('deadness ensues', function() {
    setTimeout(function() {
      console.log('disconnected, shutting down');
      process.exit(); 
    },3000);
  });
});

if(process.argv[2] != 'test') process.on('uncaughtException', function(err) {
  console.dir(err);
  console.log(err.stack);
  if (user(conf.master).present) client.say(conf.master,err);
});

var channel = conf.channel;
var adminChannel = conf.adminChannel;
var irc = require('irc');

var restartTimer = null;
var childProcess = require('child_process');

function restartBot() {
  client.disconnect('brb, restarting', function() {
    setTimeout(function() {
      console.log('disconnected, restarting');
      var child = childProcess.spawn('node', ['./index.js'], {
       detached: true,
       stdio: 'inherit'
      });
      child.unref();
      process.exit(); 
    },3000);
  });
}

setInterval(function(){
  client.send('ping','#'+channel);
}, 10 * 60 * 1000);

function setRestartTimer() {
  clearTimeout(restartTimer);
  restartTimer = setTimeout(restartBot,15*60*1000);
}

global.client = new irc.Client('irc.freenode.net', conf.nick, {
    channels: ['#'+channel],
    autoRejoin: true,
    autoConnect: true,
    floodProtection: true,
    floodProtectionDelay: 150,
});

client.addListener('error', function(message) {
  console.log('error:',message);
  if (user(conf.master).present) client.say(conf.master,'error: '+message);
});

client.addListener('names' , function (ch,names) {
  console.log('names for '+ch);
  if (ch!='#'+channel) return;
  Object.keys(names).forEach(function(nick) {
    if (nick==client.nick) return;
    user(nick).joined();
  })
  client.say('NickServ','IDENTIFY '+conf.pass);
});

client.addListener('registered', function (msg) {
  console.log('registered:',msg);
});

client.addListener('invite', function (channel) {
  console.log('invited to ',channel);
  if (channel!='#'+adminChannel) return;
  client.join(channel);
});

client.addListener('motd', function (msg) {
//  console.log('motd:',msg);
});

client.addListener('raw' + channel, function (nick) {
  setRestartTimer();
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

client.addListener('kick#' + channel, function (nick) {
  user(nick).parted();
});

client.addListener('quit', function (nick) {
  user(nick).parted();
});

client.addListener('nick', function (nick,newnick) {
  user(nick).rename(newnick);
});

client.addListener('message#' + channel, function (from, message) {
  if (message[0]=='.' || message[0]=='¬') onGlobalCmd(from, message.slice(1), function(msg) {
    client.say('#'+channel,from+', ' +msg)
  })
});

client.addListener('message#'+adminChannel, function (from, message) {
  onAdminCmd(from, message, function(msg) {
    client.say('#'+adminChannel,from+', ' +msg)
  })
});

client.addListener('notice', function (from, to, text,message) {
  if (user(conf.master).present) client.say(conf.master,'notice from '+from+': '+text);
  console.log('notice',text);
  //console.dir(message);
  if (text.match(/^You are now identified/)) {
    client.say('ChanServ','invite #'+adminChannel);
  }
});


client.addListener('pm', function (from, message) {
  if (!user(from).present) {
    client.say(from,"Join #"+channel+" and then we'll talk.");
    return;
  }
  var p = player(from);

  if (!p) {
    switch(message[0]) {
    case '.':
    case '¬':
      return onGlobalCmd(from, message.slice(1), function(msg) {
        client.say(from,'global: '+msg);
      });
    default: 
      return client.say(from,'Join a game from #'+channel+' and then we\'ll talk.');
    }
  } else {
    var g = p.game;
    switch(message[0]) {
    case '?': return g.doQuestion(p,message.slice(1));
    case ',':
    case '!': return g.doAnswer(p,message.slice(1));
    case '¬':
    case '.': return g.doCmd(p,message.slice(1));
    default: return g.onSay(p,message);
    }
  }
});

var shuttingDown = false;
onAdminCmd = function(from,message,respond,respondError) {
  respondError = respondError || respond;
  var m = message.match(/^\s*[.](\S+)(\s+(\S+))?(\s+(\S+))?\s*$/);
  if (m) {
    var cmd = m[1];
    var a1 = m[3];
    var a2 = m[5];
    switch(cmd) {
    case 'help':
      respond('.restart, .shutdown');
      break;
    case 'restart':
      respond('Yes, master.');
      restartBot();
      break;
    case 'shutdown':
      if (!shuttingDown) {
        shuttingDown = true;
        respond('type .shutdown again');
        return;
      };
      respond('PANIC! PANIC! PANIC! SHUTTING DOWN!');
      client.disconnect('ZOMG DEATH!',function(){
        process.exit(1);
      });
      break;
    }
  }
  shuttingDown = false;
}

onGlobalCmd = function(from,message,respond,respondError) {
  respondError = respondError || respond;
  var m = message.match(/^\s*(\S+)(\s+(\S+))?(\s+(\S+))?\s*$/);
  if (!m) return;
  var cmd = m[1];
  var a1 = m[3];
  var a2 = m[5];
  switch(cmd) {
  case 'help':
    respond('.list, .new, .kiss, .join [nick], .wiki, .reload, .heart');
    break;
  case 'list':
    var ret = [];
    for (var i in Game.games) {
      var g = Game.games[i];
      ret.push(g.owner + ' (' + g.countPlayers + '/' + g.settings.maxPlayers + ') ' + (g.state == 'wait' ? 'waiting' : 'in progress '));
    }
    respond( (ret.length ? formatList(ret) : 'no games exist at the moment.'));
    break;
  case 'test':
  case 'new':
    if (player(from)) {
      return respondError('you\'re already playing in a game. Use !leave first.');
    }
    var g = new Game(from);
    if (cmd=='test') {
      g.settings.interval=0;
      g.isTest = true;
      if (user('yockz').present) g.joinPlayer('yockz');
    }
    return respond('you created a game. Check your private messages.');
    break;
  case 'kiss': 
    if (player(from)) return respondError('you\'re already playing in a game. Use !leave first.');
    new Game(from,'kiss');
    return respond('you created a kiss game. Check your private messages.');
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
    return respond('you joined a game. Check your private messages.');
   
  case 'heart':
      return respond('Rand0 <3 ' + from);
  case 'leave':
    var p = player(from);
    if (!p) return respondError('you are not in any game.');
    p.game.leavePlayer(p);
    return respond('you left the game.');
  case 'users':
    return respond(Object.keys(User.users).map(function(u) { return (!User.users[u].present ? '[-]':'')+(User.users[u].player ? '[×]':'')+u} ).join(', '));
  case 'reload':
    if (Object.keys(Game.games).length>0) {
      return respond('you cannot reload the bot while a game is in progress.');
    }
    if (process.uptime()<15*60) {
      return respond('you cannot reload the bot more often than every 15 minutes.');
    }
    respond('brb');
    restartBot();
    return;
  case 'wiki':
    return respond(Cards.wiki+Cards.root);
  case 'decks':
  case 'deck':
    //return respond(formatDecks(''));
  default:
    return respond('Unknown command. Use .help.');
  }
}

require('./lib/tools.js');
require('./lib/userPlayer.js');

var Cards = require('./lib/gameContent.js').create(conf.wikiUrl,conf.wikiRootPage);
var defaultMode = {
  commands: require('./default/commands.js'),
  config: require('./default/config.js'),
  states: require('./default/states.js'),
}
var otherModes = {};
function getMode(mode) {
  if (mode=='default') return ({}).merge(defaultMode);
  if (!otherModes[mode]) {
    console.log('loading mode',mode);
    var m = otherModes[mode]={};
    try {
      m.commands = ({}).merge(defaultMode.commands,require('./modes/'+mode+'/commands.js'));
    } catch (e) {if (process.argv[2] == 'test') throw(e)};
    try {
      m.config = ({}).merge(defaultMode.config,require('./modes/'+mode+'/config.js'));
    } catch (e) {if (process.argv[2] == 'test') throw(e)};
    try {
      m.states = ({}).merge(defaultMode.states,require('./modes/'+mode+'/states.js'));
    } catch (e) {if (process.argv[2] == 'test') throw(e)};
  }
  return ({}).merge(otherModes[mode]);
}
getMode('kiss');
var Game = function (owner,mode) {
//  console.log('starting game '+owner);
  this.content = Cards;
  this.mode = mode||'default';
  var m = getMode(this.mode);
  this.merge(m);
  this.settings = {};
  for (var i in this.config) this.set(i,this.config[i].def);
  this.players = {};
  this.countPlayers = 0;
//  this.sortedNicks = [];
  this.scores = {};
  this.id = owner;  
  Game.games[this.id] = this;
  this.decks = {};
  this.used = {};
  this.unused = {};
  this.joinPlayer(user(owner));
//  this.owner = this.players[owner];
  this.setState('init');
  this.tell(this.owner, "You have successfully created a game. Other players can now !join you. Once enough players join, use !start to start the game.");
}

Game.games = {};

Game.prototype = {
  constructor: Game,
  toString: function() {
    return this.id;
  },
  get visibleSettings () {
    var me=this;
    return Object.keys(this.config).filter(function(n) {
      return !me.config[n].hide;
    });
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
  get sortedNicks()  {
    return MSORT(this.players,'keys');
  },
  get nicks() {
    return Object.keys(this.players);
  },
  get activeNicks()  {
    var me = this;
    return this.nicks.filter(function(n){return !me.players[n].asleep});
  },
  destroy: function() {
    clearTimeout(this.timeout);
    for (var i in this.players) {
      if (i!=this.owner) this.leavePlayer(i);
    }
    this.leavePlayer(this.owner);
    delete Game.games[this.id];
  },
  doSay: function(msg,except,from,wrap,wrapmsg) {
    var g = this;
    var msg  = (wrap||'')+((from||'')+'            ').slice(0,12)+' 15│ ' + (wrapmsg||'') + msg + '';
    var list = this.nicks.filter(function(n){return n!=except}); //.map(function(n){return g.players[n].user.nick});
    while (list.length > 0 ) {
      var sublist = list.splice(0,4).join(',');
      client.say(sublist,msg);
    }    
  },
  say: function(msg,except,from,wrap,wrapmsg) {
    if (!(msg instanceof Array)) {
      msg = [].concat(msg.split(/\n+/));
    }
    while (msg.length) {
      var text = msg.shift();
      while (msg.length > 0 && text.length + msg[0].length < 450) {
        text+=' '+msg.shift();
      }
      this.doSay(text,except,from,wrap,wrapmsg);
    }
  },
  doTell: function(nick,msg,from,wrap,wrapmsg) {
    this.players[nick] && this.players[nick].user.tell((wrap||'')+((from||'')+'            ').slice(0,12)+' 15│ ' + (wrapmsg||'') + msg + '');
  },
  tell: function(nick,msg,from,wrap,wrapmsg) {
    if (!(msg instanceof Array)) {
      msg = [].concat(msg.split(/\n+/));
    }
    while (msg.length) {
      var text = msg.shift();
      while (msg.length > 0 && text.length + msg[0].length < 450) {
        text+=' '+msg.shift();
      }
      this.doTell(nick,text,from,wrap,wrapmsg);
    }
  },
  joinList: function(list) {
    var l = list.concat();
    if (l.length>1) {
      var tail = l.pop();
      return l.join(', ') + ' and ' + tail;
    }
    return l.length ? l[0] : ''
  },
  sayDivider: function(which) {
    var list = this.nicks;
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
  announce: function(msg) {
    if(!this.isTest) client.say('#'+channel,'01,00 ' + this.owner.nick + "'s game  "+msg);
  },
  sayStatus: function(msg) {
    this.say(msg,null,null,null,'03');
  },
  sayGame: function(msg,from) {
    this.say(msg,null,from,'');
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
    var p = new Player(this,nick);
    if (this.countPlayers == 0) {
      this.owner = p;
      this.tell( nick,'Welcome. This is your new ' + this.mode + ' mode game.');
    } else {
      this.tell(
        nick,
        'Welcome. This is a ' + this.mode + ' mode game, owned by '+ this.owner + '.' 
        + (this.state=='wait' ? ' Wait for the owner to start the game.' : ' The game is in progress. You can join in on the next turn.')
      );
      this.sayStatus(nick+' has joined the game.',null,null,'');
    }
    this.scores[nick] = this.scores[nick] || 0;
//    console.log('nicks:',this.sortedNicks);
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
    if (this.state == 'answer') {
      if (!this.playerAnswers[nick]) {
        this.turnPlayers ++;
      }
    } else if (this.state == 'vote') {
      if (!this.czarVotes[nick]) {
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
      if (this.state!='wait') this.setState('cancel');
    }
    this.players[nick].asleep = true;
    this.awakePlayers--;
    if (this.owner == nick) {
//      console.log(this.activeNicks);
      this.owner = this.players[this.activeNicks[0]];
      this.sayStatus ((this.owner || 'nobody') + ' now owns this game.');
    }
    if (this.state == 'answer') {
      if (!this.playerAnswers[nick]) {
        this.turnPlayers --;
        if(this.turnPlayers < 1) this.setState('judge');
      } 
    } else if (this.state == 'answer') {
      if (!this.czarVotes[nick]) {
        this.turnPlayers --;
        if(this.turnPlayers < 1) this.setState('vote_done');
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
  message: function(which) {
    
  },
  getCard: function(which) {
    return this.getCards(which,1)[0];
  },
  getCards: function(which,n) {
    var me = this;
    this.used[which] = this.used[which] || [];
    var ret = this.unused[which].splice(0,n);
    if (ret.length < n ) {
      this.shuffleCards(which);
      ret = ret.concat(this.getCards(which,n-ret.length));
    }
    this.used[which] = this.used[which] || [];
    ret.forEach( function(n) {
      me.used[which].push(String(n));
    })
    return ret;
  },
  shuffleCards: function(what) {
    var me = this;
    if (!what) {
      for (var i in this.decks) {
        this.shuffleCards(i);
      }
      return;
    } 
    this.used[what] = [];
    var d = this.decks[what];
    this.unused[what] = 
    this.content
    .get(d.type,d.use)
    .filter(function(n){
      return me.used[what].indexOf(String(n))<0
    })
    .shuffle();
    console.log(what,this.unused[what].length);
  },
  setDecks: function(which,args,respond) {
    var me = this;
    var decks = Object.keys(this.content.decks[which]).sort();
    var cur = me.decks[which].use.concat();
    for(var i = 0; i < args.length; i++) {
      if (!args[i].match(/^[+-]/)) return respond ? respond.usage() : console.log('bad '+which) && false;
      c = args[i][0] == '+' ;
      var d = args[i].slice(1);
      if (d=='all') {
        if (c) cur = decks.concat();
        else cur = [];
        continue;
      }
      if (Number(d)>0) d = decks[d-1];
      if (!this.content.decks[which][d]) return respond ? respond.error('No such deck '+d) : console.log('No such deck '+d) && false;
      if (c) cur.push(d);
      else cur = cur.filter(function(n){return n!=d});
    }    
    if (this.content.count(which,cur)<10) return respond?respond.error('That would leave you with too few '+which+' cards.') : console.log('That would leave you with too few '+which+' cards.') && false;
    this.decks[which].use = cur;
    return true;
  },
  listDecks: function(which,total) {
    var me = this;
    var colors = {
      black: {back:1,text:0,prefix:4},
      white: {back:0,text:1,prefix:4},
      yellow: {back:8,text:1,prefix:2}
    };
    console.log('which',me.decks[which].use);
    var list = formatList(Object.keys(me.content.decks[which]).sort(), function(n,i){
      return (me.decks[which].use.indexOf(n)>= 0 ? '+' : '-') + i;
    }, null, colors[which]);
    
    if (total) return list + ' Total ' + me.countCards(which) + ' ' + which + ' cards.'
    else return list;
  },
  countCards: function(d,which) {
    var deck = this.decks[d];
    return this.content.count(deck.type,which||deck.use);
  },
  printCountCards: function() {
    return "Total "+this.countCards('black')+' black and ' + this.countCards('white')+' white cards.';
  },
  _dealYellow: function(p) {
    p = this.players[p];
    if(!p) return;
    var c = this.getCard('yellow');
    var g = this.content.goodie(c);
    var show = {};
    show[c]=(g.quantity||1);
    //TODO: move elsewhere probably
    this.sayGame(p+' receives '+this.listYellow(show));
    p.yellow[c] = (p.yellow[c] || 0) + (g.quantity||1);
  },
  dealYellow:function(p,n) {
    n = n || 1;
    for (var i =0; i<n; i++) this._dealYellow(p);
  },
  _giveYellow: function(p,c,n) {
    p.yellow[c] = (p.yellow[c] || 0) + (n||0);
  },
  giveYellow:function(p,c,n) {
    if(!p) return false;
    if (typeof(c) != 'object') return this._giveYellow(p,c,n);
    for (var i in c) this._giveYellow(p,i,c[i]);
  },
  _dropYellow: function(p,c,n) {
    p = this.players[p];
    if(!p) return;
    p.yellow[c] = (p.yellow[c]||0) - (n||0);
  },
  dropYellow: function(p,c,n) {
    if(!p) return false;
    if (typeof(c) != 'object') return this._dropYellow(p,c,n);
    for (var i in c) this._dropYellow(p,i,c[i]);
  },
  _hasYellow: function(nick,c,n) {
    var p = this.players[nick];
    if(!p) {
      console.log('hasYellow '+nick);
      return false;
    }
    console.log('does',p.nick,'have',n,c,'?',p.yellow[c], (p.yellow[c]||0)>= (n||0));
    return (p.yellow[c]||0) >= (n||0);
  },
  hasYellow: function(p,c,n) {
    if(!p) return false;
    if (typeof(c) != 'object') return this._hasYellow(p,c,n !== undefined ? n : 1);
    for (var i in c) if (!this._hasYellow(p,i,c[i])) return false;
    return true;
  },
  listYellow: function(yellow) {
    var ret = '';
    for (var i in yellow) {
      if (!yellow[i]) continue;
      var g = this.content.goodie(i);
//      if (yellow[i]<>1) {
        ret += yellow[i] +'× ';
//      }
      ret+='01,08 '+ ( g && g.label || i).replace(/<b>/g,'02').replace(/<[/]b>/g,'01') +' \n';
    }
    return ret;
  },
  dealWhite: function(p) {
    p = this.players[p];
    if (this.settings.goodies) {
      var yellow = this.listYellow(p.yellow);
      if(yellow) this.tell(p,yellow,'GOODIES','');
    }

    if (p == this.czar && !this.votingRound) return this.tell(p,'You are the Card Czar for this turn. Sit back and relax while other players choose their answers.');
    var handSize = this.settings.cards + Math.min(this.settings.packHeat,this.answersExpected-1);
    p.white = p.white.concat(this.getCards('white',handSize - p.white.length)); 
    
    var white = formatList(p.white.map(
      function(n){return capitalize(n);
    }));
    this.tell(p,white,'WHITE','');
  },
  printQuestion: function() {
    return  '0,1 ' + this.questionText + '  Pick ' + this.answersExpected + '.';
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
   
    if (scores[0] >= this.settings.pointsToWin-1) {

      var inlead = this.topLeaders;
      var inleadNoCzar = inlead.filter( function (n){
        return n!=me.czar.nick
      });
      if (this.settings.margin<2) var msg =  '5Match point for ' + me.joinList(inleadNoCzar)+'.';
      else if (scores[0]>=scores[1]+this.settings.margin-1 && this.czar.nick != first) var msg= '5Match point for ' + leaders[0] +'.';
      else if (inlead.length>1  && scores[0]>=this.settings.pointsToWin+this.settings.suddenDeath-1) var msg= "0,5" + " SUDDEN DEATH 5 " + me.joinList(inleadNoCzar)+'.';
      else if (inlead.length>1) var msg= "3" + ['Deuce','Treuce','Quadreuce','Quinteuce','Sexteuce','Septeuce','Octeuce','Noneuce','Not going to happen'][inlead.length-2]+": " + me.joinList(inlead)+'.';
    } else {
      var rand = this.getCard('white');
      var msg = 
      this
      .getCard('beforeturn')
      .replace(/{{{(.*?)}}}/g,function(m,m1) {
        return ({
          first: first,
          last: last,
          czar: me.czar,
          white: rand
        })[m1] || m1
      });
    }    
    var description = this.votingRound
    ? '5This is a voting round. | '
    : ''+this.czar +' is the Card Czar for this turn. | ';
    
    return description + '' + msg +  ''
  },
  nextCzar: function(repeat) {
    var me = this;
    var i;
    var awake = this.sortedNicks.filter(function(n){return !me.players[n].asleep});
    for (i=0; i<awake.length; i++) {
      if (awake[i] > this.czar || repeat && awake[i]==this.czar) break;
    }
    this.czar = this.players[awake[(i) % awake.length]];
  },
  doRando: function(nick) {
    var p = this.players[nick];
    var answer = {
      player: nick || 'Rando Cardrissian',
      white: [],
      desc: []
    }
    var parts = [];
    for (var i = 0; i < this.answersExpected; i++) {
      var n = 10;
      if (this.settings.combinatorix) var l = 4-Math.max(1,Math.ceil(Math.log(Math.random()*n*n*n)/Math.log(n)));
      else var l = 1;
      var cards = [];
      for (var j = 0; j<l; j++) {
         var c = this.getCard('white');
         answer.desc.push(this.describeWhite(c));
         cards.push(String(c));
      };
      parts.push(capitalize(cards.join(' ')));
    }
    answer.text = parts.join(' | ');
    this.czarAnswers.push(answer);
  },
  describeWhite: function(c) {
    var label = String(c).length <= 25
    ? String(c)
    : String(c).slice(0,10) + ' ... ' + String(c).slice(-10);
    return '01,00 ' + label + '  '+c.desc;
  },
  parseAnswer: function(p,text,parts) {
    var text = text.replace(/\s*([+/])\s*/g,'$1').replace(/\s+/g,' ');
    var A = text.split('/');
    var person = this.players[p];
    var ret = {
      player: person.nick,
      answers: [],
      white: [],
      yellow: {
        slash: A.length - 1,
        plus: 0,
        prep: 0,
      },
    };
    
    if (!this.settings.goodies && A.length > 1) return "Goodies are not allowed in this game.";
    
    var a; while (a = A.shift()) {
      var answer = {
        text:'',
        white:[],
        desc:[],
        player:person.nick
      }
      var P = a.split(' ');
      if (P.length != parts) return "Wrong number of answers in '"+text+"' ("+P.length+", not "+parts+"): "+a;
      var pp = [];
      var p; while (p = P.shift()) {
        var C = p.split('+');
        if (this.settings.goodies) {
          ret.yellow.plus += C.length - 1;
        } else if (!this.settings.combinatorix && C.length > 1) {
          return "Combinatorix is not allowed in this game."
        }
        var cc = [];
        var c; while (c = C.shift()) {
          if (c.match(/[1-9][0-9]?/)) {
            c = 0|c ;
            if (!c) return "Division by zero aught none.";
            if (c>person.white.length) return "You don't have that many white cards: "+c;
            
            c--;
            if (ret.white.indexOf(c)>-1) return "You can't use the same card twice: "+c;
            ret.white.push(c);
            answer.white.push(c);
            cc.push(person.white[c]);
            answer.desc.push(this.describeWhite(person.white[c]));
          } else if (c.match(/^[a-z][a-z]?[a-z]?[a-z]?$/i)) {
            if (!this.settings.goodies) return "Goodies are not allowed in this game";
            cc.push(c);
            ret.yellow.prep++;
          } else {
            return "Unrecognized bit of answer: "+c;
          }
        }
        pp.push(capitalize(cc.join(' ')));
      }
      answer.text = pp.join(' | ');
      ret.answers.push(answer);
    }
    if(this.settings.goodies && !this.hasYellow(String(ret.player),ret.yellow)) return "You don't have " + this.listYellow(ret.yellow);
    console.log(ret);
    return ret;
  },
  clearAnswers: function() {
    this.playerAnswers = {}
  },
  registerAnswer: function(p,answer) {
    this.playerAnswers[p] = answer;
  },
  unregisterAnswer: function(p) {
    delete this.playerAnswers[p];
  },
  makeCzarAnswers: function() {
    this.czarAnswers = [];
    for(var i in this.playerAnswers) {
      var p = this.playerAnswers[i];
      for (var j in p.answers) {
        var a = p.answers[j];
        this.czarAnswers.push(a);
      }
    }
    for (var i=0; i<this.settings.rando; i++) {
      this.doRando();
    }
    this.czarAnswers = this.czarAnswers.shuffle();
  },
  listCzarAnswers: function() {
    return this.czarAnswers.map(function(n,i) {
        return  '4,0 !'+(i+1)+'1,0 ' + n.text +' ';
      }).join('\n');
  },
  doAnswer: function(p, text) {
    return this.doCmd(p,'answer '+text);
  },
  doQuestion: function(p,text) {
    this.doCmd(p, 'wtf '+text);
  },
  doCmd: function(p, text) {
    var args = text.trim().split(/\s+/);
    var cmd = args.shift().toLowerCase();
    var me = this;
    var respond = function (msg) {
      me.tell(p,msg,'.'+cmd);
    };
    respond.error = function(msg) {
      me.tellError(p,msg,'.'+cmd);
    }
    var command = this.commands[cmd];
    if (command) {
      respond.usage = function(msg) {
        me.tellError(p,command.usage || 'Inappropriate use of !'+cmd);
      }
      
      if (command.args) args = command.args.apply(this,[args]);
      
      var state, multi, auth, method, usage;
      
      if (subcommand = command[args.length + '_'+this.state]) {
        state = this.state;
        multi = false;
      } else if (subcommand = command['_'+this.state]) {
        state = this.state;
        multi = true;
      } else if (subcommand = command[args.length]) {
        state = subcommand.state || command.state;
        multi = false;
      } else {
        state = command.state;
        multi = true;
      }
      method = subcommand && subcommand.action || command.action;
      auth = subcommand && 'auth' in subcommand ? subcommand.auth : command.auth;
      usage = command.usage;
          
      switch(auth) {
      case 'owner':
        if (p != this.owner) return respond.error('Only the owner can do that.');
        break;
      case 'czar':
        if (p != this.czar.nick) return respond.error('You are not the czar for this turn.');
        break;
      }
      if (state && String(state).trim().split(/\s/).indexOf(this.state)<0) return respond.error("You can't do that now.");
      method.apply(this, [p, respond].concat(multi ? [args,text] : args));
      return true;
    }
    onGlobalCmd(p,'.'+text, respond, respond.error);
    //respond.error('Unknown command ' + cmd + '. Use help!');
  },
setState: function(s,args) {
    //console.log('setting state',s);
    clearTimeout(this.timeout);
    var me = this;
    state = this.states[s];
    if (state.enter) var res = state.enter.apply(this,args);
    if (res === false) return;
    this.state = s;
    
    if (state.next) {
      var next = typeof(state.next) == 'function' ? state.next.apply(this,args) : state.next;
      var time = typeof(state.time) == 'function' ? state.time.apply(this,args) : state.time | 0;
      var warning = typeof(state.warning) == 'function' ? state.warning.apply(this,args) : state.warning | 0;
      console.log(s,next,time,warning);
      var warn = state.warn || function(w) {
        me.sayGame('5'+w+'');
      };
      var jump = function() {
        me.setState(next);
      }
      if (warning && warning<time-5) {
        me.timeout = setTimeout(function() {
          warn.apply(me,[warning + ' seconds left.'].concat(args));
          me.timeout = setTimeout(jump,  warning * 1000)
        },(time-warning) * 1000);
      } else {
        me.timeout = setTimeout(jump,time*1000);
      }
    }
  },
  set: function(name,value) {
    var setting = this.config[name];
    if(!setting) return;
    var min = setting.min;
    var def = setting.def;
    var max = setting.max;
    this.settings[name] = Math.max(min,Math.min(max,value!==undefined ? value: def)) ;
  },
  lookupSetting: function(n) {
    for (var i in this.config) {
      if (i.toLowerCase() == n.toLowerCase() || this.config[i].abbr.toLowerCase() == n.toLowerCase()) {
        return i;
        break;
      }
    }
  },
  onSay: function(p,msg) {
    switch (this.settings.verbosity|0) {
    case 0:
      return this.tell(p,'Shh!');
    case 1:
      if (this.state == 'turn' || this.state == 'czar' || this.state == 'vote') return this.tell(p,'Shh!');
      break;
    case 2:
      if (this.state == 'czar'|| this.state == 'vote') return this.tell(p,'Shh!');
      break;
    case 3:
      if (this.state == 'czar' && p!=this.czar.nick) return this.tell(p,'Shh!');
      break;
    }
    this.say(msg,p,p,'13','13');
    return;
  }
}

