TEST_NAME='testBackend';
/**
 * Test empty graph creation
 */

// prepare test listeners (not every test needs this)
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

// test run function
GRASP[TEST_NAME]['testEmptyGraphCreation'] = function testEmptyGraphCreation(){
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
      })
      /**
       *  Check that repository_get_graphs_model_elements is OK
       */
      .then(function(){
        var data = {}; data[testGraphId]=1;
        return p.publish(['repository_get_graphs_model_elements',data]);
      })
      .then(function(e){
        GRASP.TestHelpers.cmp(
            'repository_get_graphs_model_elements',
            e ,
            GRASP_TEST_DATA[TEST_NAME]['repository_get_graphs_model_elements']
        );
      });

}