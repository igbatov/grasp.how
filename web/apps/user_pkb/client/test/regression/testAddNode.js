TEST_NAME='testBackend';
SUBTEST_NAME='testAddNode';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph (id=1) adding two nodes and edge between them
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  var graphId=1;
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
      })
      .then(function(e){
        var response = JSON.parse(e);
        GRASP.TestHelpers.cmp(
            'response from addNode should have nodeContentId',
            response['nodeContentId'],
            graphId+'-1'
        );
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/getGraphElementsAttributes',
            {'nodes':[response['nodeContentId']]}
        );
      })
      .then(function(e){
         return GRASP.TestHelpers.cmp(
             'graph should have new graph node',
             JSON.parse(e),
             {
               "nodes":{
                 "1-1":{
                   "type":"fact",
                   "importance":"50",
                   "has_icon":"0",
                   "active_alternative_id":"0",
                   "stickers":null,
                   "alternatives":[
                     {
                       "label":"fact",
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