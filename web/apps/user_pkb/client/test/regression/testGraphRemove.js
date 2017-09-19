TEST_NAME='testBackend';
SUBTEST_NAME='testGraphRemove';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};

/**
 * Test graph removal
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(GLOBALS){
  return  GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/setGraphAttributes',
        {graphId:GLOBALS.GRAPH_ID, isInTrash:true}
      )
      .then(function(){
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/getGraphsModelSettings',
            {}
        );
      })
      .then(function(e){
        var graphModel = JSON.parse(e)[GLOBALS.GRAPH_ID];
        GRASP.TestHelpers.cmp(
            'getGraphsModelSettings returns isInTrash = true',
            graphModel['attributes']['isInTrash'],
            true
        );
      });
}