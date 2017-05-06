TEST_NAME='testBackend';
SUBTEST_NAME='testAddEdge';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph adding two nodes and edge between them
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  return GRASP.TestHelpers.fetch(
      TEST_NAME,
      '/updateGraphElementContent',
      {
        "graphId":GRAPH_ID,
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
      })
      .then(function(e){
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/updateGraphElementContent',
            {
              "graphId":GRAPH_ID,
              "type":"addEdge",
              "edge":{
                "edgeContentId":"",
                "label":"causal",
                "type":"causal"
              }
            }
        );
      })
      .then(function(e){
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/getGraphElementsAttributes',
            {'nodes':[GRAPH_ID + "-1", GRAPH_ID + "-2"],'edges':[GRAPH_ID + "-1"]}
        );
      })
      .then(function(e){
        var expected = {nodes:{},edges:{}};
        expected['nodes'][GRAPH_ID + '-1'] = {
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
        };
        expected['nodes'][GRAPH_ID + '-2'] = {
          "type":"proposition",
          "importance":"50",
          "has_icon":"0",
          "active_alternative_id":"0",
          "stickers":null,
          "alternatives":[
            {
              "label":"proposition",
              "reliability":"50",
              "p":"",
              "created_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
              "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
            },
            {
              "label":"NOT TRUE: proposition",
              "reliability":"50",
              "p":"",
              "created_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
              "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
            }
          ]
        };
        expected['edges'][GRAPH_ID + '-1'] = {
          "edgeContentId":GRAPH_ID+"-1",
          "type":"causal",
          "label":"causal",
          "created_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
          "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
        };
        GRASP.TestHelpers.cmp(
            'element attributes should have both nodes and edge',
            JSON.parse(e),
            expected
        );
        return Promise.resolve();
      })
      .then(function(e) {
        return GRASP.TestHelpers.fetch(
          TEST_NAME,
          '/addGraphHistoryItem',
          {
            "graphId": GRAPH_ID,
            "step": 2,
            "timestamp": Math.round((new Date).getTime() / 1000),
            "elements": {
              "nodes": {
                "0": {
                  "id": 0,
                  "nodeContentId": GRAPH_ID + "-1"
                },
                "1": {
                  "id": 1,
                  "nodeContentId": GRAPH_ID + "-2"
                }
              },
              "edges": {
                "0": {
                  "id": 0,
                  "source": 1,
                  "target": 0,
                  "edgeContentId": GRAPH_ID + "-1"
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
                  "y": 321
                }
              }
            }
          }
        )
      })
      .then(function(e){
        var data = {};
        data[GRAPH_ID]=2;
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/getGraphsHistoryChunk',
            data
        );
      })
      .then(function(e){
        GRASP.TestHelpers.cmp(
          'history chunk should contain nodes',
          JSON.parse(e),
          [
            {
              "graphId":GRAPH_ID,
              "step":2,
              "timestamp":GRASP.TestHelpers.likeTimestamp(),
              "elements":{
                "nodes":[
                  {
                    "id":0,
                    "nodeContentId":GRAPH_ID+"-1"
                  },
                  {
                    "id":1,
                    "nodeContentId":GRAPH_ID+"-2"
                  }
                ],
                "edges":[
                  {
                    "id":0,
                    "source":1,
                    "target":0,
                    "edgeContentId":GRAPH_ID+"-1"
                  }
                ]
              },
              "node_mapping":{
                "area":{
                  "id":"graphViews",
                  "centerX":167,
                  "centerY":349,
                  "width":335,
                  "height":571
                },
                "mapping":[
                  {
                    "id":0,
                    "x":165,
                    "y":406
                  },
                  {
                    "id":1,
                    "x":216,
                    "y":321
                  }
                ]
              }
            }
          ]
        );
        return Promise.resolve();
      });
};