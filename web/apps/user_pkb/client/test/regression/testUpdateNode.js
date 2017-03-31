TEST_NAME='testBackend';
SUBTEST_NAME='testUpdateNode';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph (id=2) changing node
 */
// test run
var graphId=2;
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  return  GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/updateGraphElementContent',
      {
        "graphId":graphId,
          "type":"updateNodeAttribute",
          "nodeContentId":graphId + "-1",
          "node_alternative_id":"0",
          "nodeAttribute":{
            "name":"label",
            "value":"123"
          }
      })
      .then(function(e){
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/getGraphElementsAttributes',
            {'nodes':[graphId + "-1"]}
        );
      })
      .then(function(e){
        console.log(e);
        return GRASP.TestHelpers.cmp(
            'node label should be updated',
            JSON.parse(e),
            {
              "nodes":{
                "2-1":{
                  "type":"fact",
                  "importance":"50",
                  "has_icon":"0",
                  "active_alternative_id":"0",
                  "stickers":null,
                  "alternatives":[
                    {
                      "label":"123",
                      "reliability":"50",
                      "p":"",
                      "created_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                      "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                    },
                    {
                      "label":"NOT TRUE: fact",
                      "reliability":"50",
                      "p":"",
                      "created_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                      "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                    }
                  ]
                }
              },
              "edges":[]
            }
        );
      });
};