DEBUG_MODE = true;

var testBackend = {
  name: 'testBackend',
  run: function(next) {
// name test
    var TEST_NAME='testBackend';
    var p = Modules['Publisher'];
    if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};

// globals that test can use and modify
    var GLOBALS = {
      USERNAME: null,
      USER_ID: null,
      GRAPH_ID: null
    };

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
      GLOBALS.USERNAME = loginData['username'];
      GLOBALS.USER_ID = loginData['id'];
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          window.location.origin+'/loginTestUser?username='+GLOBALS.USERNAME
      );
    }).then(function(){
      console.log('-------testEmptyGraphCreation-------');
      return GRASP[TEST_NAME]['testEmptyGraphCreation'](GLOBALS);
    }).then(function(){
      console.log('-------testAddNode-------');
      return GRASP[TEST_NAME]['testAddNode'](GLOBALS);
    }).then(function(){
      console.log('-------testAddEdge-------');
      return GRASP[TEST_NAME]['testAddEdge'](GLOBALS);
    }).then(function(){
      console.log('-------testUpdateNode-------');
      return GRASP[TEST_NAME]['testUpdateNode'](GLOBALS);
    }).then(function(){
      console.log('-------testSources-------');
      return GRASP[TEST_NAME]['testSources'](GLOBALS);
    }).then(function(){
      console.log('-------testGraphClone-------');
      return GRASP[TEST_NAME]['testGraphClone'](GLOBALS);
    }).then(function(){
      console.log('-------testCloneUpdate-------');
      return GRASP[TEST_NAME]['testCloneUpdate'](GLOBALS);
    }).then(function(){
      console.log('-------testFindPublishers-------');
      return GRASP[TEST_NAME]['testFindPublishers'](GLOBALS);
    }).then(function(){
      console.log('-------testQueryGrain-------');
      return GRASP[TEST_NAME]['testQueryGrain'](GLOBALS);
    }).then(function(){
      console.log('-------testUpdateGraph-------');
      return GRASP[TEST_NAME]['testUpdateGraph'](GLOBALS);
    }).then(function(){
      console.log('-------testGraphRemove-------');
      return GRASP[TEST_NAME]['testGraphRemove'](GLOBALS);
    }).then(function(){
      console.log('-------testUser-------');
      return GRASP[TEST_NAME]['testUser'](GLOBALS);
    }).then(function(){
      var allEvents = p.getAllEvents();
      Modules['Promise'].when.apply(Modules['Promise'], allEvents)
          .then(function(){
            console.log('clearing test DB');
            return GRASP.TestHelpers.fetch(
                TEST_NAME,
                window.location.origin+'/clearTest');
          })
          .then(function() {
            // we need to logout because otherwise every other request will be for removed user
            return GRASP.TestHelpers.fetch(
                TEST_NAME,
                window.location.origin + '/logout');
          })
          .then(function(){
            console.log('all is done');
            console.log('finished at', new Date());
            console.log('total time', sw.elapsed()/1000);
            console.log('fetchStat: ', GRASP.TestHelpers.getFetchStat());
            next();
          });
    });

    setTimeout(function(){
      var events = p.getAllEvents();
      for(var i in events){
        var event = events[i];
        if(!event.isResolved()) console.log(event.getName());
      }
    }, 70*1000);
  }
};

// register test (to be force all tests run one, by one, not in parallel)
GRASP.TestHelpers.register(testBackend);
