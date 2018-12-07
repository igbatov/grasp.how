TEST_NAME='testBackend';
SUBTEST_NAME='testAddNode';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph adding two nodes and edge between them
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testAddNode(GLOBALS){
  return  GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/updateGraphElementContent',
      {
        "graphId": GLOBALS.GRAPH_ID,
        "type": "addNode",
        "node": {
          "nodeContentId": "",
          "active_alternative_id": 0,
          "alternatives": [
            {
              "label": "fact",
              "p": [],
              "reliability": 0.5,
              "text": "",
              "list": []
            },
            {
              "label": "NOT TRUE: fact",
              "p": [],
              "reliability": 0.5,
              "text": "",
              "list": []
            }
          ],
          "type": "fact",
          "importance": 50,
          "p_samples": null,
          "icon": null,
          "stickers": [],
          "value_range": null,
          "value_type": null,
        }
      })
      .then(function(e){
        var response = JSON.parse(e);
        GRASP.TestHelpers.cmp(
            'response from addNode should have nodeContentId',
            response['nodeContentId'],
            GLOBALS.GRAPH_ID+'-1'
        );
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/getGraphElementsAttributes',
            {'nodes':[response['nodeContentId']]}
        );
      })
      .then(function(e){
        var expected = {nodes:{}, edges:{}};
        expected['nodes'][GLOBALS.GRAPH_ID+"-1"] = {
          "type":"fact",
          "importance":"50",
          "has_icon":"0",
          "active_alternative_id":"0",
          "stickers":[],
          "p_samples": null,
          "value_range": null,
          "value_type": null,
          "alternatives":[
            {
              "label":"fact",
              "reliability":"0.5",
              "p":"",
              "created_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
              "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
            },
            {
              "label":"NOT TRUE: fact",
              "reliability":"0.5",
              "p":"",
              "created_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
              "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
            }
          ]
        };
        return GRASP.TestHelpers.cmp(
          'graph should have new graph node',
          JSON.parse(e),
          expected
        );
      });
};