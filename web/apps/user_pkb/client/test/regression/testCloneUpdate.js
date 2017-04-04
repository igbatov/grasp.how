TEST_NAME='testBackend';
SUBTEST_NAME='testCloneUpdate';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph (id=1) adding two nodes and edge between them
 */
// test run
var graphId=2;
var newNodeContentId=null;
var newEdgeContentId=null;
var currentHistoryStep=1;
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  /** remove node with nodeId=2 */
  currentHistoryStep++;
  return  GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/addGraphHistoryItem',
      {
        "graphId":graphId,
        "step":currentHistoryStep,
        "timestamp":Math.round((new Date).getTime() / 1000),
        "elements":{
          "nodes":{
            "0":{
              "id":0,
              "nodeContentId":graphId+"-1"
            }
          },
          "edges":{

          }
        },
        "node_mapping":{
          "area":{
            "id":"graphViews",
            "centerX":187,
            "centerY":349,
            "width":375,
            "height":571
          },
          "mapping":{
            "0":{
              "id":0,
              "x":157,
              "y":398
            }
          }
        }
      })
      .then(function(e){
        /** change nodeId=1 text */
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/updateGraphElementContent',
            {
              "graphId":graphId,
              "type":"updateNodeAttribute",
              "nodeContentId":graphId + "-1",
              "node_alternative_id":"0",
              "text":"bbb"
            });
      })
      .then(function(e){
        /** add new node */
        GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/updateGraphElementContent',
            {
              "graphId":graphId,
              "type":"addNode",
              "node":{
                "nodeContentId":"",
                "active_alternative_id":0,
                "alternatives":{
                  "0":{
                    "label":"proposition",
                    "p":{},
                    "reliability":50,
                    "text":"",
                    "list":[]
                  },
                  "1":{
                    "label":"NOT TRUE: proposition",
                    "p":{},
                    "reliability":50,
                    "text":"",
                    "list":[]
                  }
                },
                "type":"proposition",
                "importance":50,
                "icon":null,
                "stickers":null
              }
            }
        );
      })
      .then(function(e){
        newNodeContentId = JSON.parse(e)['nodeContentId'];
        /** add new edge */
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/updateGraphElementContent',
            {
              "graphId":graphId,
              "type":"addEdge",
              "edge":{
                "edgeContentId":"",
                "label":"causal",
                "type":"causal"
              }
            }
        )
      })
      .then(function(e){
        newEdgeContentId = JSON.parse(e)['edgeContentId'];
        /** add new graph */
        currentHistoryStep++;
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/addGraphHistoryItem',
            {
              "graphId": graphId,
              "step": currentHistoryStep,
              "timestamp": Math.round((new Date).getTime() / 1000),
              "elements": {
                "nodes": {
                  "0": {
                    "id": 0,
                    "nodeContentId": graphId + "-1"
                  },
                  "1": {
                    "id": 1,
                    "nodeContentId": newNodeContentId
                  }
                },
                "edges": {
                  "0": {
                    "id": 0,
                    "source": 1,
                    "target": 0,
                    "edgeContentId": newEdgeContentId
                  }
                }
              },
              "node_mapping": {
                "area": {
                  "id": "graphViews",
                  "centerX": 167,
                  "centerY": 349,
                  "width": 335,
                  "height": 571
                },
                "mapping": {
                  "0": {
                    "id": 0,
                    "x": 165,
                    "y": 406
                  },
                  "1": {
                    "id": 1,
                    "x": 216,
                    "y": 221
                  }
                }
              }
            }
        )
      })
      .then(function(){
        /** login under user #1 */
      })
      .then(function(){
        /** check clones */
      })
      .then(function(){
        /** check diff graph */
      })
      .then(function(){
        /** check nodeId=1 diff text */
      });


};