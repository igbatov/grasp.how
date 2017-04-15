// name test
TEST_NAME='testBackend';
DEBUG_MODE = true;
dbSchemaFromUserId = 1;
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
// prepare test listeners (not every test needs this)
/*
GRASP[TEST_NAME] = function(publisher){
  this.publisher = publisher;
};
GRASP[TEST_NAME].prototype = {
  moduleName: 'tester',
  eventListener: function(event){
    var that = this;
    var eventName = event.getName();
    if(eventName == 'repository_requests_send') {
      this.clearTest();
    }
  },
  clearTest: function(){
    p.allEventsDone().then(function(){
      console.log('clearing test DB');
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          window.location.origin+'/clearTest'
      );
    }).then(function(){
      console.log('all is done');
    });
  }
};

var tester = new GRASP[TEST_NAME](p);
*/

// start
var USERNAME = '';
console.log('start', new Date());
var sw = new GRASP.stopWatch(TEST_NAME);
// create new DB for this test and switch on it
GRASP.TestHelpers.fetch(
    TEST_NAME,
    window.location.origin+'/createTestUser?dbSchemaFromUserId='+dbSchemaFromUserId
).then(function(loginData){
  console.log(loginData)
  loginData = JSON.parse(loginData);
  USERNAME = loginData['username'];
  return GRASP.TestHelpers.fetch(
      TEST_NAME,
      window.location.origin+'/loginTestUser?username='+USERNAME
  );
}).then(function(){
   return GRASP[TEST_NAME]['testEmptyGraphCreation']();
}).then(function(){
   return GRASP[TEST_NAME]['testAddNode']();
}).then(function(){
   return GRASP[TEST_NAME]['testAddEdge']();
}).then(function(){
   return GRASP[TEST_NAME]['testUpdateNode']();
}).then(function(){
   return GRASP.TestHelpers.exit(TEST_NAME);
}).then(function(){
   return GRASP[TEST_NAME]['testSources']();
}).then(function(){
   return GRASP[TEST_NAME]['testGraphClone']();
}).then(function(){
   return GRASP[TEST_NAME]['testCloneUpdate']();
}).then(function(){
   return GRASP[TEST_NAME]['testFindPublishers']();
}).then(function(){
   return GRASP[TEST_NAME]['testQueryGrain']();
}).then(function(){
   return GRASP[TEST_NAME]['testUpdateGraph']();
}).then(function(){
   return GRASP[TEST_NAME]['testGraphRemove']();
}).then(function(e){
  // rollbackTestChanges will clear testableapp_queries for this test,
  // commitTestChanges will execute all testableapp_queries
  return Promise.resolve();
  /*
  return GRASP.TestHelpers.fetch(
    TEST_NAME,
    window.location.origin+'/rollbackTestChanges'
  );
  */
}).then(function(){
  var allEvents = p.getAllEvents();
 // allEvents.push(Modules['Repository'].getQueueIsEmptyPromise());
  Modules['Promise'].when.apply(Modules['Promise'], allEvents).then(function(){
    console.log('clearing test DB');
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        //window.location.origin+'/rollbackTestChanges'
        window.location.origin+'/commitTestChanges'
    ).then(function(){
      console.log('all is done');
      console.log('finished at', new Date());
      console.log('total time', sw.elapsed()/1000);
      console.log('fetchStat: ', GRASP.TestHelpers.getFetchStat());
    });
  });
});

setTimeout(function(){
  var events = p.getAllEvents();
  for(var i in events){
    var event = events[i];
    if(!event.isResolved()) console.log(event.getName());
  }
}, 70*1000)