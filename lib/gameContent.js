exports.create = function(wiki,root) {
  return new Content(wiki,root);  
}

function Content (wiki,root){
  this.wiki = this.wiki || wiki;
  this.root = this.root || root;
  this.decks = {};
  this.load();
};

Content.prototype = {
  wiki: 'http://wiki-data.wiki.ljudmila.net/',
  root: 'Zcardbot',
  types: 'black|white|messages|presets',
  loading:0,
  process: function(text) {
    text = String(text);
    return text
    .replace(/<noinclude>.*?<\/noinclude>/g,'')
    .trim();
  },
  parse: function(text) {
    text = String(text);
    var lines = text
    .replace(/<.*?>/g,'')
    .replace(/ +/g,' ')
    .replace(/^\s+|\s+$/g,'')
    .split(/\s*\n\s*/)
    .filter(function(n) {
      return !n.match(/^[=:]/);
    })
    return lines;
  },
  replace: function(text, args) {
    text = String(text);
    for (var i in args) {
      text = text.replace(new RegExp('{{{'+i+'}}}','g'),args[i]);
    }
    return text;
  },
  card: function(type,deck,number,text,expl) {
    var me = this;
    return {
      type: type,
      deck: deck,
      number: number,
      expl: expl,
      desc: (expl||'no explanation provided') + ' ('+deck+' '+type+'#'+number+')',
      toString: function() { return String(text); },
      valueOf: function() { return String(text); },
      replace: function() { return text.replace.apply(text,arguments); },
      text:text,
      constructor: String,
      __proto__: String.prototype,
    }
  },
  load: function(cb,cbFail) {
    var me = this;
    me.loading = 1;
    var u = me.wiki+'w/api.php?action=query&generator=allpages&gapprefix='+me.root+'/&prop=revisions&rvprop=content&gaplimit=50&format=json';
    console.log('wiki',u);
    getUrl(
      u,
      function(code,content) {
        try {
          var obj = JSON.parse(content);
        } catch (e) {
          cbFail && cbFail();
        }
        
        me.decks = {};
        me.types
        .split("|")
        .forEach( function(n) {
          me.decks[n]={};
        })
        
        var re = new RegExp('^' + me.root.replace(/(\W)/g,'\\$1') +  '[/](' + me.types + ')[/]([^ /]+)$','i');
        
        for (var i in obj.query.pages) {
          var p = obj.query.pages[i];

          if(!p.title.match(re)) continue;
          var type = RegExp.$1.toLowerCase();
          var name = RegExp.$2.toLowerCase();
          var title = RegExp.$2;
          var text = me.process(p.revisions[0]['*']);
          if (!me.decks[type]) continue;
          switch (type) {
          case 'presets':
            try {
              me.decks.presets[name] = JSON.parse(text);
            } catch(e) {
            }
          case 'messages':
          case 'black':
          case 'white':
            me.decks[type][name] = 
            me
            .parse(text)
            .map(function(n, i){
              var parts = n.split(/\|/);
              if (parts.length>1) {
                var expl = parts.pop().trim();
                var val = parts.join('|').trim();
              } else {
                var val = parts.join();
                var expl = 'no explanation provided';
              }
              return me.card(type,name,i,val,expl);
            });
            break;
          }
          console.log('deck',type,name,me.decks[type][name].length);
        }
        me.decks.yellow = {};
        var cnt = 0;
        for (var i in Content.goodies) {
          var g = Content.goodies[i];
          for (var j=0; j<g.frequency; j++) {
            cnt++;
            var cat = g.category || 'goodies';
            me.decks.yellow[cat]= me.decks.yellow[cat] || [];
            var c = me.card('yellow',cat,me.decks.yellow[cat].length+1,i,g.desc + '\n' + g.usage);
            me.decks.yellow[cat].push(c);
          }
        }
        console.log('deck','yellow',cnt);
        me.loading = 0;
        cb && cb();
      }
    );
  },
  count: function(which,subs) {
    if (subs instanceof Array) subs = subs.concat();
    else subs = subs.trim().split(/\s+/);
    var ret=0;
    var s;
    while (subs.length) ret +=this.decks[which][subs.shift()].length;
    return ret;
  },
  get: function(which,subs) {
    if (subs instanceof Array) subs = subs.concat();
    else subs = subs.trim().split(/\s+/);
    var ret=[];
    var s;
    //console.log(which,subs);
    while (subs.length) ret = ret.concat(this.decks[which][subs.shift()]);
    //console.log(ret);
    return ret;
  },
  goodie: function(which){
    return Content.goodies[which];
  }
};
Content.goodies = {
// lesser goodies
  time: {
    frequency: 4,
    quantity: 1,
    label: '10 sec',
    desc: 'Gives you 10 more seconds to answer when you run out of time.',
    usage: 'It deploys automatically.',
  },
  plus: {
    frequency: 4,
    quantity: 3,
    label: '<b>+</b> combo',
    desc: 'Allows you to combine cards in answers.',
    usage: 'In your answer: !1+2    !1+2+3    !1+2 3+4',
  },
  morecards: {
    frequency: 4,
    label: '<b>.m</b> more cards',
    desc: 'Gives you three more white cards.',
    usage: 'During the answering phase: !m',
  },
  slash: {
    frequency: 4,
    label: '<b>/</b> multi-answer',
    desc: 'Allows you to give more than one answer.',
    usage: 'In your answer: !1/2    !1/2/3    !1 2/3 4',
  },
// common goodies
  newhand: {
    frequency: 4,
    label: '<b>.h</b> new hand',
    desc: 'Drop all your white cards and receive a new hand.',
    usage: 'During the answering phase: !h',
  },
  prep: {
    frequency: 4,
    label: 'word',
    desc: 'Use a function word in your answer.',
    usage: 'In your answer:  !1+on   !and   !1+or+2',
  },
  newtime: {
    frequency: 4,
    label: '<b>.t</b> timeout',
    desc: 'A new 10 seconds of time will start for everybody, making the total answering time shorter, or longer.',
    usage: 'During the answering phase: !t',
  },
  double: {
    frequency: 4,
    label: '<b>.d</b> double-or-nothing',
    desc: 'Double your points! So, you get 2 points if you win, and 0 if you don\'t',
    usage: 'During the answering phase: !d',
  },
  noczar: {
    frequency: 4,
    label: '<b>.p</b> people power',
    desc: 'Allows you to get out of czaring by forcing a voting round.',
    usage: 'During the answering phase: !p',
  },
  zero: {
    frequency: 0*2,
    label: '<b>.0</b> none of the above',
    desc: 'Allows you to vote for "none of the above". Rando will award himself a point if you do that.',
    usage: 'When czaring: !0',
  },
// greater goodies  
  quote: {
    frequency: 0*1,
    label: '<b>"</b>write-in<b>"</b>',
    desc: 'Allows you to be creative and provide your own answer.',
    usage: 'In your answer: !"Foo bar"    !"Baz Luhrmann" 2    !1 "whatever"',
  },
  forcerando: {
    frequency: 0*1,
    label: '<b>.r</b> force hand',
    desc: 'Forces a competitor of your choice to give a random answer. Or not, if you\'re too late.',
    usage: 'During the answering phase: !f [player]',
  },
  swap: {
    frequency: 0*1,
    label: '<b>.x</b> exchange',
    desc: 'Swap some of your white cards with those of another player.',
    usage: 'Any time: !x [player]',
  },
  scramble: {
    frequency: 0*1,
    label: '<b>.s</b> scramble',
    desc: "Mixes up some of everybody's white cards.",
    usage: 'Any time: !s',
  }
}

