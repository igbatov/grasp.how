
describe("YOVALUE.typeof", function(){
  it('should return right type for variables', function () {
    var a = "str";
    expect(YOVALUE.typeof(a)).toEqual('string');
    a = [];
    expect(YOVALUE.typeof(a)).toEqual('array');
    a = {};
    expect(YOVALUE.typeof(a)).toEqual('object');
    a = function(){};
    expect(YOVALUE.typeof(a)).toEqual('function');
    a = new function(){};
    expect(YOVALUE.typeof(a)).toEqual('object');
    a = 1;
    expect(YOVALUE.typeof(a)).toEqual('number');
    a = true;
    expect(YOVALUE.typeof(a)).toEqual('boolean');
    a = Number();
    expect(YOVALUE.typeof(a)).toEqual('number');
    a = String();
    expect(YOVALUE.typeof(a)).toEqual('string');
    a = Boolean();
    expect(YOVALUE.typeof(a)).toEqual('boolean');
    a = new Array();
    expect(YOVALUE.typeof(a)).toEqual('array');
    a = new Date();
    expect(YOVALUE.typeof(a)).toEqual('date');
    a = null;
    expect(YOVALUE.typeof(a)).toEqual('null');
  });
});

describe("YOVALUE.mixin", function(){
  it('should extend object A with functions of B', function () {
    var A = {
      funcA: function(){ return "A.funcA" }
    };

    var B = {
      funcB: function(){ return "B.funcB" }
    };

    YOVALUE.mixin(B, A);
    expect(A.funcA()).toEqual('A.funcA');
    expect(A.funcB()).toEqual('B.funcB');
  });

  it('should not rewrite object B functions with the same name object A functions', function () {
    var A = {
      funcA: function(){ return "A.funcA" }
    };

    var B = {
      funcA: function(){ return "B.funcB" }
    };

    YOVALUE.mixin(B, A);
    expect(A.funcA()).toEqual('A.funcA');
  });
});

describe("YOVALUE.construct", function(){
  it('should return new instance of given constructor A  with given array of arguments', function () {
    var A, obj;
    A = function(arg1, arg2){
      this.arg1 = arg1;
      this.arg2 = arg2;
    };
    A.prototype = {
      getArg1: function(){ return this.arg1; },
      getArg2: function(){ return this.arg2; }
    };
    obj = YOVALUE.construct(A, ['a','b']);
    expect(obj instanceof A).toEqual(true);
    expect(obj.getArg1()).toEqual('a');
    expect(obj.getArg2()).toEqual('b');
  });
});

describe("YOVALUE.wireModules", function(){
  it('should substitute constructors in Modules array with its instants', function () {
    var A, B, Modules, DI;
    A = function(){};
    B = function(){};
    Modules = {
      A: A,
      B: B
    };
    DI = {
      A: [],
      B: []
    };
    YOVALUE.wireModules(Modules, DI);
    expect(Modules["A"] instanceof A).toEqual(true);
    expect(Modules["B"] instanceof B).toEqual(true);
  });

  it('should inject in constructor Modules["A"] already instantiated module Modules["B"] if DI["A"] = ["B"]', function () {
    var A, B, Modules, DI;
    A = function(arg1){this.arg1 = arg1;};
    B = function(arg1){this.arg1 = arg1;};
    Modules = {
      A: A,
      B: B
    };
    DI = {
      A: ['value'],
      B: ['A']
    }
    YOVALUE.wireModules(Modules, DI);
    expect(Modules["A"].arg1).toEqual('value');
    expect(Modules["B"].arg1).toEqual(Modules["A"]);
  });
});

describe("YOVALUE.extend", function(){
  it('should add parent properties to child', function () {
    var parent = {
      funcA: function(){}
    };

    var child = YOVALUE.extend(parent, {
      funcB: function(){}
    });

    expect(child.funcA.toString()).toEqual('function (){}');
    expect(child.funcB.toString()).toEqual('function (){}');
  });
});

describe("YOVALUE.Table", function(){
  it('should add row to its list and return its id', function () {
    var table, row1, row2, id;
    table = new YOVALUE.Table(['columnA', 'columnB', 'columnC']);
    row1 = {'columnA':'A1', 'columnB':'B1', 'columnC':'C1'};
    id = table.insertRow(row1);
    expect(id).toEqual(0);
    expect(table.getRowById(id)).toEqual(row1);
    expect(table.getRowsCount()).toEqual(1);

    row2 = {'columnA':'A2', 'columnB':'B2', 'columnC':'C2'};
    id = table.insertRow(row2);
    expect(id).toEqual(1);
    expect(table.getRowById(id)).toEqual(row2);
    expect(table.getRowsCount()).toEqual(2);
  });

  it('should return all rows with given column values', function () {
    var table, row1, row2, row3, id;
    table = new YOVALUE.Table(['columnA', 'columnB', 'columnC']);
    row1 = {'columnA':'A1', 'columnB':'B1', 'columnC':'C1'};
    row2 = {'columnA':'A2', 'columnB':'B1', 'columnC':'C2'};
    row3 = {'columnA':'A2', 'columnB':'B1', 'columnC':'C3'};

    table.insertRow(row1);
    table.insertRow(row2);
    table.insertRow(row3);

    expect(table.getRows()).toEqual([row1, row2, row3]);
    expect(table.getRows({'columnB':'B1'})).toEqual([row1, row2, row3]);
    expect(table.getRows({'columnB':'B1', 'columnA':'A2'})).toEqual([row2, row3]);
    expect(table.getRows({'columnB':'B1', 'columnA':'A1'})).toEqual([row1]);
  });

  it('should remove row with given id', function () {
    var table, row1, row2, row3, id;
    table = new YOVALUE.Table(['columnA', 'columnB', 'columnC']);
    row1 = {'columnA':'A1', 'columnB':'B1', 'columnC':'C1'};
    row2 = {'columnA':'A2', 'columnB':'B1', 'columnC':'C2'};
    row3 = {'columnA':'A2', 'columnB':'B1', 'columnC':'C3'};

    table.insertRow(row1);
    id = table.insertRow(row2);
    table.insertRow(row3);

    table.removeRowByIds([id]);

    expect(typeof(table.getRowById(id))).toEqual('undefined');
    expect(table.getRows()).toEqual([row1, row3]);
    expect(table.getRowsCount()).toEqual(2);
  });
});

describe("YOVALUE.implements", function(){

  it('should return true if object implements given interface', function () {
    var iFace = {
      a: function(){},
      b: function(arg1, arg2){},
      c: Number(),
      d: String(),
      e: Object(),
      f: Array(),
      g: Boolean()
    };

    var objectToCheck = {
      a: function(){},
      b: function(arg1, arg2){},
      c: 1.6,
      d: "1",
      e: {},
      f: [],
      g: true
    };

    expect(YOVALUE.implements(objectToCheck, iFace)).toEqual(true);
  });

  it('should return false if object does not implement given interface un a full deep', function () {
    var iFace = {
      a: {aa1: String(), aa2: {aaa1:Number(), aaa2:Boolean()}}
    };

    var objectToCheck = {
      a: {aa1: String(), aa2: {}}
    };

    expect(YOVALUE.implements(objectToCheck, iFace)).toEqual(false);
  });

  it('should return false if object property name do not equal to that of interface', function () {
    var iFace = {
      a: String()
    };

    var objectToCheck = {
      b: String()
    };

    expect(YOVALUE.implements(objectToCheck, iFace)).toEqual(false);
  });

  it('should return false if object property type do not equal to that of interface', function () {
    var iFace = {
      a: String()
    };

    var objectToCheck = {
      a: Array()
    };

    expect(YOVALUE.implements(objectToCheck, iFace)).toEqual(false);
  });

});


describe("YOVALUE.clone", function(){
  it('should clone object', function(){
    var o = {
      a: 'a',
      b: 'b',
      c: {aa:2, bb:'bb', cc:null}
    };

    //cloned object should be equal to original
    var clone = YOVALUE.clone(o);
    expect(clone).toBeJsonEqual(o);

    //cloned object should not be modified if original was changed
    o.c.aa = 'b';
    expect(clone.c.aa).toEqual(2);
  });

  it('should clone object without prototype', function(){
    var O = function(){
      this.a = 'a';
    };
    O.prototype = {
      setA: function(v){ this.a = v}
    };

    var o = new O;

    //cloned object should be equal to original
    var clone = YOVALUE.clone(o);
    expect(clone).toBeJsonEqual(o);
    expect(clone.setA).toEqual(undefined);
  })
});

describe("YOVALUE.deepmerge", function(){
  it('should merge arbitrarily deep objects', function(){
    var po = {"a": "poui", "c": {"q": 444, "w": function () {return 1123;}}, "o": {"b": {"t": "cats"}, "q": 7}, "p": 764}
    var as = {"a": "asdf", "b": 4, "c": {"q": 1, "w": function () {return 5;}}}

    expect(YOVALUE.deepmerge(as, po)).toBeJsonEqual({ a : [ 'asdf', 'poui' ], c : { q : [ 1, 444 ], w : [ function () {return 5;}, function () {return 1123;} ] }, o : { b : { t : 'cats' }, q : 7 }, p : 764, b : 4 });
  })
});

