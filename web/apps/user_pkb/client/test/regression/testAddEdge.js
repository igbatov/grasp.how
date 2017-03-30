TEST_NAME='testBackend';
SUBTEST_NAME='testAddEdge';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph (id=2) adding two nodes and edge between them
 */
// test run
var graphId=2;
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  return GRASP.TestHelpers.fetch(
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
      })
      .then(function(e){
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
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            '/getGraphElementsAttributes',
            {'nodes':[graphId + "-1", graphId + "-2"],'edges':[graphId + "-1"]}
        );
      })
      .then(function(e){
        GRASP.TestHelpers.cmp(
            'element attributes should have both nodes and edge',
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
                },
                "2-2":{
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
                }
              },
              "edges":{
                "2-1":{
                  "edgeContentId":"2-1",
                  "type":"causal",
                  "label":"causal",
                  "created_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                  "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                }
              }
            }
        );
        return Promise.resolve();
      })
      .then(function(e) {
        return GRASP.TestHelpers.fetch(
          TEST_NAME,
          '/addGraphHistoryItem',
          {
            "graphId": graphId,
            "step": 1,
            "timestamp": Math.round((new Date).getTime() / 1000),
            "elements": {
              "nodes": {
                "0": {
                  "id": 0,
                  "nodeContentId": graphId + "-1"
                },
                "1": {
                  "id": 1,
                  "nodeContentId": graphId + "-2"
                }
              },
              "edges": {
                "0": {
                  "id": 0,
                  "source": 1,
                  "target": 0,
                  "edgeContentId": graphId + "-1"
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
        data[graphId]=1;
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
              "graphId":2,
              "step":1,
              "timestamp":GRASP.TestHelpers.likeTimestamp(),
              "elements":{
                "nodes":[],
                "edges":[]
              },
              "node_mapping":null
            },
            {
              "graphId":2,
              "step":1,
              "timestamp":GRASP.TestHelpers.likeTimestamp(),
              "elements":{
                "nodes":[
                  {
                    "id":0,
                    "nodeContentId":"2-1"
                  },
                  {
                    "id":1,
                    "nodeContentId":"2-2"
                  }
                ],
                "edges":[
                  {
                    "id":0,
                    "source":1,
                    "target":0,
                    "edgeContentId":"2-1"
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