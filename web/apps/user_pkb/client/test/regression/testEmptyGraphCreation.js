TEST_NAME='testBackend';
SUBTEST_NAME='testEmptyGraphCreation'
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};

/**
 * Test empty graph creation
 */
// test run function
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(GLOBALS){
  var testGraphId = null;
  return p.publish(['create_new_graph', {name:'testGraph'}])
  /**
   *  Check that repository_get_graphs_model_settings is OK
   */
      .then(function(){
        return p.publish(['repository_get_graphs_model_settings']);
      })
      .then(function(e){
        testGraphId = Math.max.apply(null, GRASP.getObjectKeys(e))+"";
        GLOBALS.GRAPH_ID = testGraphId;
        GRASP.TestHelpers.cmp(
            'repository_get_graphs_model_settings',
            e[GLOBALS.GRAPH_ID],
            getData('repository_get_graphs_model_settings')
        );
      })
      /**
       *  Check that repository_get_graphs_history_timeline is OK
       */
      .then(function(){
        return p.publish(['repository_get_graphs_history_timeline',{ids:[GLOBALS.GRAPH_ID]}]);
      })
      .then(function(e){
        GRASP.TestHelpers.cmp(
            'repository_get_graphs_history_timeline',
            e[GLOBALS.GRAPH_ID],
            getData('repository_get_graphs_history_timeline')
        );
      })
      /**
       *  Check that repository_get_graphs_model_elements is OK
       */
      .then(function(){
        var data = {}; data[GLOBALS.GRAPH_ID]=1;
        return p.publish(['repository_get_graphs_model_elements',data]);
      })
      .then(function(e){
        GRASP.TestHelpers.cmp(
            'repository_get_graphs_model_elements',
            e ,
           getData('repository_get_graphs_model_elements', {graphId:GLOBALS.GRAPH_ID})
        );
      });
  function getData(name, params) {
    if(name === "repository_get_graphs_model_settings"){
      return {
        "name": "testGraph",
        "isEditable": true,
        "attributes": {
          "isInTrash": false
        },
        "edgeTypes": [
          "link",
          "causal",
          "conditional"
        ],
        "nodeTypes": [
          "fact",
          "proposition",
          "illustration",
          "question",
          "to_read",
          "best_known_practice"
        ],
        "nodeDefaultType": "text",
        "edgeDefaultType": "causal"
      }
    } else if (name === 'repository_get_graphs_history_timeline') {
      return {
        "1": new GRASP.TestHelpers.likeRegexp('[0-9]+')
      }
    } else if (name === "repository_get_graphs_model_elements") {
      return [
        {
          "graphId": params['graphId'],
          "step": 1,
          "timestamp": new GRASP.TestHelpers.likeRegexp('[0-9]+'),
          "elements": {
            "nodes": [],
            "edges": []
          },
          "node_mapping": null
        }
      ]
    }
  }
}