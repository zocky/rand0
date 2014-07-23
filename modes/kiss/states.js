module.exports = {
  intro: {
    enter: function() {
      this.sayStatus('Beat the bot and bring love to the world.');
    },
  },
  answer_done: {
    enter: function() {
      this.doRando();
      if (Math.random()<this.settings.friends/10) this.doRando('Ringo Carrd');
      if (Math.random()<this.settings.friends/10) this.doRando('Dirk Dicetosser');
      if (Math.random()<this.settings.friends/10) this.doRando('Anny Way');
    }
  },
  score: {
    enter: function() {
      var winner = this.czarChoices[this.czarAnswer];
      var loser;
      var left = this.nicks[0];
      var right = this.nicks[1];
      
      var report = this.czar +' chose 1,0 ' + this.answerText[winner]+'  by ' + winner+'. ';
      if (winner.match(/ /)) {
        report += 'The human answer was 1,0 ' + (this.czar == left ? this.answerText[right] : this.answerText[left]) +' . ';
        report += '' + this.czar + ' shrinks one point.';
        var res = 'SHRINKAGE';
        this.scores[this.czar]--;
        loser = this.czar;
      } else {
        report += '' + winner + ' grows one point.';
        this.scores[winner]++;
        var res = 'GROWTH';
      }
      var left = this.nicks[0];
      var leftLength = this.settings.lives + this.scores[left];
      if (leftLength<0) var leftPenis = '✝';
      else var leftPenis = '█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌█▌'.slice(0,leftLength*2)+'◗';
      var leftColor = winner == left ? '03' : ( left == loser ? '05' : '01');
      
      var right = this.nicks[1];
      var rightLength = this.settings.lives + this.scores[right];
      if (rightLength<0) var rightPenis = '✝';
      else var rightPenis = '◖'+'▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█▐█'.slice(0,rightLength*2);
      var rightColor = winner == right ? '03' : ( right == loser ? '05' : '01');

      var spaceLength = this.settings.pointsToWin - this.scores[left]-this.scores[right];
      var space = '                                                                             ';
      space += space + space;
      space = space.slice(0,spaceLength*2);
      
      var score = ''+left+'  ' + leftColor + leftPenis + '' + space + rightColor + rightPenis + '  ' + right + '';
      this.sayGame(report,res);
      this.sayGame(score,'STANDING');
      this.sayDivider('bottom');
      
    }
  },
  check: {
    next: function() {
      var left = this.scores[this.nicks[0]];
      var right = this.scores[this.nicks[1]];
      if (left < -this.settings.lives || right < -this.settings.lives) return 'loser';
      if (this.settings.pointsToWin - left - right > this.settings.maxTurns - this.countTurns) return 'fail';
      if (left+right >=this.settings.pointsToWin) return 'winner';
      return 'interval';
    }
  },
  winner: {
    enter: function() {
      var leaders = this.leaders;
      var first = leaders[0];
      var second = leaders[1];
      var last = 'Rando Cardrissian';
      var secondlast = 'Ringo Carrd';
      var report = '' + first + ' and ' + second + ' MADE THE PENISES KISS'+ (this.lastRes =='win' ? ' AGAIN':'')+'! ';

      var congrat = this.getCard('winner').replace({
        first:first,
        second:second,
        last:last,
        secondlast:last
      });
      this.sayGame(report + congrat,'KISS');
      this.lastRes = 'win';
    }
  },
  loser: {
    enter: function() {
      var leaders = this.leaders;
      var first = leaders[0];
      var second = leaders[1];
      var last = 'Rando Cardrissian';
      var secondlast = 'Dirk Dicetosser';
      var report = '' + last + ' shrunk to nothing. No kiss '+ (this.lastRes == 'fail' ? 'again':'')+'. ';

      var congrat = this.getCard('winner').replace({
        first:last,
        second:secondlast,
        last:first,
        secondlast:second,
      });
      
      this.sayGame(report + congrat,'FAIL');
      this.lastRes = 'fail';
    },
    next: 'end'
  },
  fail: {
    enter: function() {
      var leaders = this.leaders;
      var first = leaders[0];
      var second = leaders[1];
      var last = 'Rando Cardrissian';
      var secondlast = 'Dirk Dicetosser';
      var report = 'Too few turns left humans to win. No kiss '+ (this.lastRes == 'fail' ? 'again':'')+'. ';

      var congrat = this.getCard('winner').replace({
        first:last,
        second:secondlast,
        last:first,
        secondlast:second,
      });
      
      this.sayGame(report + congrat,'FAIL');
      this.lastRes = 'fail';
    },
    next: 'end'
  },
  end: {
    next: 'wait',
    enter: function() {
      this.sayGame('The game has ended. Final standings: ' + this.printScore(),'END');
    }
  },
  stopped: {
  }
}
