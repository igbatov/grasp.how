// name test
TEST_NAME='testBackend';
DEBUG_MODE = true;

// helpers
var clearTest = function(){
  return Modules['Ajax'].send({
    url: window.location.origin+'/clearTest?TEST_NAME='+TEST_NAME
  });
}

// prepare test listeners
var p = Modules['Publisher'];
GRASP[TEST_NAME] = function(publisher){
  this.publisher = publisher;
};
GRASP[TEST_NAME].prototype = {
  moduleName: 'tester',
  eventListener: function(event){
    var that = this;
    var eventName = event.getName();
    if(eventName == 'set_graph_attributes') {
      console.log(event);
    }
  }
};
var tester = new GRASP[TEST_NAME](p);
Modules['Mediator'].addListener('set_graph_attributes',tester);

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

  /**
   * Test empty graph creation
   */
  var testGraphId = null;
  return p.publish(['create_new_graph', {name:'testGraph'}])
      /**
       *  Check that repository_get_graphs_model_settings is OK
       */
      .then(function(){
          return p.publish(['repository_get_graphs_model_settings']);
      })
      .then(function(e){
        testGraphId = Math.max.apply(null, GRASP.getObjectKeys(e));
        GRASP.TestHelpers.cmp(
            'repository_get_graphs_model_settings',
            e[testGraphId],
            GRASP_TEST_DATA[TEST_NAME]['repository_get_graphs_model_settings']
        );
      })
      /**
       *  Check that repository_get_graphs_history_timeline is OK
       */
      .then(function(){
        return p.publish(['repository_get_graphs_history_timeline',{ids:[testGraphId]}]);
      })
      .then(function(e){
        GRASP.TestHelpers.cmp(
            'repository_get_graphs_history_timeline',
            e[testGraphId],
            GRASP_TEST_DATA[TEST_NAME]['repository_get_graphs_history_timeline']
        );
      });

}).then(function(e){
  return p.publish(['load_graph_models']);
}).then(function(e){
  // clear testableapp_queries for this test, commitTestChanges will execute all testableapp_queries
  return Modules['Ajax'].send({
    url: window.location.origin+'/rollbackTestChanges?TEST_NAME='+TEST_NAME
  });
}).then(function(){
  console.log('all is done');
  clearTest();
});



