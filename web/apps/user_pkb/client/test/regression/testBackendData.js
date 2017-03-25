TEST_NAME = TEST_NAME || 'testBackend';
GRASP_TEST_DATA[TEST_NAME] = {}
SUBTEST_NAME = 'testEmptyGraphCreation'
GRASP_TEST_DATA[TEST_NAME][SUBTEST_NAME] = {
  'repository_get_graphs_model_settings': {
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
  },
  'repository_get_graphs_history_timeline':{
    "1": new GRASP.TestHelpers.likeRegexp('[0-9]+')
  },
  'repository_get_graphs_model_elements':[
    {
      "graphId": 2,
      "step": 1,
      "timestamp": new GRASP.TestHelpers.likeRegexp('[0-9]+'),
      "elements": {
        "nodes": [],
        "edges": []
      },
      "node_mapping": null
    }
  ],
}