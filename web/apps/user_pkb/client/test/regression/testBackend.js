// name test
TEST_NAME='testBackend';
DEBUG_MODE = true;

// helpers
var clearTest = function(){
  return GRASP.TestHelpers.fetch(
    TEST_NAME,
    window.location.origin+'/clearTest'
  );
}

// start
var USERNAME = '';

// create new DB for this test and switch on it
GRASP.TestHelpers.fetch(
    TEST_NAME,
    window.location.origin+'/createTestUser?dbSchemaFromUserId=1'
).then(function(loginData){
  console.log(loginData)
  loginData = JSON.parse(loginData);
  USERNAME = loginData['username'];
  return GRASP.TestHelpers.fetch(
      TEST_NAME,
      window.location.origin+'/loginTestUser?username='+USERNAME
  );
}).then(function(){
   return GRASP['testBackend']['testEmptyGraphCreation']();
}).then(function(){
   return GRASP['testBackend']['testGraphRemove']();
}).then(function(){
   return GRASP['testBackend']['testAddGraphElements']();
}).then(function(e){
  // return p.publish(['load_graph_models']);
  return Promise.resolve();
}).then(function(e){
  // clear testableapp_queries for this test, commitTestChanges will execute all testableapp_queries
  //return Promise.resolve();
  return GRASP.TestHelpers.fetch(
    TEST_NAME,
    window.location.origin+'/rollbackTestChanges'
  );
}).then(function(){
  //return Promise.resolve();
  return clearTest();
}).then(function(){
  console.log('all is done');
});



