TEST_NAME = TEST_NAME || 'testBackend';
GRASP_TEST_DATA[TEST_NAME] = {
  'repository_get_graphs_model_settings':{
    "1": {
      "name": "newGraph",
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
    "2": {
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
  }
}