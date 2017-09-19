TEST_NAME='testBackend';
SUBTEST_NAME='testQueryGrain';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};


// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testQueryGrain(GLOBALS){
  var sourceItemId = null;
  var p1 = {};
  p1["{\""+GLOBALS.GRAPH_ID+"-2\":\"0\"}"] = "0.2";
  p1["{\""+GLOBALS.GRAPH_ID+"-2\":\"1\"}"] = "0.9";
  var p2 = {};
  p2["{\""+GLOBALS.GRAPH_ID+"-2\":\"0\"}"] = "0.8";
  p2["{\""+GLOBALS.GRAPH_ID+"-2\":\"1\"}"] = "0.1";
  return  GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/updateGraphElementContent',
      {
        "graphId":GLOBALS.GRAPH_ID,
        "type":"updateNodeAlternativesP",
        "nodeContentId":GLOBALS.GRAPH_ID+"-1",
        "alternatives":{
          "0":p1,
          "1":p2
        }
      }
  )
  .then(function(){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/updateGraphElementContent',
        {
          "type":"updateNodeAttribute",
          "graphId":GLOBALS.GRAPH_ID,
          "nodeContentId":GLOBALS.GRAPH_ID + "-1",
          "node_alternative_id":0,
          "nodeAttribute":{"name":"reliability","value":100}
        })
        .then(function(e){
          GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/updateGraphElementContent',
            {
              "type":"updateNodeAttribute",
              "graphId":GLOBALS.GRAPH_ID,
              "nodeContentId":GLOBALS.GRAPH_ID + "-1",
              "node_alternative_id":1,
              "nodeAttribute":{"name":"reliability","value":0}
            })
        });
  })
  .then(function(e){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/query_grain',
        {"graphId":GLOBALS.GRAPH_ID}
    )
    .then(function(e){
      console.log(e);
      console.log(JSON.parse(e));
      var data = {};
      data[GLOBALS.GRAPH_ID+"-2"] = [
        "0.1818182",
        "0.8181818"
      ];
      GRASP.TestHelpers.cmp(
        'grain response',
        JSON.parse(e),
        {
          "graphId": GLOBALS.GRAPH_ID,
          "result": "success",
          "data": data
        }
      );
    });
  }).then(function(){
    return GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/updateGraphElementContent',
      {
        "type":"node_list_remove_request",
        "graphId":GLOBALS.GRAPH_ID,
        "nodeContentId":GLOBALS.GRAPH_ID+"-1",
        "node_alternative_id":"0",
        "nodeType":"fact",
        "itemId":sourceItemId
      });
  })
}