TEST_NAME='testBackend';
SUBTEST_NAME='testCloneUpdate';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph (id=1) adding two nodes and edge between them
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  var graphId = 1;
  var cloneGraphId = 2;
  var diffGraphId = "diff_"+graphId+"_"+cloneGraphId;
  var newNodeContentId = null;
  var newEdgeContentId = null;
  var currentHistoryStep = 1;
  var originalSettings = null;
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
              "type":"updateNodeText",
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
        /** check diff graph timeline */
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/getGraphsHistoryTimeline',
            {"ids":[diffGraphId]}
        )
      })
      .then(function(e){
        var standard={};
        standard[diffGraphId] = [GRASP.TestHelpers.likeTimestamp()];
        GRASP.TestHelpers.cmp(
            'diff graph history timeline',
            JSON.parse(e),
            standard
        );
        return Promise.resolve();
      })
      .then(function(){
        /** check diff graph history chunk */
        var r = {};
        r[diffGraphId] = 0;
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/getGraphsHistoryChunk',
            r
        )
      })
      .then(function(e){
        GRASP.TestHelpers.cmp(
            'diff graph history chunk',
            JSON.parse(e),
            [
              {
                "graphId": diffGraphId,
                "step": 0,
                "timestamp": GRASP.TestHelpers.likeTimestamp(),
                "elements": {
                  "nodes": {
                    "1": {
                      "id": 1,
                      "nodeContentId": graphId + "-2/-"
                    },
                    "2": {
                      "id": 2,
                      "nodeContentId": "-/" + cloneGraphId + "-3"
                    },
                    "3": {
                      "id": 3,
                      "nodeContentId": graphId + "-1/" + cloneGraphId + "-1"
                    }
                  },
                  "edges": {
                    "1": {
                      "source": 1,
                      "target": 3,
                      "edgeContentId": graphId + "-1/-",
                      "id": 1
                    },
                    "2": {
                      "source": 2,
                      "target": 3,
                      "edgeContentId": "-/" + cloneGraphId + "-2",
                      "id": 2
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
                    "1": {
                      "id": 1,
                      "x": 216,
                      "y": 321
                    },
                    "2": {
                      "id": 2,
                      "x": 216,
                      "y": 221
                    },
                    "3": {
                      "id": 3,
                      "x": 165,
                      "y": 406
                    }
                  }
                }
              }
            ]
        );
        return Promise.resolve();
      })
      .then(function(){
        /** check diff graph history chunk */
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/getGraphSettings',
            [graphId]
        );
      })
      .then(function(e){
        originalSettings = JSON.parse(e)[graphId];
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/getGraphSettings',
            [diffGraphId]
        );
      })
      .then(function(e){
        originalSettings['skin']['node']['attr']['stickers'] = {
          "bayes_error": new GRASP.TestHelpers.likeRegexp('^<svg (.*)svg>$'),
          "absent": new GRASP.TestHelpers.likeRegexp('^<svg (.*)svg>$'),
          "added": new GRASP.TestHelpers.likeRegexp('^<svg (.*)svg>$'),
          "modified": new GRASP.TestHelpers.likeRegexp('^<svg (.*)svg>$'),
          "unmodified": new GRASP.TestHelpers.likeRegexp('^<svg (.*)svg>$'),
        };
        originalSettings['position'] = 'rightGraphView';
            GRASP.TestHelpers.cmp(
          'diff graph settings',
          JSON.parse(e)[diffGraphId],
          originalSettings
        );
        return Promise.resolve();
      })
      .then(function(e){
        var diffNodeIds = [graphId + "-2/-", "-/" + cloneGraphId + "-3", graphId + "-1/" + cloneGraphId + "-1"];
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/getGraphElementsAttributes',
            {
              nodes:diffNodeIds,
              edges:[graphId + "-1/-", "-/" + cloneGraphId + "-2"]
            }
        );
      })
      .then(function(e){
        GRASP.TestHelpers.cmp(
            'diff graph element attributes',
            JSON.parse(e),
            {
              "nodes": {
                "1-2/-": {
                  "type": "proposition",
                  "importance": "50",
                  "has_icon": "0",
                  "active_alternative_id": "0",
                  "stickers": [
                    "absent"
                  ],
                  "alternatives": [
                    {
                      "label": "proposition",
                      "reliability": "50",
                      "p": "",
                      "created_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                      "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                    },
                    {
                      "label": "NOT TRUE: proposition",
                      "reliability": "50",
                      "p": "",
                      "created_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                      "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                    }
                  ],
                  "nodeContentId": "1-2/-"
                },
                "-/2-3": {
                  "type": "proposition",
                  "importance": "50",
                  "has_icon": "0",
                  "active_alternative_id": "0",
                  "alternatives": [
                    {
                      "label": "proposition",
                      "reliability": "50",
                      "p": "",
                      "created_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                      "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                    },
                    {
                      "label": "NOT TRUE: proposition",
                      "reliability": "50",
                      "p": "",
                      "created_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                      "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                    }
                  ],
                  "nodeContentId": "-/2-3",
                  "stickers": [
                    "added"
                  ]
                },
                "1-1/2-1": {
                  "type": "fact",
                  "importance": "32",
                  "has_icon": "0",
                  "active_alternative_id": "1",
                  "stickers": [
                    "modified"
                  ],
                  "alternatives": [
                    {
                      "label": "123",
                      "reliability": "1",
                      "p": {
                        "{\"2-2\":\"0\"}": "1",
                        "{\"2-2\":\"1\"}": "0.3"
                      },
                      "created_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                      "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                    },
                    {
                      "label": "NOT TRUE: fact",
                      "reliability": "50",
                      "p": {
                        "{\"2-2\":\"0\"}": "0",
                        "{\"2-2\":\"1\"}": "0.7"
                      },
                      "created_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                      "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                    }
                  ],
                  "nodeContentId": "1-1/2-1"
                }
              },
              "edges": {
                "1-1/-": {
                  "edgeContentId": "1-1/-",
                  "type": "causal",
                  "label": "causal",
                  "created_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                  "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                },
                "-/2-2": {
                  "edgeContentId": "-/2-2",
                  "type": "causal",
                  "label": "causal",
                  "created_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                  "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                }
              }
            }
        );
        return Promise.resolve();
      })
      .then(function(){
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/getGraphNodeContent',
            {"graphId":diffGraphId,"nodeContentIds":[graphId + "-1/" + cloneGraphId + "-1"]}
        );
      })
      .then(function (e) {
        GRASP.TestHelpers.cmp(
            'diff graph node content text',
            JSON.parse(e)[graphId + "-1/" + cloneGraphId + "-1"]['alternatives'][0]['text'],
            "- 123\n+ bbb\n"
        );

        GRASP.TestHelpers.cmp(
            'diff graph node content list',
            JSON.parse(e)[graphId + "-1/" + cloneGraphId + "-1"]['alternatives'][0]['list'],
            {
              "3": {
                "id": "3",
                "auth_id": "2",
                "source_type": "article",
                "field_type": "",
                "name": "123",
                "url": "qwe",
                "author": "asd",
                "editor": "zxc",
                "publisher": "Science",
                "publisher_reliability": "6",
                "scopus_title_list_id": "30069",
                "publish_date": "1982-01-01",
                "comment": "fgh",
                "cloned_from_id": "3",
                "cloned_from_auth_id": "1",
                "created_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                "source_id": "4",
                "pages": "rty"
              }
            }
        );

        return Promise.resolve();
      });


};