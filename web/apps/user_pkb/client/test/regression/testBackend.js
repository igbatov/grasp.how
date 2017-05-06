// name test
TEST_NAME='testBackend';
DEBUG_MODE = true;

var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};

// globals that test can use and modify
var USERNAME = null;
var USER_ID = null;
var GRAPH_ID = null;

// start
console.log('start', new Date());
var sw = new GRASP.stopWatch(TEST_NAME);
// create new DB for this test and switch on it
GRASP.TestHelpers.fetch(
    TEST_NAME,
    window.location.origin+'/createTestUser'
).then(function(loginData){
  console.log(loginData)
  loginData = JSON.parse(loginData);
  USERNAME = loginData['username'];
  USER_ID = loginData['id'];
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
   return GRASP[TEST_NAME]['testUser']();
}).then(function(){
   return GRASP[TEST_NAME]['testGraphRemove']();
}).then(function(){
  var allEvents = p.getAllEvents();
  Modules['Promise'].when.apply(Modules['Promise'], allEvents).then(function(){
    console.log('clearing test DB');
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        window.location.origin+'/clearTest'
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