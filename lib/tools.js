var http = require('http');
var url = require('url');

global.getUrl = function(u, onResult) {
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
global.capitalize = function(n) {
 n = String(n);
 return n[0].toUpperCase() + n.substr(1);
}
global.MSORT = function (what, how, opt) {
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
global.formatList = function (list,prefix,wrap,colors) {
 var colors = colors || {};
 colors.back = 'back' in colors ? colors.back : 0;
 colors.text = 'text' in colors ? colors.text : 1;
 colors.prefix = 'prefix' in colors ? colors.prefix : 5;
 
 for (var i in colors) colors[i] = ('0'+colors[i]).slice(-2);
 
 var l = 0;
 var bits = list.map(function(n,i) {
  if (prefix===undefined || prefix === null) var p ='!' + (i+1);
  else if (typeof prefix == 'function') var p = prefix(n,i+1);
  else var p = prefix + (i+1);

  if (wrap===undefined || wrap == null) var v = n+'';
  else if (typeof wrap == 'function') var v = wrap(n,i+1);
  else v = wrap ;

  var nl = '';
/*  if (l>200) {
   var nl = '\n\n       | ';
   l = 0;
  }
  
  l+=p.length+v.length+4;
*/  
  return nl + '' + colors.prefix + ',' + colors.back + ' ' + (p?p+' ':'') + '' + colors.text + v+' ';
 });
 return bits.join('\n');
}

global.lookupList = function (list,key) {
 if (Number(key)>0) return list[key-1];
 for (var i=0; i<list.length; i++) {
  if(list[i].toLowerCase() == key.toLowerCase()) return list[i];
 }
 return undefined;
}
global.formatDecks = function (prefix) {
 var decks = MSORT(Cards.decks,'keys');
 
 return decks.map(function(n,i) {
  var d = Cards.decks[n];
  if (prefix===undefined ) var p ='!' + (i+1);
  else if (typeof prefix == 'function') var p = prefix(n,i+1)+(i+1);
  else var p = prefix + (i+1);

  var v = n + ' ' + (d.black ? d.black.length : d.white.length);
  
  return d.black ? '5,1 '+ p +'0,1 ' +v+' ' : '4,0 '+ p +'1,0 ' +v+' ';
 }).join(' ')
}
Object.defineProperty(Array.prototype, "shuffle", {
    value: function() {
      array = this.concat();
      var tmp, current, top = array.length;

      if(top) while(--top) {
       current = Math.floor(Math.random() * (top + 1));
       tmp = array[current];
       array[current] = array[top];
       array[top] = tmp;
      }
      return array;
    },
    writable: false,
    enumerable: false,
    configurable: false
});

Object.shuffle = function(obj) {
 var keys = Object.keys(obj).shuffle();
 var ret = {};
 keys.forEach(function(i){
  ret[i] = obj[i];
 });
 return ret;
}

Object.defineProperty(Object.prototype, "merge", {
  enumerable: false,
  value: function () {
    var override = true,
      dest = this,
      len = arguments.length,
      props, merge, i, from;

    if (typeof(arguments[arguments.length - 1]) === "boolean") {
      override = arguments[arguments.length - 1];
      len = arguments.length - 1;
    }

    for (i = 0; i < len; i++) {
      from = arguments[i];
      if (from != null) {
        Object.getOwnPropertyNames(from).forEach(function (name) {
          var descriptor;
          //deletion
          if (typeof(from[name])==='undefined') {
            delete dest[name]
          }
          // nesting
          else if ((typeof(dest[name]) === "object" || typeof(dest[name]) === "undefined")
              && typeof(from[name]) === "object") {

            // ensure proper types (Array rsp Object)
            if (typeof(dest[name]) === "undefined") {
              dest[name] = Array.isArray(from[name]) ? [] : {};
            }
            if (override) {
              if (!Array.isArray(dest[name]) && Array.isArray(from[name])) {
                dest[name] = [];
              }
              else if (Array.isArray(dest[name]) && !Array.isArray(from[name])) {
                dest[name] = {};
              }
            }
            dest[name].merge(from[name], override);
          } 

          // flat properties
          else if ((name in dest && override) || !(name in dest)) {
            descriptor = Object.getOwnPropertyDescriptor(from, name);
            if (descriptor.configurable) {
              Object.defineProperty(dest, name, descriptor);
            }
          }
        });
      }
    }
    return this;
  }
})
