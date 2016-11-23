//We do not want extra logs in console, because jasmine will tell us everything by itself
GRASP.errorHandler.setQuietMode(true);

describe("Publisher.when", function () {
  beforeEach(function(){
    this.mediator = new GRASP.Mediator();
    this.event1 = new GRASP.Event("event1", {});
    this.event2 = new GRASP.Event("event2", {});
    this.event3 = new GRASP.Event("event3", {});

    this.listeners = [Object.create(GRASP.iListener), Object.create(GRASP.iListener), Object.create(GRASP.iListener), Object.create(GRASP.iListener)];

    this.mediator.addListener('event1', this.listeners[0]);
    this.mediator.addListener('event2', this.listeners[1]);
    this.mediator.addListener('event3', this.listeners[2]);
    this.mediator.addListener('event1', this.listeners[3]);

    var promise = new GRASP.Promise(jQuery);
    this.publisher = new GRASP.Publisher(this.mediator, promise);
  });



  it("should execute planned events sequentially, one by one", function () {
    var that = this;

    /* PREPARE */
    // create listeners
    this.listeners[0].eventListener = function (event) {
      setTimeout(function(){event.setResponse(event.getData() + ' listener1Data')}, 100);
    };

    this.listeners[1].eventListener = function (event) {
      setTimeout(function(){event.setResponse(event.getData() + ' listener2Data')}, 100);
    };

    /* TEST LOGIC */
    // schedule successive events
    var callbackValue1 = null;
    var callbackValue2 = null;
    var event1 = this.publisher.createEvent('event1');
    this.publisher.when(event1).then(function(data){
      callbackValue1 = 'a ' + data;
      return that.publisher.publish('event2', callbackValue1);
    }).then(function(data){
        callbackValue2 = 'b ' + data;
    });
    this.publisher.publishEvent(event1);

    /* VERIFICATION */
    // event1 setResponse must be called after 100, event2 after 100 after that, so
    // after 100 that must be still callbackValue1 = null and callbackValue2 = null
    waits(10);
    runs(function(){
      expect(callbackValue1).toEqual(null);
      expect(callbackValue2).toEqual(null);
    });

    // after 110 that must be callbackValue1 = 'a listener1Data' and callbackValue2 = null
    waits(100);
    runs(function(){
      expect(callbackValue1).toEqual('a undefined listener1Data');
      expect(callbackValue2).toEqual(null);
    });

    // after 210 that must be still callbackValue1 = 'a listener1Data' and callbackValue2 = 'b listener1Data'
    waits(100);
    runs(function(){
      expect(callbackValue1).toEqual('a undefined listener1Data');
      expect(callbackValue2).toEqual('b a undefined listener1Data listener2Data');
    });
  });


  it("should work correct if the event setResponse happens immediately", function () {
    var that = this;

    /* PREPARE */
    // create listeners
    this.listeners[0].eventListener = function (event) {
      event.setResponse(event.getData() + ' listener1Data');
    };

    this.listeners[1].eventListener = function (event) {
      setTimeout(function(){event.setResponse(event.getData() + ' listener2Data')}, 100);
    };

    /* TEST LOGIC */
    // schedule successive events
    var callbackValue1 = null;
    var callbackValue2 = null;
    var event1 = this.publisher.createEvent('event1');
    this.publisher.when(event1).then(function(data){
      callbackValue1 = 'a ' + data;
      return that.publisher.publish('event2', callbackValue1);
    }).then(function(data){
        callbackValue2 = 'b ' + data;
    });
    this.publisher.publishEvent(event1);

    /* VERIFICATION */
    // event1 setResponse was called immediately, so
    // here we already have callbackValue1 = 'a undefined listener1Data' and callbackValue2 = null
    expect(callbackValue1).toEqual('a undefined listener1Data');
    expect(callbackValue2).toEqual(null);

    waits(110);
    // after 110 that must be  callbackValue1 = 'a undefined listener1Data' and callbackValue2 = 'b a undefined listener1Data listener2Data'
    runs(function(){
      expect(callbackValue1).toEqual('a undefined listener1Data');
      expect(callbackValue2).toEqual('b a undefined listener1Data listener2Data');
    });
  });



  it("should work correct if listener is using publisher.when too", function () {
    var that = this;

    /* PREPARE */
    // create listeners
    this.listeners[0].eventListener = function (event) {
      setTimeout(function(){
        var event3 = that.publisher.createEvent('event3');
        that.publisher.when(event3).then(function(data){
          event.setResponse(data + ' listener1Data');
        });
        that.publisher.publishEvent(event3);
      }, 100);
    };

    this.listeners[1].eventListener = function (event) {
      setTimeout(function(){event.setResponse(event.getData() + ' listener2Data')}, 100);
    };

    this.listeners[2].eventListener = function (event) {
      setTimeout(function(){event.setResponse(event.getData() + ' listener3Data')}, 100);
    };

    /* TEST LOGIC */
    // schedule successive events
    var callbackValue1 = null;
    var callbackValue2 = null;
    var event1 = this.publisher.createEvent('event1');
    this.publisher.when(event1).then(function(data){
      callbackValue1 = 'a ' + data;
      return that.publisher.publish('event2', callbackValue1);
    }).then(function(data){
        callbackValue2 = 'b ' + data;
    });
    this.publisher.publishEvent(event1);

    /* VERIFICATION */
    // event1 setResponse must be called after 100, event2 after 100 after that, so
    // after 100 that must be still callbackValue1 = null and callbackValue2 = null
    waits(10);
    runs(function(){
      expect(callbackValue1).toEqual(null);
      expect(callbackValue2).toEqual(null);
    });

    // after 110 that must be still callbackValue1 = null and callbackValue2 = null
    waits(100);
    runs(function(){
      expect(callbackValue1).toEqual(null);
      expect(callbackValue2).toEqual(null);
    });

    // after 210 that must be still callbackValue1 = 'a undefined listener3Data listener1Data' and callbackValue2 = null
    waits(100);
    runs(function(){
      expect(callbackValue1).toEqual('a undefined listener3Data listener1Data');
      expect(callbackValue2).toEqual(null);
    });

    // after 310 that must be still callbackValue1 = 'a undefined listener3Data listener1Data' and callbackValue2 = 'b a undefined listener3Data listener1Data listener2Data'
    waits(100);
    runs(function(){
      expect(callbackValue1).toEqual('a undefined listener3Data listener1Data');
      expect(callbackValue2).toEqual('b a undefined listener3Data listener1Data listener2Data');
    });
  });

});