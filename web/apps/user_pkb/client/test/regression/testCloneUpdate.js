TEST_NAME='testBackend';
SUBTEST_NAME='testCloneUpdate';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph (id=1) adding two nodes and edge between them
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  var graphId=1;
  var cloneGraphId=2;
  var diffGraphId="diff_"+graphId+"_"+cloneGraphId;
  var newNodeContentId=null;
  var newEdgeContentId=null;
  var currentHistoryStep=1;
  /** remove node with nodeId=2 */
  currentHistoryStep++;
  return  GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/addGraphHistoryItem',
      {
        "graphId":cloneGraphId,
        "step":currentHistoryStep,
        "timestamp":Math.round((new Date).getTime() / 1000),
        "elements":{
          "nodes":{
            "0":{
              "id":0,
              "nodeContentId":cloneGraphId+"-1"
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
              "graphId":cloneGraphId,
              "type":"updateNodeAttribute",
              "nodeContentId":cloneGraphId + "-1",
              "node_alternative_id":"0",
              "text":"bbb"
            });
      })
      .then(function(e){
        /** add new node */
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/updateGraphElementContent',
            {
              "graphId":cloneGraphId,
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
        console.log(e);
        newNodeContentId = JSON.parse(e)['nodeContentId'];
        /** add new edge */
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/updateGraphElementContent',
            {
              "graphId":cloneGraphId,
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
              "graphId": cloneGraphId,
              "step": currentHistoryStep,
              "timestamp": Math.round((new Date).getTime() / 1000),
              "elements": {
                "nodes": {
                  "0": {
                    "id": 0,
                    "nodeContentId": cloneGraphId + "-1"
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
        return GRASP.TestHelpers.fetch(
          TEST_NAME,
          window.location.origin+'/loginTestUser?username='+USERNAME
        );
      })
      .then(function(){
        /** check clones list */
        return GRASP.TestHelpers.fetch(
          TEST_NAME,
          window.location.origin+'/getGraphsCloneList'
        ).then(function(e){
          console.log(JSON.parse(e));
          GRASP.TestHelpers.cmp(
            'clones list must have cloned graph',
            JSON.parse(e),{
            "1": {
              "cloned_from": [],
              "cloned_to": {
                "2": new GRASP.TestHelpers.likeRegexp("^testuser_[a-z0-9]*: testGraph$")
              }
            }
          });
          return Promise.resolve();
        });
      })
      .then(function(){
        /** check diff graph settings*/
        var originalGraphSettings;
        var cloneGraphSettings;
        return GRASP.TestHelpers.fetch(
          TEST_NAME,
          window.location.origin+'/getGraphsModelSettings',
          {"graphIds":[graphId]}
        ).then(function(e){
          originalGraphSettings = JSON.parse(e);
          console.log(e);
          console.log(JSON.parse(e));
        }).then(function(){
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              window.location.origin+'/getGraphsModelSettings',
              {"graphIds":[diffGraphId]}
          )
        }).then(function(e){
          cloneGraphSettings = JSON.parse(e);
          var original = GRASP.clone(originalGraphSettings);
          original[graphId].name = diffGraphId;
          original[graphId].isEditable = false;
          GRASP.TestHelpers.cmp(
              'clone graph settings must be equal to original graph settings',
               cloneGraphSettings[diffGraphId],
               original[graphId]
          );
          return Promise.resolve();
        });
      })
      .then(function(){
        /** check nodeId=1 diff text */
      });


};