// name test
var TEST_NAME='testCreateGraph';

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
    if(eventName == 'graph_model_changed') {
      console.log(event);
    }
  }
};
var tester = new GRASP[TEST_NAME](p);
Modules['Mediator'].addListener('graph_model_changed',tester);

// start
var USERNAME = '';
// create new DB for this test and switch on it
Modules['Ajax'].send({
  url: window.location.origin+'/createTestUser?dbSchemaFromUserId=1&TEST_NAME='+TEST_NAME
}).then(function(loginData){
  console.log(loginData);
  loginData = JSON.parse(loginData);
  console.log(loginData);
  USERNAME = loginData['username'];
  return Modules['Ajax'].send({
    url: window.location.origin+'/loginTestUser?username='+USERNAME+'&TEST_NAME='+TEST_NAME
  });
}).then(function(){
  return p.publish(['create_new_graph', {name:'testGraph'}]);
}).then(function(){
  // reload graphs models
  return p.publish(['load_graph_models']);
}).then(function(){
  return p.publish(['get_graph_models'])
}).then(function(e){
  // assume here
  console.log(e);

  // clear testableapp_queries for this test, commitTest will execute all testableapp_queries
  return Modules['Ajax'].send({
    url: window.location.origin+'/rollbackTestChanges?TEST_NAME='+TEST_NAME
  });
}).then(function(){
  console.log('all is done')
  return Modules['Ajax'].send({
    url: window.location.origin+'/clearTest?TEST_NAME='+TEST_NAME
  });
});

