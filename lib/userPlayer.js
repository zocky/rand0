
global.User = function(nick) {
  this.nick = nick;
  this.score = 0;
}

User.users = {};

global.user = function(nick) {
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
  },
  valueOf: function() {
    return this.nick;
  },
  rename: function(nick){
    var u = user(nick);
    if (u.present) return false;
    if (u.player) this.player = u.player;
    User.users[nick] = this;
    delete User.users[this.nick];
    this.nick = nick;
  }
}


global.Player = function( game , u ) {
//  console.log('making player ' + u + ' for game ' + game);
  this.game = game;
  this.user = user(u);
  this.nick = this.user.nick;
  this.user.player = this;
  game.players[ this.nick ] = this;
  this.white = [];
  this.yellow = {
    time:   3,
    plus:   5,
  };
  //game.dealYellow(this);
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
  valueOf: function() {
    return this.nick;
  },
  tell: function(msg) {
    this.user.tell(msg);
  }
}

global.player = function(nick) {
  return user(nick).player;
}

