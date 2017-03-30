TEST_NAME='testBackend';
SUBTEST_NAME='testGraphRemove';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};

/**
 * Test graph (id=1) removal
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  return  GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/setGraphAttributes',
        {graphId:1, isInTrash:true}
      )
      .then(function(){
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/getGraphsModelSettings',
            {}
        );
      })
      .then(function(e){
        var graphModel = JSON.parse(e)[1];
        GRASP.TestHelpers.cmp(
            'getGraphsModelSettings returns isInTrash = true',
            graphModel['attributes']['isInTrash'],
            true
        );
      });
}