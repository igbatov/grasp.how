TEST_NAME='testBackend';
SUBTEST_NAME='testQueryGrain';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};

/**
 * Test graph (id=1) removal
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  var graphId = 1;
  var sourceItemId = null;
  return  GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/updateGraphElementContent',
      {
        "graphId":graphId,
        "type":"updateNodeAlternativesP",
        "nodeContentId":graphId+"-1",
        "alternatives":{
          "0":{
            "{\"1-2\":\"0\"}":"0.2",
            "{\"1-2\":\"1\"}":"0.9"
          },
          "1":{
            "{\"1-2\":\"0\"}":"0.8",
            "{\"1-2\":\"1\"}":"0.1"
          }
        }
      }
  )
  .then(function(){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/updateGraphElementContent',
        {
          "type":"updateNodeAttribute",
          "graphId":graphId,
          "nodeContentId":graphId + "-1",
          "node_alternative_id":0,
          "nodeAttribute":{"name":"reliability","value":100}
        })
        .then(function(e){
          GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/updateGraphElementContent',
            {
              "type":"updateNodeAttribute",
              "graphId":graphId,
              "nodeContentId":graphId + "-1",
              "node_alternative_id":1,
              "nodeAttribute":{"name":"reliability","value":0}
            })
        });
  })
  .then(function(e){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/query_grain',
        {"graphId":graphId}
    )
    .then(function(e){
      console.log(e);
      console.log(JSON.parse(e));
      GRASP.TestHelpers.cmp(
        'grain response',
        JSON.parse(e),
        {
          "graphId": graphId,
          "result": "success",
          "data": {
            "1-2": [
              "0.1818182",
              "0.8181818"
            ]
          }
        }
      );
    });
  }).then(function(){
    return GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/updateGraphElementContent',
      {
        "type":"node_list_remove_request",
        "graphId":graphId,
        "nodeContentId":graphId+"-1",
        "node_alternative_id":"0",
        "nodeType":"fact",
        "itemId":sourceItemId
      });
  })
}