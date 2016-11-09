/*
 * Some universally used utility functions
 */

//This is just creation of general YOVALUE object - namespace for all other modules
var YOVALUE = YOVALUE || {};

/**
 * this is replace for native javascript typeof
 * based on http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/
 * It detects every type except 'undefined', for which it just throws ReferenceError
 * @param obj
 * @returns {string}
 */
YOVALUE.typeof = function(obj) {
  return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
};

/**
 * Check if o is a DOM Node
 * @param o
 * @returns {boolean}
 */
YOVALUE.isDOMNode = function(o) {
  return (
      typeof Node === "object" ? o instanceof Node :
          o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName==="string"
      );
};

/**
 * Check if o is a DOM Element
 * @param o
 * @returns {boolean}
 */
YOVALUE.isDOMElement = function(o) {
  return (
      typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
          o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
      );
};

/**
 * Function to check if objToCheck implements interface(s) iFaces
 * Interface is just an object, i.e.:
 *	var iRenderable = {
 * 		render: function(){};
 *	};
 *
 * or a structure
 * var iStruct = {
 *    a1: {b: String(), c:Boolean(), d:{e: Number()}}
 *    a2: Array()
 * }
 * @param objToCheck
 * @param iFaces
 * @return {Boolean} - true if objToCheck implements interface(s) and false otherwise
 */
YOVALUE.implements = function(objToCheck, iFaces){
  for(var i = 1, l = arguments.length; i < l; i++){
    var iFace = arguments[i];
    for(var m in iFace){
      if(m && YOVALUE.typeof(iFace[m]) != YOVALUE.typeof(objToCheck[m])){
        return false;
      }
      if(YOVALUE.typeof(iFace[m])  === 'object' && YOVALUE.getObjectLength(iFace[m])){
        if(YOVALUE.implements(objToCheck[m], iFace[m]) === false) return false;
      }
      if(YOVALUE.typeof(iFace[m]) === "function" && iFace[m].length !== objToCheck[m].length){
        //console.log(m);
        return false;
      }
    }
  }
  return true;
};


/**
 * This functions extends object 'extendme' with functions of object 'base'
 * If the function A already exists in  'extendme', then it does not touch it
 * @param base - object that donate its functions
 * @param extendme - object that is extended
 */
YOVALUE.mixin = function(base, extendme){
  var prop;
  for(prop in base){
    if(typeof base[prop] === 'function'
      && !extendme[prop]){
      extendme[prop] = base[prop].bind(base);
    }
  }
};

/**
 * An object that is created by calling YOVALUE.construct(Class, [1, 2, 3])
 * would be identical to an object created with new Class(1, 2, 3).
 *
 * @param constructor - constructor to be instantiated
 * @param args - array of arguments for the given constructor
 * @return instance of the constructor
 */
YOVALUE.construct = function(constructor, args) {
  var instance = Object.create(constructor.prototype);
  var result = constructor.apply(instance, args);
  return result !== undefined ? result : instance;
};

/**
 Instantiating modules according to array of module constructors:
 var Modules = {
  'Mediator': YOVALUE.Mediator,
  'Publisher': YOVALUE.Publisher,
   ...
 }
 and array of module constructors arguments (dependency injection array):
 var DI = {
  'Mediator':[{'event1':['Module1', 'Module2']}, {'event2':['Module1', 'Module3']}],
  'Publisher':[Modules['Mediator']],
   ...
 }
 *
 * @param Modules
 * @param DI
 */
YOVALUE.wireModules = function(Modules, DI) {
  for(var m in DI){
    //If Modules[m] is not a constructor, skip it
    if(typeof(Modules[m]) !== 'function') continue;

    var deps = [], i, dm;
    for(i in DI[m]){
      dm = DI[m][i];
      //If Modules[m] dependency dm is another Modules key
      //then substitute it with the Modules[key]
      if(typeof(dm) === 'string' && typeof(Modules[dm]) !== 'undefined'){
        deps.push(Modules[dm]);
      //Otherwise just insert argument as is
      }else{
        deps.push(dm);
      }
    }

    Modules[m] = YOVALUE.construct(Modules[m], deps);
    Modules[m].moduleName = m;
  }
};

/**
 * A multiindex table data structure. Just like well-known SQL table.
 * @param columns
 * @constructor
 */
YOVALUE.Table = function(columnNames){
  this.columnNames = columnNames;
  this.rows = [];
};
YOVALUE.Table.prototype = {
  /**
   * add row to table
   * @param data - row in a form {columnName1: columnValue1, columnName2: columnValue2, ...}
   */
  insertRow: function(data){
    // create row from data, silently ignore columnName1 that is absent in columnNames
    var row = {};
    this.columnNames.forEach(function(name){
      row[name] = data[name];
    });
    this.rows.push(row);
    return this.rows.length-1;
  },

  /**
   * Update rows with updateColumnValues where given columns have criteriaColumnValues
   * @param {Object=} criteriaColumnValues - search criteria in form {columnName1: columnValue1, columnName2: columnValue2, ...}
   * @param {Object=} updateColumnValues - in form {columnName1: columnValue1, columnName2: columnValue2, ...}
   * @returns {number} number of updated rows
   */
  updateRows: function(criteriaColumnValues, updateColumnValues){
    var rows = this.getRows(criteriaColumnValues);
    var cnt = 0;
    for(var i in rows){
      cnt++;
      for(var j in updateColumnValues){
        rows[i][j] = updateColumnValues[j];
      }
    }
    return cnt;
  },

  removeRowByIds: function(ids){
    for(var i in ids) delete this.rows[ids[i]];
  },

  removeRows: function(columnValues){
    this.removeRowByIds(this.getRowIds(columnValues));
  },

  getRowByIds: function(ids){
    var rows = [];
    for(var i in ids){
      rows.push(this.rows[ids[i]]);
    }
    return rows;
  },

  getRowById: function(id){
    return  this.getRowByIds([id])[0];
  },

  /**
   * get all rows ids where given columns have given values
   * @param columnValues - {columnName1: columnValue1, columnName2: columnValue2, ...}
   */
  getRowIds: function(columnValues){
    var isRowFitsCriteria = true;
    var resultIds = [];
    for(var i in this.rows){
      isRowFitsCriteria = true;
      for(var columnName in columnValues){
        if(this.rows[i][columnName] != columnValues[columnName]){
          isRowFitsCriteria = false;
          break;
        }
      }
      if(isRowFitsCriteria) resultIds.push(i);
    }
    return resultIds;
  },


  /**
   * Get all rows where given columns have given values
   * @param {Object=} opt_columnValues - {columnName1: columnValue1, columnName2: columnValue2, ...}
   */
  getRows: function(opt_columnValues){
    return this.getRowByIds(this.getRowIds(opt_columnValues));
  },

  /**
   * Return number of rows where
   * @param {Object=} opt_columnValues
   * @return {*}
   */
  getRowsCount: function(opt_columnValues){
    return this.getRowIds(opt_columnValues).length;
  }
};
/**
 * Table of given size that tracks every row hit count and
 * removes the least popular rows if size limit is exceeded
 * @param columnNames
 * @param sizeLimit in bytes
 * @constructor
 */
YOVALUE.Cache = function(columnNames, sizeLimit){
  columnNames.push('hitCount');
  columnNames.push('lastHitTimestamp');
  this.table = new YOVALUE.Table(columnNames);
  this.sizeLimit = sizeLimit;
};
YOVALUE.Cache.prototype = {
  getSize: function(){
    return this.sizeLimit;
  },
  add: function(item){
    item['hitCount'] = 0;
    item['lastHitTimestamp'] = (new Date()).getTime();
    this.table.insertRow(item)
  },
  get: function(opt_columnValues){
    var i, rows = this.table.getRows(opt_columnValues);

    // refresh cache invalidation params
    for(i in rows){
      rows[i]['hitCount']++;
      rows[i]['lastHitTimestamp'] = (new Date()).getTime();
    }

    return rows;
  },
  update: function(criteriaColumnValues, updateColumnValues){
    return this.table.updateRows(criteriaColumnValues, updateColumnValues);
  },
  remove: function(columnValues){
    this.table.removeRows(columnValues);
  }
};

/**
 *
 * Object to log and throw errors from elsewhere
 */
YOVALUE.errorHandler = {
  setQuietMode: function(v) {
    this._is_quiet = v;
  },

  notifyError: function(message){
    if(!this._is_quiet){
      console.log(message);
      console.log(printStackTrace());
    }
  },

  throwError: function(message){
    if(!this._is_quiet){
      console.log(message);
      console.log(printStackTrace());
    }
    throw new Error(message);
  }
};

/**
 * Module used in DEBUG mode to print and log event flow
 */
YOVALUE.debug = (function(Table){
  var logger = {};
  logger.printCounter = 0;
  logger.logCounter = 0;
  var eventTable = new Table(['id','time','moduleName','codeLine','direction','eventName','eventData','eventId']);

  /**
   *
   * @param currentEvent
   * @param moduleName
   * @param codeLine
   * @param direction - 'fire','receive','response'
   * @param eventName
   * @param eventData
   * @param eventId
   */
  logger.printEvent = function(currentEvent,moduleName,codeLine,direction,eventName,eventData,eventId){
    if(typeof(currentEvent) == 'undefined') currentEvent = '';
    logger.printCounter++;
    var data = YOVALUE.clone(eventData);
    var hhmmss = (new Date()).toLocaleTimeString();
    var moduleCSS = 'color:hsl(0, 0%, 80%);background-color:hsl(0, 0%, 0%);';
    var eventCSS = 'color:hsl(60, 2%, 22%);background-color:hsl(56, 100%, 91%);';
    var currentEventCSS = 'color:hsl(60, 2%, 22%);background-color:hsl(60, 7%, 51%);';
    if(direction == 'fire'){
      console.log(logger.printCounter+' '+hhmmss+' %c'+currentEvent+' %c'+moduleName+":"+codeLine+' ---- %c'+eventName,currentEventCSS,moduleCSS,eventCSS, data, eventId);
    }
    if(direction == 'receive'){
      console.log(logger.printCounter+' '+hhmmss+' ----> '+' %c'+currentEvent+'%c'+moduleName+' %c'+eventName,currentEventCSS,moduleCSS,eventCSS, data, eventId);
    }
    if(direction == 'response'){
      console.log(logger.printCounter+' '+hhmmss+' <----'+' %c'+eventName+"(Response) ---- "+'%c'+moduleName+":"+codeLine,eventCSS,moduleCSS, data, eventId);
    }
  };
  logger.log = function(moduleName,codeLine,direction,eventName,eventData,eventId){
    logger.logCounter++;
    var data = YOVALUE.clone(eventData);
    var time = (new Date()).getTime();
    var row = {'id':logger.logCounter,'time':time,'moduleName':moduleName,'codeLine':codeLine,'direction':direction,'eventName':eventName,'eventData':data,'eventId':eventId};
    eventTable.insertRow(row);
  };
  logger.sendLogToServer = function(){

  };
  logger.takeScreenShot = function(){

  };
  return logger;
})(YOVALUE.Table);

/**
 * This will create clone from Object o (thanks to Rick Waldron)
 * @param o
 * @param forceDescriptor - force every cloned property to have new descriptor - forceDescriptor (so it is possible to unfreeze objects)
 * @return {*} - clone of o
 */
YOVALUE.clone = function clone( obj, forceDescriptor ) {
  if(YOVALUE.isDOMNode(obj)) return obj.cloneNode(true);
  if(YOVALUE.typeof(obj) != 'object' && YOVALUE.typeof(obj) != 'array') return obj;

  var val, length, i,
    temp = [];
  if ( Array.isArray(obj) ) {
    for ( i = 0, length = obj.length; i < length; i++ ) {
      // Store reference to this array item’s value
      val = obj[ i ];
      // If array item is an object (including arrays), derive new value by cloning
      if ( typeof val === "object" ) {
        val = clone( val, forceDescriptor );
      }
      temp[ i ] = val;
    }
    return temp;
  }
  // Create a new object whose prototype is a new, empty object,
  // Using the second properties object argument to copy the source properties
  return Object.create({}, (function( src ) {
    // Initialize a cache for non-inherited properties
    var props = {};
    Object.getOwnPropertyNames( src ).forEach(function( name ) {
      // Store short reference to property descriptor
      var descriptor = Object.getOwnPropertyDescriptor( src, name );
      // Recursive on properties whose value is an object or array
      if ( typeof src[ name ] === "object" ) {
        descriptor.value = clone( src[ name ], forceDescriptor );
      }
      //if we have properties descriptor to overwrite, use it \
      if(typeof(forceDescriptor) != 'undefined'){
        for(var i in forceDescriptor) descriptor[i] = forceDescriptor[i];
      }
      props[ name ] = descriptor;
    });
    return props;
  }( obj )));
};

/**
 * Recursively copy own properties of parent to child
 * @param parent - object from which properties are copied
 * @param child - object which should be extended
 */
YOVALUE.extend = (function () {
  function extendDeep(parent, child) {
    var i,
        toStr = Object.prototype.toString,
        astr = "[object Array]";
    child = child || {};
    for (i in parent) {
        if (parent.hasOwnProperty(i)) {
            if (typeof parent[i] === "object") {
                if(typeof child[i] == 'undefined'){
                  child[i] = (toStr.call(parent[i]) === astr) ? [] : {};
                  extendDeep(parent[i], child[i]);
                }else if(YOVALUE.typeof(child[i]) === YOVALUE.typeof(parent[i])){
                  extendDeep(parent[i], child[i]);
                }else{
                  // do nothing - child has precedence and can redefine parents property
                }
            } else {
                if(!child.hasOwnProperty(i)) child[i] = parent[i];
            }
        }
    }
    return child;
  }
  return extendDeep;
}());

/**
 * inspired by Zachary Murray (dremelofdeath) CC-BY-SA 3.0
 * It will recursively merge arbitrarily deep objects.
 * @example
 * po = {"a": "poui", "c": {"q": 444, "w": function () {return 1123;}}, "o": {"b": {"t": "cats"}, "q": 7}, "p": 764}
 * as = {"a": "asdf", "b": 4, "c": {"q": 1, "w": function () {return 5;}}}
 * deepmerge(as, po) = {"a": ["asdf", "poui"], "b": 4, "c": {"q": [1, 444], "w": [function () {return 5;}, function () {return 1123;}]}, "o": {"b": {"t": "cats"}, "q": 7}, "p": 764}
 * @param foo
 * @param bar
 * @returns {{}}
 */
YOVALUE.deepmerge = function (foo, bar) {
  var merged = {};
  for (var each in bar) {
    if (foo.hasOwnProperty(each) && bar.hasOwnProperty(each)) {
      if (Object.prototype.toString.call(foo[each]) == "[object Object]" && Object.prototype.toString.call(bar[each]) == "[object Object]") {
        merged[each] = YOVALUE.deepmerge(foo[each], bar[each]);
      } else if (Object.prototype.toString.call(foo[each]) == "[object Array]" && Object.prototype.toString.call(bar[each]) == "[object Array]") {
        merged[each] = foo[each].concat(bar[each]);
      }
      else{
        merged[each] = [foo[each], bar[each]];
      }
    } else if(bar.hasOwnProperty(each)) {
      merged[each] = bar[each];
    }
  }
  for (var each in foo) {
    if (!(each in bar) && foo.hasOwnProperty(each)) {
      merged[each] = foo[each];
    }
  }
  return merged;
};

/**
 *
 * @param keys - array of keys
 * @param hash - associative array
 */
YOVALUE.extractKeyValues = function(keys, hash){
  var e = {};
  for(var i in keys){
    e[keys[i]] = hash[keys[i]];
  }
  return e;
};

/**
 * Get number of object own properties
 * @param obj
 * @return {Number}
 */
YOVALUE.getObjectLength = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

/**
 * Reverse string
 * @param s
 * @return {String}
 */
YOVALUE.reverseString = function(s){
  return s.split("").reverse().join("");
};

/**
 * Get object own properties names
 * @param obj
 * @return {Array} - array of own property keys
 */
YOVALUE.getObjectKeys = function(obj) {
  var keys = [], key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) keys.push(key);
  }
  return keys;
};

/**
 * Get object values
 * @param obj
 * @return {Array} - array of object values
 */
YOVALUE.getObjectValues = function(obj) {
  var values = [], key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) values.push(obj[key]);
  }
  return values;
};

/**
 * Object that contains RGB <-> Hex converters
 */
YOVALUE.ColorHelper = {};
/**
 * Converts color code in #[0-255] or #hex to RGB
 * @param s - Number from 0 to 255
 * @param {=false} asArray  - true if you want to get array [r, g, b], false or undefined if object  {'r':r , 'g':g , 'b':b}
 * @return {Object} - RGB coded color in array or object
 */
YOVALUE.ColorHelper.getRGB = function(s, asArray) {
  s = s.toString();
  var res = {
    'r': 0,
    'g': 0,
    'b': 0
  };

  if (s.length >= 3) {
    if (s.charAt(0) == '#') {
      var l = s.length - 1;
      if (l == 6) {
        res = {
          'r': parseInt(s.charAt(1) + s.charAt(2), 16),
          'g': parseInt(s.charAt(3) + s.charAt(4), 16),
          'b': parseInt(s.charAt(5) + s.charAt(5), 16)
        };
      }else if (l == 3) {
        res = {
          'r': parseInt(s.charAt(1) + s.charAt(1), 16),
          'g': parseInt(s.charAt(2) + s.charAt(2), 16),
          'b': parseInt(s.charAt(3) + s.charAt(3), 16)
        };
      }
    }
  }

  if (asArray) {
    res = [
      res['r'],
      res['g'],
      res['b']
    ];
  }

  return res;
};

YOVALUE.arrayToObject = function (arr) {
  if(Object.prototype.toString.call(arr) != '[object Array]') return arr;
  var rv = {};
  for (var i = 0; i < arr.length; ++i)
    rv[i] = arr[i];
  return rv;
};

YOVALUE.objectToArray = function(obj){
  var array = [];
  // iterate backwards ensuring that length is an UInt32
  for (var i = obj.length >>> 0; i--;) {
    array[i] = obj[i];
  }
  return array;
};

/**
 * Convert color in RGB to Hex
 * @param R
 * @param G
 * @param B
 * @return {String}
 */
YOVALUE.ColorHelper.rgbToHex = function(R, G, B) {
  return YOVALUE.NumberHelper.toHex(R) + YOVALUE.NumberHelper.toHex(G) + YOVALUE.NumberHelper.toHex(B);
};

YOVALUE.NumberHelper = {};
/**
 * Convert decimal to hex
 * @param n
 * @return {String}
 */
YOVALUE.NumberHelper.toHex = function(n) {
  n = parseInt(n, 10);

  if (isNaN(n)) {
    return '00';
  }
  n = Math.max(0, Math.min(n, 255));
  return '0123456789ABCDEF'.charAt((n - n % 16) / 16) +
    '0123456789ABCDEF'.charAt(n % 16);
};

YOVALUE.MappingHelper = {};
YOVALUE.MappingHelper.adjustMappingToArea = function(mapping, area){
  if(typeof(area) == 'undefined') return mapping;

  if(!YOVALUE.implements(mapping, YOVALUE.iMapping)){
    YOVALUE.errorHandler.throwError('mapping does not implement YOVALUE.iMapping');
  }

  if(
      mapping.area.centerX == area.centerX &&
          mapping.area.centerY == area.centerY &&
          mapping.area.height == area.height &&
          mapping.area.width == area.width
      ){
    return YOVALUE.clone(mapping);
  }

  var n, i,
    adjustedMappingCoordinates = YOVALUE.clone(mapping.mapping),
    mappingArea = mapping.area,
    xStretchRatio = area.width/mappingArea.width,
    yStretchRatio = area.height/mappingArea.height;

  for(i in adjustedMappingCoordinates){
    n = adjustedMappingCoordinates[i];
    adjustedMappingCoordinates[i].x = Math.round((n.x - mappingArea.centerX)*xStretchRatio) + area.centerX ;
    adjustedMappingCoordinates[i].y = Math.round((n.y - mappingArea.centerY)*yStretchRatio) + area.centerY;

    if(typeof(n.angle) !== 'undefined') adjustedMappingCoordinates[i].angle = n.angle;
  }

  var adjustedMapping = {
    area: YOVALUE.clone(area),
    mapping: adjustedMappingCoordinates
  };

  return adjustedMapping;
};

YOVALUE.decorationHelper = {};
YOVALUE.decorationHelper.adjustDecorationToArea = function(decoration, area){
  if(typeof(area) == 'undefined') return decoration;
  if(!YOVALUE.implements(decoration, YOVALUE.iDecoration)){
    YOVALUE.errorHandler.throwError('decoration does not implement YOVALUE.iDecoration');
  }

  var n, i,
    adjustedNodes = {},
    adjustedEdges = {},
    adjustedNodeLabels = {},
    xStretchRatio = area.width/decoration.scale,
    yStretchRatio = area.height/decoration.scale,
    adjustedScale = Math.min(xStretchRatio, yStretchRatio);

  for(i in decoration.nodes){
    n = decoration.nodes[i];
    adjustedNodes[i] = YOVALUE.clone(n);
    adjustedNodes[i].size = Math.max(1, Math.round(n.size*adjustedScale));
  }

  for(i in decoration.nodeLabels){
    n = decoration.nodeLabels[i];
    adjustedNodeLabels[i] = YOVALUE.clone(n);
    adjustedNodeLabels[i].size = Math.max(Math.round(n.size*adjustedScale), 1);
  }

  for(i in decoration.edges){
    n = decoration.edges[i];
    adjustedEdges[i] = YOVALUE.clone(n);
    adjustedEdges[i].width = Math.max(1, Math.round(n.width*adjustedScale));
  }

  return {
    scale: decoration.scale*adjustedScale,
    nodes: adjustedNodes,
    edges: adjustedEdges,
    nodeLabels: adjustedNodeLabels
  };
};

/**
 * Some set functions for arrays: union(arr1, arr2), intersection(arr1, arr2), difference(arr1, arr2),
 * @type {Object}
 */
YOVALUE.arrayHelper = {
  /**
   * Merging two arrays
   * @param arr1
   * @param arr2
   * @return {Object}
   */
  union: function (arr1, arr2) {
    var s1 = this._makeSet(arr1);
    var s2 = this._makeSet(arr2);
    var u = {};
    this._copyInto(s1, u);
    this._copyInto(s2, u);
    return this._makeArray(u);
  },

  /**
   * This returns all items that exists both in arr1 and in arr2
   * @param arr1
   * @param arr2
   * @return {Object}
   */
  intersection: function (arr1, arr2) {
    var s1 = this._makeSet(arr1);
    var s2 = this._makeSet(arr2);
    var i = {};
    for (var item in s1) {
      if (s1[item] === true && s2[item] === true) {
        i[item] = true;
      }
    }
    return this._makeArray(i);
  },

  /**
   * This returns all items in arr1 that is not exists in arr2
   * @param arr1
   * @param arr2
   * @return {Object}
   */
  difference: function (arr1, arr2) {
    var s1 = this._makeSet(arr1);
    var s2 = this._makeSet(arr2);
    var diff = {};
    this._copyInto(s1, diff);
    for (var item in s2) {
      if (s2[item] === true) {
        delete diff[item];
      }
    }
    return this._makeArray(diff);
  },

  /**
   * Creates a set from array
   * Here a set is just a object in a form {item1:true, item2:true, ...}
   * @param items
   * @return {Object}
   * @private
   */
  _makeSet: function(items) {
    var set = {};
    for (var i = 0; i < items.length; i++) {
      set[items[i]] = true;
    }
    return set;
  },

  /**
   * Creates array from set
   * @param items
   * @return {Object}
   * @private
   */
  _makeArray: function(s) {
    var keys = [], key;
    for (key in s) {
      if (s.hasOwnProperty(key)) keys.push(key);
    }
    return keys;
  },

  /**
   * Copy on set to another
   * @param s
   * @param copy
   * @private
   */
  _copyInto: function(s, copy) {
    for (var item in s) {
      if (s[item] === true) {
        copy[item] = true;
      }
    }
  }
};

/**
 * Estimates object size in bytes
 * @param object
 * @returns {number}
 */
YOVALUE.roughSizeOfObject = function( object ) {
  var objectList = [];
  var stack = [ object ];
  var bytes = 0;
  var i;

  while ( stack.length ) {
    var value = stack.pop();

    if ( typeof value === 'boolean' ) {
      bytes += 4;
    }
    else if ( typeof value === 'string' ) {
      bytes += value.length * 2;
    }
    else if ( typeof value === 'number' ) {
      bytes += 8;
    }
    else if
      (
      typeof value === 'object'
        && objectList.indexOf( value ) === -1
      )
    {
      objectList.push( value );

      for( i in value ) {
        stack.push( value[ i ] );
      }
    }
  }
  return bytes;
};

YOVALUE.Promise = function(jQuery){
  this._jQuery = jQuery;
};

YOVALUE.Promise.prototype = {
  getDefer: function(){
    return this._jQuery.Deferred();
  },

  when: function(){
    return this._jQuery.when.apply(this._jQuery, arguments);
  },

  then: function(){
    return this._jQuery.then.apply(this._jQuery, arguments);
  }
};

YOVALUE.compare = function(a, b){
  return JSON.stringify(a) === JSON.stringify(b);
};

YOVALUE.isJson = function(str) {
  if(typeof str !== "string") return false;

  try {
    item = JSON.parse(str);
  } catch (e) {
    return false;
  }

  if(typeof item === "object" && item !== null) {
    return true;
  }

  return false;
};

/**
 * Very simple and slow Promise just for debug purposes
 * @param fn
 * @constructor
 */

/*
YOVALUE.Promise = function(fn){
   var that = this;
   this.thenFns = [];

   this.resolve = function(){
     // User can pass to resolve several arguments
     var args = Array.prototype.slice.call(arguments);
     // plan it to call after that.thenFn will be defined by then()
     setTimeout(function(){
       if(that.thenFns.length == 0) return;
       var thenFn = that.thenFns.shift();
       var res = thenFn.apply(this,args);
       // if user's thenFn returned Promise, push to it all thenFns we have in this promise
       if(res && typeof(res.then) != 'undefined')  res.then(that.thenFns);
     }, 0);
   };

   this.then = function(thenFn){
     if(Array.isArray(thenFn)) that.thenFns = thenFn;
    else if(thenFn) that.thenFns.push(thenFn);
     return that;
   };

   fn(this.resolve);
};

YOVALUE.Promise.all = function(promises) {
  var accumulator = [];
  return new YOVALUE.Promise(function(resolve){
    if(typeof(resolve) != 'function') return;
    promises.forEach(function (promise) {
      promise.then(function (value) {
        accumulator.push(value);
        if(accumulator.length == promises.length) resolve.apply(this,accumulator);
      });
    });
  });
};
*/
/**
 * Convert array of strings to array of integers
 * @param myArray
 * @returns {*}
 */
YOVALUE.strToInt = function(myArray){
  for(var i=0; i<myArray.length; i++) { myArray[i] = +myArray[i]; }
  return myArray;
};

/**
 *
 * @param srcs
 * @returns {*}
 */
YOVALUE.imageLoader = function(promise){
  this._promise = promise;
};

YOVALUE.imageLoader.prototype = {
  load: function(sources, callback){
    var i, loaders = [];
    for(i in sources){
      loaders.push(this._loadImage(sources[i]));
    }
    this._promise.when.apply(this._promise, loaders).then(callback);
  },

  _loadImage: function(src){
    var deferred = this._promise.getDefer();
    var im = new Image();
    im.onload = function() {
      deferred.resolve();
    };
    im.src = src;
    return deferred.promise();
  }
};

/**
 *
 * @param data - image src
 * @param colfrom - color to replace (in hex)
 * @param colto - color that will update colfrom (in hex)
 * @returns {*}
 */
YOVALUE.changeColorInImage = function(data, colfrom, colto) {
  // create fake image to calculate height / width
  var img = document.createElement("img");
  img.src = data;
  img.style.visibility = "hidden";
  document.body.appendChild(img);

  var canvas = document.createElement("canvas");
  canvas.width = img.offsetWidth;
  canvas.height = img.offsetHeight;

  var ctx = canvas.getContext("2d");
  ctx.drawImage(img,0,0);

  // remove image
  img.parentNode.removeChild(img);

  // do actual color replacement
  var imageData = ctx.getImageData(0,0,canvas.width,canvas.height);
  var data = imageData.data;

  var rgbfrom = YOVALUE.ColorHelper.getRGB(colfrom);
  var rgbto = YOVALUE.ColorHelper.getRGB(colto);

  var r,g,b;
  for(var x = 0, len = data.length; x < len; x+=4) {
    r = data[x];
    g = data[x+1];
    b = data[x+2];

    if((r == rgbfrom.r) &&
      (g == rgbfrom.g) &&
      (b == rgbfrom.b)) {

      data[x] = rgbto.r;
      data[x+1] = rgbto.g;
      data[x+2] = rgbto.b;

    }
  }

  ctx.putImageData(imageData,0,0);
  var newImage = canvas.toDataURL();
  delete canvas;

  return newImage;
};

/**
 * 2-dim vector
 * @param x
 * @param y
 * @constructor
 */
YOVALUE.Vector = function(x, y){
  this.x = x;
  this.y = y;
};

YOVALUE.Vector.prototype = {
  add: function(v2){
    return new YOVALUE.Vector(this.x + v2.x, this.y + v2.y);
  },

  subtract: function(v2){
    return new YOVALUE.Vector(this.x - v2.x, this.y - v2.y);
  },

  multiply: function(n){
    return new YOVALUE.Vector(this.x * n, this.y * n);
  },

  divide: function(n){
    return new YOVALUE.Vector(this.x / n, this.y / n);
  },

  magnitude: function(){
    return Math.sqrt(this.x*this.x + this.y*this.y);
  },

  normalise: function(){
    return this.divide(this.magnitude());
  }
};

/**
 * calculate intersection rectangle of r1, r2 = {x, y, width, height}
 * returns {x:xIntersection, y:yIntersection}
 */
YOVALUE.calcRectIntersection = function(r1, r2){
  // helper function that calculates intersection of two 1-dim intervals
  // args: i1={start, stop}, i2={start, stop}
  function calcOneDimIntersection(i1, i2){
    var resections = [];
    resections.push({x:i1.start, interval:0});
    resections.push({x:i1.stop, interval:0});
    resections.push({x:i2.start, interval:1});
    resections.push({x:i2.stop, interval:1});
    resections.sort(function(res1, res2){
      return res1.x - res2.x;
    });
    // if after resection of one interval we see resection of another => two intervals intersects
    if(resections[0].interval != resections[1].interval) return Math.abs(resections[2].x - resections[1].x);
    else return 0;
  }

  var xIntersection = calcOneDimIntersection({start:r1.x, stop:r1.x+r1.width}, {start:r2.x, stop:r2.x+r2.width});
  var yIntersection = calcOneDimIntersection({start:r1.y, stop:r1.y+r1.height}, {start:r2.y, stop:r2.y+r2.height});
  if(xIntersection == 0 || yIntersection == 0) return {x:0,y:0};
  return {x:xIntersection, y:yIntersection}
};

/**
 * Compare if two objects are equal
 * Taken from http://stackoverflow.com/questions/1068834/object-comparison-in-javascript
 * TODO: write tests for it
 * @returns {boolean}
 */
YOVALUE.deepCompare = function () {
  var i, l, leftChain, rightChain;

  function compare2Objects (x, y) {
    var p;

    // remember that NaN === NaN returns false
    // and isNaN(undefined) returns true
    if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
      return true;
    }

    // Compare primitives and functions.
    // Check if both arguments link to the same object.
    // Especially useful on step when comparing prototypes
    if (x === y) {
      return true;
    }

    // Works in case when functions are created in constructor.
    // Comparing dates is a common scenario. Another built-ins?
    // We can even handle functions passed across iframes
    if ((typeof x === 'function' && typeof y === 'function') ||
        (x instanceof Date && y instanceof Date) ||
        (x instanceof RegExp && y instanceof RegExp) ||
        (x instanceof String && y instanceof String) ||
        (x instanceof Number && y instanceof Number)) {
      return x.toString() === y.toString();
    }

    // At last checking prototypes as good a we can
    if (!(x instanceof Object && y instanceof Object)) {
      return false;
    }

    if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
      return false;
    }

    if (x.constructor !== y.constructor) {
      return false;
    }

    if (x.prototype !== y.prototype) {
      return false;
    }

    // Check for infinitive linking loops
    if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
      return false;
    }

    // Quick checking of one object beeing a subset of another.
    // todo: cache the structure of arguments[0] for performance
    for (p in y) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      }
      else if (typeof y[p] !== typeof x[p]) {
        return false;
      }
    }

    for (p in x) {
      if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
        return false;
      }
      else if (typeof y[p] !== typeof x[p]) {
        return false;
      }

      switch (typeof (x[p])) {
        case 'object':
        case 'function':

          leftChain.push(x);
          rightChain.push(y);

          if (!compare2Objects (x[p], y[p])) {
            return false;
          }

          leftChain.pop();
          rightChain.pop();
          break;

        default:
          if (x[p] !== y[p]) {
            return false;
          }
          break;
      }
    }

    return true;
  }

  if (arguments.length < 1) {
    return true; //Die silently? Don't know how to handle such case, please help...
    // throw "Need two or more arguments to compare";
  }

  for (i = 1, l = arguments.length; i < l; i++) {

    leftChain = []; //Todo: this can be cached
    rightChain = [];

    if (!compare2Objects(arguments[0], arguments[i])) {
      return false;
    }
  }

  return true;
};

/**
 * Generate unique id
 * @type {number}
 * @private
 */
YOVALUE.__UNIQID = 0;
YOVALUE.getUniqId = function(){
  return ++YOVALUE.__UNIQID;
};

/**
 * Retrieve unique id (or 'sign') of any javascript object
 * @param o
 * @returns {*}
 */
YOVALUE.getObjectId = function(o) {
  if ( typeof o.__grasphowUniqueId == "undefined" ) {
    Object.defineProperty(o, "__grasphowUniqueId", {
      value: YOVALUE.getUniqId(),
      enumerable: false,
      // This could go either way, depending on your
      // interpretation of what an "id" is
      writable: false
    });
  }

  return o.__grasphowUniqueId;
};

YOVALUE.isObjectInArray = function (array, obj) {
  var i;
  for (i = 0; i < array.length; i++) {
    if (array[i] === obj) {
      return true;
    }
  }

  return false;
};

YOVALUE.getBrowserInfo = function(){
  var ua= navigator.userAgent, tem,
      M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
  if(/trident/i.test(M[1])){
    tem=  /\brv[ :]+(\d+)/g.exec(ua) || [];
    return {'type':'IE', 'ver':(tem[1] || '')};
  }
  if(M[1]=== 'Chrome'){
    tem= ua.match(/\b(OPR|Edge)\/(\d+)/);
    if(tem!= null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
  }
  M= M[2]? [M[1], M[2]]: [navigator.appName, navigator.appVersion, '-?'];
  if((tem= ua.match(/version\/(\d+)/i))!= null) M.splice(1, 1, tem[1]);
  return {'type':M[0], 'ver':M[1]};
};

// CustomEvent for IE
(function () {
  function CustomEvent ( event, params ) {
    params = params || { bubbles: false, cancelable: false, detail: undefined };
    var evt = document.createEvent( 'CustomEvent' );
    evt.initCustomEvent( event, params.bubbles, params.cancelable, params.detail );
    return evt;
  }

  CustomEvent.prototype = window.Event.prototype;

  window.CustomEvent = CustomEvent;
})();

/**
 * Syntax sugar to create DOM element
 * @param {String} tag - DOM element type (div, input, h1, ...) or text for text node
 * @param {Object<string, string>} attrs - DOM attributes (id, class, value), no CSS here
 * @param {String=} text - text inside element
 * @param {function(string,string)=} callback - callback on value change (optional)
 * @returns {HTMLElement}
 */
YOVALUE.createElement = function(tag, attrs, text, callback){
  if(tag == 'text') return document.createTextNode(text);

  var el = document.createElement(tag);
  for(var i in attrs){
    if(i == 'disabled' && attrs[i] != true) continue;
    if(typeof(attrs[i]) != 'undefined') el.setAttribute(i, attrs[i]);
  }
  if(typeof(text) != 'undefined') text = String(text);
  if(typeof(text) != 'undefined' && text.length > 0) el.appendChild(document.createTextNode(text));

  // Bind callback on form field value change
  if(typeof(callback) != 'undefined'){
    // select
    if(tag == 'select') el.addEventListener('change', function(evt){
      callback(el.getAttribute('name'), el.options[el.selectedIndex].value);
    });

    // textarea
    else if(tag == 'textarea'){
      el.addEventListener('keyup',function(evt){
        callback(el.getAttribute('name'), el.value);
      });
    }

    // text input
    else if(tag == 'input' && (attrs['type'] == 'text' || typeof(attrs['type']) == 'undefined')){
      el.addEventListener('keyup',function(evt){
        callback(el.getAttribute('name'), el.value);
      });
    }

    // checkbox input
    else if(tag == 'input' && attrs['type'] == 'checkbox'){
      el.addEventListener('change',function(evt){
        callback(el.getAttribute('name'), el.checked);
      });
    }

    // all other input elements
    else{
      el.addEventListener('change', function(evt){
        callback(el.getAttribute('name'), el.value);
      });
    }
  }

  return el;
};
/**
 * Syntax sugar to update DOM element
 * @param {HTMLElement} el - DOM element
 * @param {Object<string, string>} attrs - DOM attributes (id, class, value), no CSS here
 * @param {String= || HTMLElement=} text - text inside element
 * @returns {HTMLElement}
 */
YOVALUE.updateElement = function(el, attrs, text){
  for(var i in attrs){
    if(i == 'disabled' && attrs[i] == false) el.removeAttribute("disabled");
    else el[i] = attrs[i];
  }
  if(typeof(text) != 'undefined'){
    if(YOVALUE.isDOMNode(text)){
      el.appendChild(text);
    }else{
      el.innerText = text;
    }
  }
  return el;
};
YOVALUE.getDisplay = function(el){
  return window.getComputedStyle(el, null)["display"];
};
YOVALUE.setDisplay = function(el, v){
  el.style.display = v;
};
/**
 * Recursively check if element 'child' is inside 'parent'
 * @param child
 * @param parent
 * @returns {boolean}
 */
YOVALUE.isChildOf = function(child, parent) {
  return parent.contains(child);
  /*
  if (child.parentNode === parent) {
    return true;
  } else if (child.parentNode === null) {
    return false;
  } else {
    return YOVALUE.isChildOf(child.parentNode, parent);
  }
  */
};

YOVALUE.removeChilds = function(parent){
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild);
  }
};

/**
 * https://github.com/davidbau/xsrand/blob/master/xor4096.js
 * @type {xor4096}
 */
YOVALUE.randomGeneratorFactory = xor4096;

/**
 * With YOVALUE.watch you can trace any change of oObj property sProp
 * @type {{}|*}
 */
YOVALUE.watch = function(oObj, sProp) {
  var sPrivateProp = "$_"+sProp+"_$"; // to minimize the name clash risk
  oObj[sPrivateProp] = oObj[sProp];

  // overwrite with accessor
  Object.defineProperty(oObj, sProp, {
    get: function () {
      return oObj[sPrivateProp];
    },

    set: function (value) {
      console.log("setting " + sProp + " to " + value);
     // debugger; // sets breakpoint
      oObj[sPrivateProp] = value;
    }
  });
};


YOVALUE.DOMParser = new DOMParser();
