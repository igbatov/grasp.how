// name test
TEST_NAME='testBackend';
DEBUG_MODE = true;

// helpers
var clearTest = function(){
  return Modules['Ajax'].send({
    url: window.location.origin+'/clearTest?TEST_NAME='+TEST_NAME
  });
}

// start
var USERNAME = '';
var repositoryRequests = []; // to track events to repository that we tested

// create new DB for this test and switch on it
Modules['Ajax'].send({
  url: window.location.origin+'/createTestUser?dbSchemaFromUserId=1&TEST_NAME='+TEST_NAME
}).then(function(loginData){
  loginData = JSON.parse(loginData);
  USERNAME = loginData['username'];
  return Modules['Ajax'].send({
    url: window.location.origin+'/loginTestUser?username='+USERNAME+'&TEST_NAME='+TEST_NAME
  });
}).then(function(){
    return GRASP['testBackend']['testEmptyGraphCreation']();
}).then(function(e){
  // return p.publish(['load_graph_models']);
  return {then:function(){}}
}).then(function(e){
  // clear testableapp_queries for this test, commitTestChanges will execute all testableapp_queries
  return Modules['Ajax'].send({
    url: window.location.origin+'/rollbackTestChanges?TEST_NAME='+TEST_NAME
  });
}).then(function(){
  console.log('all is done');
  clearTest();
});



