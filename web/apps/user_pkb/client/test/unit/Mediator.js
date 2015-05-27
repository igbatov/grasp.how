//We do not want extra logs in console, because jasmine will tell us everything by itself
YOVALUE.errorHandler.setQuietMode(true);

describe("Mediator.addSubscriber", function () {
  beforeEach(function(){
    this.mediator = new YOVALUE.Mediator();
  });

  it("should store listeners", function () {
    var listeners = [Object.create(YOVALUE.iListener), Object.create(YOVALUE.iListener)];
    
    this.mediator.addListener('e', listeners[0]);
    this.mediator.addListener('e', listeners[1]);

    expect(this.mediator.hasListener('e', listeners[0])).toBeTruthy();
    expect(this.mediator.hasListener('e', listeners[1])).toBeTruthy();
  });

  it("should throw for listener that does not implement YOVALUE.iListener", function () {
    var that = this;

    expect(function () {
      that.mediator.addListener('e', {});
    }).toThrow(Error("Object do not implement YOVALUE.iListener interface"));
  });
});

describe("Mediator.dispatch", function(){
  beforeEach(function(){
    this.mediator = new YOVALUE.Mediator();
    this.event = new YOVALUE.Event("event", {});
    this.listeners = [Object.create(YOVALUE.iListener), Object.create(YOVALUE.iListener)];
  });

  it("should call all listeners", function () {
    var listener_called1 = false;
    this.listeners[0].eventListener = function (event) { listener_called1 = true; };

    var listener_called2 = false;
    this.listeners[1].eventListener = function (event) { listener_called2 = true; };

    this.mediator.addListener('event', this.listeners[0]);
    this.mediator.addListener('event', this.listeners[1]);

    this.mediator.dispatch(this.event);

    expect(listener_called1).toBeTruthy();
    expect(listener_called2).toBeTruthy();
  });


  it("should pass event", function () {
    var actual;

    this.listeners[0].eventListener = function (event) { actual = arguments; };
    this.mediator.addListener('event', this.listeners[0]);

    this.mediator.dispatch(this.event);

    expect(actual[0]).toEqual(this.event);
  });

  it("should notify relevant observers only", function () {
    var calls = [];

    this.listeners[0].eventListener = function (event) { calls.push("event"); };
    this.mediator.addListener('event', this.listeners[0]);

    this.listeners[1].eventListener = function (event) { calls.push("other"); };
    var event2 = new YOVALUE.Event('other', {});
    this.mediator.addListener('other', this.listeners[1]);
    this.mediator.dispatch(event2);

    expect(calls).toEqual(["other"]);
  });

  it("should notify observers in the given order", function () {
    var calls = [];
    var A = function(){};
    A.prototype = {
      subscribe: function(event_name){},
      removeSubscribe: function(event_name){},
      eventListener: function(event){ calls.push('A'); }
    };
    var B = function(){};
    B.prototype = {
      subscribe: function(event_name){},
      removeSubscribe: function(event_name){},
      eventListener: function(event){ calls.push('B'); }
    };

    var Modules = {
      'A': A,
      'B': B
    };

    var mediator = new YOVALUE.Mediator(Modules, {'event':['B', 'A']});
    mediator.addListener('event', new A());
    mediator.addListener('event', new B());
    mediator.addListener('event', new A());
    mediator.dispatch(this.event);
    expect(calls).toEqual(["B", "A", "A"]);

    calls = [];
    mediator = new YOVALUE.Mediator(Modules, {'event':['B', 'A']});
    mediator.addListener('event', new B());
    mediator.addListener('event', new A());
    mediator.dispatch(this.event);
    expect(calls).toEqual(["B", "A"]);
  });

  it("should notify all even when some fail", function () {
    this.listeners[0].eventListener = function (event) { throw new Error("Oops"); };

    var listener_called2 = false;
    this.listeners[1].eventListener = function (event) { listener_called2 = true; };

    this.mediator.addListener('event', this.listeners[0]);
    this.mediator.addListener('event', this.listeners[1]);

    this.mediator.dispatch(this.event);

    expect(listener_called2).toBeTruthy();
  });

  it("should not fail if no observers", function () {
    var mediator = this.mediator;

    expect(function () {
      mediator.dispatch(this.event);
    }).toThrow();
  });
});
