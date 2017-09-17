TEST_NAME='testBackend';
SUBTEST_NAME='testUpdateGraph';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test update of graph mapping, name and position
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testSources(){
  var graphId = GRAPH_ID;
  var historyStep = 2;
  var nodeMapping = {
    "area":{
      "id":"graphViews",
      "centerX":341,
      "centerY":190,
      "width":683,
      "height":310
    },
    "mapping":{
      "0":{
        "id":0,
        "x":285,
        "y":216
      },
      "1":{
        "id":1,
        "x":556,
        "y":148
      }
    }
  };
  return GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/updateNodeMapping',
      {
        "graphId":graphId,
        "step":historyStep,
        "node_mapping": nodeMapping
      }
  )
  .then(function(e){
    var r = {}
    r[graphId] = historyStep;
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/getGraphsHistoryChunk',
        r
    )
    .then(function(e){
        GRASP.TestHelpers.cmp(
            SUBTEST_NAME+': graph mapping must be updated',
            JSON.parse(e)[0]['node_mapping'],
            nodeMapping
        );
    });
  })
  .then(function(){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/changeGraphPosition',
        {"graphId":graphId,"position":"rightGraphView"}
    ).then(function(){
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          '/getGraphSettings',
          [graphId]
      ).then(function(e){
        GRASP.TestHelpers.cmp(
            SUBTEST_NAME+': graph position must be updated',
            JSON.parse(e)[graphId]['position'],
            'rightGraphView'
        );
      });
    });
  })
  .then(function(){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/updateGraphName',
        {"graphId":graphId,"name":"newGraph1"}
    ).then(function(e){
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          '/getGraphsModelSettings',
          {"graphIds":[graphId]}
      ).then(function(e){
        GRASP.TestHelpers.cmp(
            SUBTEST_NAME+': graph name must be updated',
            JSON.parse(e)[graphId]['name'],
            'newGraph1'
        );
      });
    });
  });
};