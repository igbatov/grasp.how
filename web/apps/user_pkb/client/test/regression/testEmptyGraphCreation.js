TEST_NAME='testBackend';
SUBTEST_NAME='testEmptyGraphCreation'
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};

/**
 * Test empty graph creation
 */
// test run function
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
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
            GRASP_TEST_DATA[TEST_NAME][SUBTEST_NAME]['repository_get_graphs_model_settings']
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
            GRASP_TEST_DATA[TEST_NAME][SUBTEST_NAME]['repository_get_graphs_history_timeline']
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
            GRASP_TEST_DATA[TEST_NAME][SUBTEST_NAME]['repository_get_graphs_model_elements']
        );
      });

}