TEST_NAME='testBackend';
SUBTEST_NAME='testAddGraphElements';
/**
 * Test graph (id=2) adding two nodes and edge between them
 */
// test run
var graphId=2;
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  return  GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/updateGraphElementContent',
      {
        "graphId": graphId,
        "type": "addNode",
        "node": {
          "nodeContentId": "",
          "active_alternative_id": 0,
          "alternatives": [
            {
              "label": "fact",
              "p": [],
              "reliability": 50,
              "text": "",
              "list": []
            },
            {
              "label": "NOT TRUE: fact",
              "p": [],
              "reliability": 50,
              "text": "",
              "list": []
            }
          ],
          "type": "fact",
          "importance": 50,
          "icon": null,
          "stickers": null
        }
      }
  )
  .then(function(e){
    var response = JSON.parse(e);
    return GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/getGraphElementsAttributes',
      {'nodes':[response['nodeContentId']]}
    );
  })
  .then(function(e){
    console.log(e);
    /*
    GRASP.TestHelpers.cmp(
        'graph should have new graph node',
        graphModel.getNodes(),
        true
    );
    */
  });
};