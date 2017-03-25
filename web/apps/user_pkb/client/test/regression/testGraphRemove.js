TEST_NAME='testBackend';
SUBTEST_NAME='testGraphRemove';
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
        return p.publish(['load_graph_models']);
      }).then(function(){
        return p.publish(["get_graph_models",[1]]);
      })
      .then(function(e){
        var graphModel = e[1];
        GRASP.TestHelpers.cmp(
            'load_graph_models, get_graph_models returns isInTrash = true',
            graphModel.getAttribute('isInTrash'),
            true
        );
      });
}