
module.exports ={
  help: {
    usage: ".help, .help [command]",
    help: "Help, I need help with help.",
    0: {
      action: function(p,respond) {
        respond(
          'Use ![number] to play white cards and to choose the winner. Available commands: ' 
        + Object.keys(this.commands).map(function(n) {
            return '.'+n;
          }).join(', ')
        );
      }
    },
    1: {
      action: function(p,respond, a1) {
        a1 = a1.replace(/^[.]/,'');
        var c = this.commands[a1];
        if (!c) return respond.error('Unknown command '+a1+'. Use .help to see a list of available commands.');
        respond((c.help ? c.help + ' ' : '') + (c.usage ? 'Usage: ' + c.usage : ''));
      }
    }
  },
  answer: {
    usage: '!1, !1 2, !1+2, !answer [number], .answer [number] [number], .answer [number]+[number]',
    state: 'answer',
    help: "Use this to choose your answer. Can be abbreviated to just '!'.",
    _answer: {
      action: function(p,respond,answer,text) {
        if (p == this.czar && !this.votingRound) return respond.error('You were told to sit back and relax.');
        if (this.acceptAnswersFrom && this.acceptAnswersFrom.indexOf(String(p))==-1) return respond.error('Not now!');
        var a = this.parseAnswer(p,text.replace(/^[a-z]+\s+/gi,''),this.answersExpected);
        if (typeof(a)=='string') {
          respond.error(a);
        } else {
          respond('You answered: ' 
            + a.answers.map( function(n) {
              return '1,0 '+n.text+'  ';
            })
            .join('')
            + this.listYellow(a.yellow)
          );
          if (this.players[p].asleep) this.wakePlayer(p);  
          if (!this.playerAnswers[p]) this.turnPlayers --;
          this.registerAnswer(p,a);
          if (this.turnPlayers == 0) this.setState('answer_done');
        }
        return;
      }
/*        
        if (p == this.czar && !this.votingRound) return respond.error('You were told to sit back and relax.');
        if (answer.length!=this.answersExpected) return respond.error("You must pick "+this.answersExpected+" cards, like this: " + ("!1 2 3 4 5").slice(0,this.answersExpected*2));
        
        var ans = [];
        var cards = [];
        var desc = [];
        for (var i=0; i<answer.length; i++) {
          var subans = [];
          if (!answer[i].match(/^\d+([+]\d+)*$/)) return respond.usage();
          var parts = answer[i].split(/[+]/);
          if (!this.settings.combinatorix && parts.length>1) return respond.error("No combinatorix allowed in this game.");
          for (var j = 0; j<parts.length; j++) {
            var A = parts[j]-1;
            if (A < 0) return respond.error("Unexpected division by zero aught nothing.");
            if (A >= p.white.length) return respond.error("You don't have that many white cards.");
            if (cards.indexOf(A)>-1) return respond.error("You can't play the same card more than once.");
            cards.push(A);
            subans.push(p.white[A]);
            desc.push('' + String(p.white[A]) + ': ' + p.white[A].desc);
          }
          var s = subans.join(' ');
          ans.push(capitalize(s));
        }
        if (this.players[p].asleep) this.wakePlayer(p);  
        if (!this.answerText[p]) this.turnPlayers --;
        this.answerText[p] = ans.join(' │ ');
        this.answerCards[p] = MSORT(cards,'desc');
        this.answerDesc[p] = desc;
        respond("You answered: 1,0 "+this.answerText[p]+'  ');
        if (this.turnPlayers == 0) this.setState('answer_done');
*/      
    },
    '1_vote': {
      action: function(p,respond,a1) {
        var answer = Number(a1);
        if (!answer) return respond.usage();
        if (this.czarAnswers.length<answer) return respond.error("You don't have that many choices.");
        if (this.czarAnswers[answer-1].player==p) return respond.error("You cant't vote for yourself.");
        
        if (!(p in this.czarVotes)) this.turnPlayers --;
        respond("You chose: 1,0 "+this.czarAnswers[answer-1].text+'  ');

        this.czarVotes[p] = answer;
        if (this.turnPlayers == 0) this.setState('vote_done');
      }
    },
    '1_judge': {
      auth: 'czar',
      action: function(p,respond,a1) {
        var answer = Number(a1);
        if (!answer) return respond.usage();
        if (this.czarAnswers.length<answer) return respond.error("You don't have that many choices.");
        this.czarAnswer = answer - 1;
        this.setState('score');
      }
    },
  },
/*  
  drop: {
    usage: '!drop [number] [number] ...',
    help: 'You can drop any of your white cards, and lose one point.',
    state: 'answer',
    action: function(p,respond,args) {
      if (this.scores[p]<1) return respond.error('You have no points to trade for new cards.');
      var ans = args.concat();
      //ans.shift();
      for (var i = 0; i<ans.length;i++) {
        ans[i] = Number(ans[i]);
        if (ans[i]<1 || ans[i]>p.white.length) return respond.error('Out of range: '+ans[i]);
      }
      if (!(ans.length>0)) return respond.usage();
      this.scores[p]--;
      this.sayGame(p+' drops ' + ans.length + ' white card' + (ans.length>1 ? 's' :'') + ' and loses 1 point.');
      ans = MSORT(ans,'desc');
      for (var i = 0; i<ans.length;i++) {
        p.white.splice(ans[i]-1,1);
      }
      this.dealWhite(p);
    },
  },
*/  
  me: {
    usage: '.me flolops',
    action: function(p,respond,args,text) {
      this.sayGame(p+' '+text.slice(3));
    },
  },
  leave: {
    usage: '.leave',
    help: "Use this to leave the game.",
    0: {
      action: function(p,respond) {
        this.leavePlayer(p);
      }
    }
  },  
  wake: {
    usage: '.wake',
    help: 'For waking up after !sleep.',
    0: {
      action: function(p,respond) {
        if (!p.asleep) return respond.error ("You're already awake.");
        this.wakePlayer(p);
      },
    }
  },  
  players: {
    usage: '.players',
    help: 'Displays a list of players.',
    0: {
      action: function(p,respond) {
        var me = this;
        respond(formatList(this.nicks,function(n,i){
          return (me.players[n].asleep ? '-' : '+') + i;
        }));
      }
    }
  },
  score: {
    usage: '.score',
    help: 'Displays the current scoreboard.',
    0: {
      action: function(p,respond) {
        if (this.state == 'wait') return respond.error("The game hasn't started yet.");
        return respond(this.printScore());
      }
    }
  },
  wtf: {
    usage: '.wtf ?, ??, .wtf [number], ?[number]',
    help: "Displays information about your white cards ([number]) or the black card (?). Can be abbreviated to just '?'.",
    1: {
      action: function(p,respond,a1) {
        var me = this;
        if (!this.question) return respond.error('Not now.');
        if (a1 == '?') return respond(this.question.desc);
        a1 = Number(a1);
        if (this.state == 'answer' && a1 <= this.players[p].white.length) return respond(this.describeWhite(this.players[p].white[a1-1]));
        if ((this.state == 'judge' || this.state == 'interval' || this.state=='vote') && a1 <= this.czarAnswers.length) {
          respond(this.czarAnswers[a1-1].desc.join('\n'));
          return;
        }
        respond.usage();
      }
    }
  },
  ask: {
    usage: '.ask',
    help: "Shows the question if you missed it.",
    state: "answer",
    0: {
      action: function(p,respond) {
        respond (this.describeTurn(), 'TURN '+ this.countTurns  );
        respond ('0,1 ' + this.questionText + '  Pick ' + this.answersExpected + '.','BLACK');
        this.wakePlayer(p);
        if (p!=this.czar || this.votingRound) this.dealWhite(p);
      }
    }
  },
/* D U A L   U S E   C O M M A N D S
*************************************/    


// SLEEP
  sleep: {
    usage: '.sleep, .sleep [player]',
    help: "While you're asleep, other players can play without waiting for you. Use .wake to wake. The owner can also put other players to sleep.",
    0: {
      action: function(p,respond) {
        if (p.asleep) return respond.error ("You were already asleep.");
        this.sleepPlayer(p);
      },
    },
    1: {
      auth:'owner',
      action: function(p,respond,a1) {
        var p1 = lookupList(this.nicks,a1);
        if (!this.players[p1]) return respond.error('No player ' + a1+ ' in this game.');
        this.sleepPlayer(p1);
      }
    }
  },
// OWNER
  owner: {
    usage: '.owner, .owner [player]',
    help: "Displays the current owner of the game. The owner can also give the ownership of the game to another player.",
    0: {
      action: function (p, respond) {
        respond('This game is owned by '+this.owner);
      },
    },
    1: {
      auth: 'owner',
      action: function (p, respond, a1) {
        var p1 = lookupList(this.nicks,a1);
        if (!this.players[p1]) return respond.error('No player ' + a1+ ' in this game.');
        this.owner = this.players[p1];
        this.sayStatus('This game is now owned by ' + p1 + '.');
      },
    }
  },


//SET 
  set: {
    usage: '.set, .set [setting], .set [setting] [value], .set -[setting], .set +[setting]',
    help: "Displays the list of current settings, or information about a setting. The owner can also change settings.",
    args: function(args) {
      var A = args.concat(), B = [], a;
      while (A.length) {
        a = A.shift();
        if (a.match(/^[+-]/)) B.push(a.slice(1),a[0]=='+'?'MAX':'MIN');
        else B.push(a);
      }
      return B;
    },
    0: {
      action: function(p,respond) {
        var me = this;
        respond(formatList(this.visibleSettings.map(function(n){
          var setting = me.config[n];
          return n.replace(RegExp('('+setting.abbr+')','i'),'5$11')   
          + ' ' + (setting.min==0 && setting.max==1 ? (me.settings[n] ? "ON" : "OFF") : me.settings[n]);
        }), function(){return ''}));
      }
    },
    1: {
      action: function(p,respond,a1) {
        var s1 = this.lookupSetting(a1);
        if (!s1 || this.config[s1].hide) return respond.error('Unknown setting '+a1+'. Try .set.');
        var setting = this.config[s1];
        respond(setting.help + ' | current value = ' + this.settings[s1] +' | min = '+setting.min+ ' | max = '+setting.max+ ' | default = '+setting.def);
      }
    },
    2: {
      auth:'owner',
      action: function(p,respond,a1,a2) {
        var s1 = this.lookupSetting(a1);
        if (!s1 || this.config[s1].hide) return respond.error('Unknown setting '+a1+'. Try .set.');
        var setting = this.config[s1];
        
        a2 = String(a2).toLowerCase();
        if (a2 == 'max') a2 = setting.max;
        else if (a2 == 'min') a2 = setting.min;
        else if (a2 == 'on' ) a2 = 1;
        else if (a2 == 'off') a2 = 0;
          
        this.set(s1,a2);
        this.sayStatus( p +' sets '+ s1 + ' to ' + this.settings[s1]+'.');
      }
    }
  },

/* O W N E R   C O M M A N D S
*******************************/    

// START
  start: {
    help: "The owner can use this to start the game when ready.",
    usage: '.start',
    auth: 'owner',
    0: {
      action: function(p,respond) {
        if (this.state != 'wait') return respond.error('The game has already started.');
        this.setState('begin');
//        this.newGame();
      }
    }
  },
// END
  end: {
    usage: '.end',
    help: "The owner can end the game prematurely.",
    auth: 'owner',
    0: {
      action: function(p,respond) {
        if (this.state == 'wait') return respond.error('The game hasn\'t started yet.');
        this.setState('end');
      }
    }
  },
  
// STOP
  stop: {
    usage: '.stop',
    help: "The owner can temporarily stop a game. Use .continue to continue.",
    auth: 'owner',
    0: {
      action: function(p,respond) {
        if (this.state=='wait') return respond.error("The game hasn't started yet.");
        this.sayStatus(p+ ' paused the game.');
        this.setState('cancel');
        this.state = 'stopped';
      }
    }
  },
  pause: {
    alias: 'stop'
  },
  
// CONTINUE
  continue: {
    usage: '.continue',
    help: "The owner can continue a !stopped game.",
    auth: 'owner',
    0: {
      action: function(p,respond) {
        if (this.state!='stopped') return respond.error("The game isn't paused.");
        this.sayStatus(p+ ' unpaused the game.');
        this.setState('turn');
      }
    }
  },
  unpause: {
    alias: 'continue'
  },

// SKIP
  skip: {
    usage: '.skip',
    help: "The owner can skip a question.",
    auth: 'owner',
    0: {
      action: function(p,respond) {
        if (this.state == 'wait') return respond.error('Not now.')
        this.sayGame("Question skipped by " + p + ".");
        this.setState('cancel');
      }
    }
  },
//// CZAR
//  czar: {
//    usage: '.judge',
//    help: "The owner can end the game and kick all players.",
//    auth: 'owner',
//    0: {
//      action: function(p,respond) {
//        if (this.state != 'turn') return respond.error('Not now.');
//        this.sayGame("Czaring forced by " + p + ".");
//        this.judgeTurn();
//      }
//    }
//  },
// KICK
  kick: {
    usage: '.kick [player]',
    help: "The owner can kick players from the game.",
    auth: 'owner',
    0: {
      action: function(p,respond) {
        respond.error('Kick whom?');
      }
    },
    1: {
      action: function(p,respond,a1) {
        var p1 = lookupList(this.nicks,a1);
        if (!this.players[p1]) return respond.error('No player ' + a1+ ' in this game.');
        this.sayStatus (p1+' has been kicked by ' + p + '.');
        this.leavePlayer(p1);
      }
    }
  },
// CLOSE
  close: {
    usage: '.close',
    auth: 'owner',
    help: "The owner can end the game and kick all players.",
    confirm: 'This will end the game and kick all players including yourself.',
    0: {
      action: function(p,respond) {
        this.destroy();
      }
    }
  },

// SHUFLLE
  shuffle: {
    usage: '.shuffle',
    help: "The owner can reshuffle the deck.",
    auth: 'owner',
    0: {
      action: function(p,respond) {
        this.shuffleCards();
        this.sayStatus(p+ ' reshuffled the deck. Previously used cards will appear again.');
      }
    }
  },
// RELOAD
  reload: {
    usage: '.reload',
    help: "The owner can reload the cards.",
    auth: 'owner',
    0: {
      action: function(p,respond) {
        var me = this;
        this.content.load(function(){
          me.shuffleCards()
          me.sayStatus(p+ ' reloaded the cards.');
        });
      }
    }
  },
// DECK
  black: {
    usage: '.black, .black +[deck] [deck] -[deck] [deck], or just .black +all.',
    help: "Displays the list of available black decks. The owner can also change deck settings.",
    0: {
      auth: null,
      action: function (p, respond) {
        respond(this.listDecks('black',true));
      },
    },
    auth: 'owner',
    action: function(p,respond,args) {
      if (this.setDecks('black',args,respond)) {
        this.sayStatus(p + ' changed black deck settings: '+ this.listDecks('black',true));
      }
    }
  },
  white: {
    usage: '.white, .white +[deck] [deck] -[deck] [deck], or just .white +all.',
    help: "Displays the list of available white decks. The owner can also change deck settings.",
    0: {
      auth: null,
      action: function (p, respond) {
        respond(this.listDecks('white',true));
      },
    },
    auth: 'owner',
    action: function(p,respond,args) {
      if (this.setDecks('white',args,respond)) {
        this.sayStatus(p + ' changed white deck settings: '+ this.listDecks('white',true));
      }
    }
  },
  decks: {
    help: "Displays the list of current deck settings. The owner can also change deck settings.",
    usage: '.deck, .deck +[deck] [deck] -[deck] [deck], or just .deck +all.',
    0: {
      auth: null,
      action: function (p, respond) {
        respond(this.listDecks('black',true));
        respond(this.listDecks('white',true));
      },
    },
    auth: 'owner',
    action: function(p,respond,args) {
      if (this.setDecks('black',args,respond)) {
        this.sayStatus(p + ' changed black deck settings: '+ this.listDecks('black',true));
      }
      if (this.setDecks('white',args,respond)) {
        this.sayStatus(p + ' changed white deck settings: '+ this.listDecks('white',true));
      }
    }
  },
  // GOODIES
  p: {
    '0_answer': {
      action: function(p,respond) {
        if (!this.settings.goodies) return respond.error("Goodies are not allowed in this game.")
        var req = { noczar : 1 };
        var p = this.players[p];
        if (!this.hasYellow(p,req)) return respond.error("You don't have "+this.listYellow(req));

        if (this.votingRound) return respond.error("This is already a voting round.");
        if (p!=this.czar) return respond.error("You are not the czar, silly.");
        this.votingRound = true;
        this.turnPlayers++;
        this.sayGame('This is now a voting round.');
        this.dropYellow(p,req);
        this.dealWhite(p);
      }
    }
  },
  m: {
    '0_answer': {
      action: function(p,respond) {
        if (!this.settings.goodies) return respond.error("Goodies are not allowed in this game.")
        var req = { morecards : 1 };
        var p = this.players[p];
        if (!this.hasYellow(p,req)) return respond.error("You don't have "+this.listYellow(req));
        if (p==this.czar && !this.votingRound) return respond.error("Not now.");
        p.white = p.white.concat(this.getCards('white',3)); 
        this.dropYellow(p,req);
        this.dealWhite(p);
      }
    }
  },
  h: {
    '0_answer': {
      action: function(p,respond) {
        if (!this.settings.goodies) return respond.error("Goodies are not allowed in this game.")
        var p = this.players[p];
        var req = { newhand : 1 };
        if (!this.hasYellow(p,req)) return respond.error("You don't have "+this.listYellow(req));
        if (p==this.czar && !this.votingRound) return respond.error("Not now.");
        p.white = [];
        this.dropYellow(p,req);
        this.dealWhite(p);
      }
    }
  },
  t: {
    '0_answer': {
      action: function(p,respond) {
        if (!this.settings.goodies) return respond.error("Goodies are not allowed in this game.")
        var req = { newtime : 1 };
        var p = this.players[p];
        if (!this.hasYellow(p,req)) return respond.error("You don't have "+this.listYellow(req));
        if (p==this.czar && !this.votingRound) return respond.error("Not now.");
        this.sayGame('Clock kicked by '+p+'. 10 seconds left');
        this.setState('answer',[10]);
        this.dropYellow(p,req);
      }
    }
  },
  d: {
    '0_answer': {
      action: function(p,respond) {
        if (!this.settings.goodies) return respond.error("Goodies are not allowed in this game.")
        var req = { double : 1 };
        var p = this.players[p];
        if (!this.hasYellow(p,req)) return respond.error("You don't have "+this.listYellow(req));
        if (p==this.czar && !this.votingRound) return respond.error("Not now.");
        
        if (this.playerDouble[p]) {
          this.playerDouble[p] = false;
          this.tell(p,'Double or nothing is off.')
        } else {
          this.playerDouble[p] = true;
          this.tell(p,'Double or nothing is on.')
        }
      }
    }
  },
  '0': {
    '0_czar': {
      auth: 'czar',
      action: function(p,respond) {
        if (!this.settings.goodies) return respond.error("Goodies are not allowed in this game.")
        var req = { zero : 1 };
        var p = this.players[p];
        if (!this.hasYellow(p,req)) return respond.error("You don't have "+this.listYellow(req));
        if (p!=this.czar || this.votingRound) return respond.error("Not now.");
        
        this.sayGame(p+' says that you all suck. Rando awards himself a point. Current standings: '+this.printScore());
        this.scores['RandoCardrissian']++;
        this.setState('cancel');
        this.dropYellow(p,req);
      }
    }
  },
}
