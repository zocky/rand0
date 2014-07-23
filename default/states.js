module.exports = {
  init: {
    enter: function() {
      this.whiteDecks = ['default','custom','apples'];
      this.blackDecks = ['default','custom'];
      this.decks = {
        beforeturn: {
          type: 'messages',
          use:  'beforeturn'
        },
        winner: {
          type: 'messages',
          use:  'winner'
        },
        white: {
          type: 'white',
          use:  this.whiteDecks
        },
        black: {
          type: 'black',
          use:  this.blackDecks
        },
        yellow: {
          type: 'yellow',
          use:  'goodies'
        }
      };
    },
    next: 'prepare',
  },
  prepare: {
    enter: function() {
      this.shuffleCards();
      this.scores = {};
      this.czar = this.sortedNicks.shuffle().pop();
    },
    next: 'wait',
  },
  wait: {
    enter: function() {
    }
  },
  begin: {
    enter: function() {
      if (this.loading > 0) {
        this.tellError(this.owner,"Can't start a game while cards are loading");
        return;
      };
      this.countTurns = 0;
      this.scores = {
        'Rando Cardrissian':0
      };
      for (var i in this.players) {
        this.scores[i] = 0;
        this.players[i].white=[];
        if (this.settings.goodies) {
          this.players[i].yellow = {
            time:   3,
            plus:   5,
          };
          this.dealYellow(i);
        }
      }
      if (this.settings.autoShuffle) {
        this.shuffleCards('white');
        this.shuffleCards('black');
      }
    },
    next: 'intro',
  },
  intro: {
    enter: function() {
      this.sayStatus('The game is starting.');
      this.announce('The game is starting.');
    },
    next: 'turn',
  },
  turn: {
    enter:function() {
      this.countTurns++;
      this.question = this.getCard('black');
      
      var pos = this.sortedNicks.indexOf(this.czar.nick);
      console.log('czar pos',this.czar.nick,pos);
      if (!this.votingRound && pos == this.sortedNicks.length - 1 ) {
        this.votingRound = true;
      } else {
        this.votingRound = false;
        this.nextCzar();
      }
      this.turnPlayers = 0; 
      for (var i in this.players) if (!this.players[i].asleep) this.turnPlayers ++;
      if (!this.votingRound) this.turnPlayers--;

      this.answersExpected = Math.max(1,String(this.question).replace(/[^_]/g,'').length);
      this.questionText = String(this.question).replace(/_/g,'……………………');
      
      this.clearAnswers();
      this.sayDivider();
      
      this.sayGame (this.describeTurn(), 'TURN '+ this.countTurns  );
      this.sayGame (this.printQuestion(),'BLACK');
      this.sayDivider('middle');
      this.playerDouble = {};
      for (var p in this.players) this.dealWhite(p);

    }, 
    next: 'answer',
  },
  answer: {
    enter: function(time,nicks) {
      this.acceptAnswersFrom = nicks;
    },
    time: function(time,nicks) {
      return time || this.settings.answerTime;
    },
    warning: 10,
    warn: function(w) {
      this.sayGame(w);
    },
    next: 'answer_timeout',
  },
  answer_timeout: {
    enter:function(){
      var me = this;
      var missing = me.sortedNicks.filter( function (n) {
        return (n!=String(me.czar) || this.votingRound) && !me.players[n].asleep && !me.playerAnswers[n];
      });
      
      var timeoutFor = [];
      var extendFor = [];
      var req = {time:1};
      
      for (var i in missing) {
        p = missing[i];
        if (this.settings.goodies && this.hasYellow(p,req)) {
          extendFor.push(p);
          this.dropYellow(p,req);
        } else {
          timeoutFor.push(p);
        }
      }
      if (timeoutFor.length) me.sayGame('Time has run out for ' + me.joinList(timeoutFor) + '.');
      if (this.settings.goodies && extendFor.length) {
        this.sayGame(this.joinList(extendFor)+': '+this.listYellow({time:-1}));
        this.setState('answer',[10,extendFor]);
        return false;
      }
    },
    next: 'answer_done',
  },
  answer_done: {
    enter: function() {
      this.makeCzarAnswers();
//      console.log(this.czarAnswers);
      //if (this.settings.rando) this.doRando();
    },
    next: function() {
      return this.votingRound ? 'vote' : 'judge';
    }
  },
  judge: {
    enter: function() {
      this.sayGame('The Card Czar will now choose their favourite answer.');
      this.tell(this.czar,this.czar + ', you are the Card Czar. Choose wisely.');
      this.tell(this.czar,this.printQuestion(),'QUESTION');

      var me = this;
      this.sayGame(this.listCzarAnswers(), 'ANSWERS');
      
    },
    next: 'judge_timeout',
    time: function() {
      return this.settings.czarTime;
    },
    warning: 10,
    warn: function(w) {
      this.sayGame(w);
    },
  },
  judge_timeout: {
    enter: function() {
      this.scores[this.czar] = (this.scores[this.czar]||0)-1;
      this.sayGame ('The czar failed to choose the winner and loses one point. Current standings: '+this.printScore());
    },
    next: 'cancel',
  },
  cancel: {
    enter: function() {
      this.sayGame ('No points will be scored and your white cards will be returned to you.');
    },
    next: 'interval',
  },
  vote: {
    enter: function() {
    
      this.turnPlayers = 0; 
      for (var i in this.players) if (!this.players[i].asleep) this.turnPlayers ++;
    
      this.sayGame('5This is a voting round. Vote for your favorite answer.');
      this.sayGame(this.printQuestion(),'QUESTION');
      this.sayGame(this.listCzarAnswers(), 'ANSWERS');
      this.czarVotes = {};
    },
    warning: 10,
    warn: function(w) {
      this.sayGame(w);
    },
    time: function() {
      return this.settings.czarTime;
    },
    next: 'vote_timeout',
  },
  vote_timeout: {
    enter: function() {
      var me = this;
      var missing = me.sortedNicks.filter( function (n) {
        return !me.players[n].asleep && !me.czarVotes[n];
      });
      
      this.sayGame ('Time has run out for '+this.joinList(missing));
    },
    next: 'vote_done',
  },
  vote_done: {
    enter: function() {
      var a = [];
      for (var i=0; i<=this.czarAnswers.length; i++) a[i]=0;
      for (var i in this.czarVotes) {
        var v = this.czarVotes[i];
        a[v]++;
      }
      var m = Math.max.apply(Math,a)
      var w = a.reduce(function(a,n,i){return i>0 && n==m ? a.concat(i) : a},[]);
      console.log('vote scores',a);
      console.log('vote winners',w);
      if (w.length>1) {
        this.sayGame('The answers '+this.joinList(w) + ' have received the same number of votes. Rando casts the deciding vote.');
        this.czarAnswer = w[0|(Math.random()*w.length)]-1;
        this.maxVotes = m+1;
      } else {
        this.czarAnswer = w[0]-1;
        this.maxVotes = m;
      }
    },
    next: 'score'
  },
  score: {
    enter: function() {
      var answer = this.czarAnswers[this.czarAnswer];
      var winner = answer.player;
      var text = answer.text;
      if (this.settings.goodies && this.playerDouble[winner]) {
        var points = 2;
        var gained = this.scores[winner] ? 'two points.' : 'their first two points.'
      } else {
        var points = 1;
        var gained = this.scores[winner] ? 'one point.' : 'their first point.'
      }
      if (this.settings.goodies) {
        for (var i in this.playerDouble) {
          this.playerDouble[i] && this.dropYellow(i,{double:1});
        }
      }
      
      this.scores[winner] = (this.scores[winner]|0)+points;

      if (!this.votingRound) {
        this.sayGame (
          this.czar +' chose 1,0 ' + text+'   ' 
          +winner + ' wins ' + gained
          +' Current standings: ' + this.printScore(),'CZAR');
      } else {
        this.sayGame (
          'The winner is 1,0 ' + text +'  with '+this.maxVotes+' votes. ' 
          +winner + ' wins ' + gained
          +' Current standings: ' + this.printScore(),'CZAR');
      }        
      if (this.settings.goodies) this.dealYellow(winner);
      this.sayDivider('bottom');
    },
    next: 'drop', 
  },
  drop: { 
    enter: function() {
      for (var i in this.playerAnswers) {
        p = this.players[i];
        if (!p) continue;
        var a = this.playerAnswers[i];
        var cc = a.white.sort(function(a,b){return b-a});
        a.white.forEach(function(c) {
          p.white.splice(c,1);
        });
        if (this.settings.goodies) this.dropYellow(p,a.yellow);
      }
    },
    next:'check'
  },
  check: {
    next: function() {
      return (
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
      ) ? 'winner' : 'interval';
    }
  },
  interval: {
    time: function() {
      return this.settings.interval;
    },
    next: 'turn',
  },
  winner: {
    enter: function() {
      var leaders = this.leaders;
      var winner = leaders[0];
      var second = leaders[1];
      var last = leaders.slice(-1).join();
      var secondlast = leaders.slice(-2,1).join();
      var report = winner == this.lastWinner ? 'The winner and still the champion, '+ winner +'. '  : winner + ' wins the game. ';
      var congrat = this.getCard('winner').replace(/{{{(.*?)}}}/g,function(m,m1) {
        return ({
          first:winner,
          second:second,
          last:last,
          secondlast:last
        })[m1] || m1;
      });
      this.sayGame(''+ report + congrat,'WINNER');
      this.announce(''+ report + congrat);
      this.lastWinner = winner;
    },
    next: 'end',
  },
  end: {
    enter: function() {
      this.sayGame('The game has ended. Final standings: ' + this.printScore(),'END');
      this.announce('The game has ended. Final standings: ' + this.printScore());
    },
    next: 'wait',
  },
  stopped: {
  }
}
