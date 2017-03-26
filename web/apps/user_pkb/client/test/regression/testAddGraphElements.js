TEST_NAME='testBackend';
SUBTEST_NAME='testAddGraphElements';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph (id=2) adding two nodes and edge between them
 */
// test run
var graphId=2;
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  return  p.publish(['request_for_graph_element_content_change',{
    "type": "addNode",
    "graphId": graphId,
    "element": {
      "id": "0",
      "nodeContentId": null,
      "label": "fact",
      "type": "fact",
      "reliability": 99,
      "importance": 50,
      "stickers": []
    }
  }], ['request_for_graph_element_content_change',{
    "type": "addNode",
    "graphId": graphId,
    "element": {
      "id": "1",
      "nodeContentId": null,
      "label": "proposition",
      "type": "proposition",
      "reliability": 99,
      "importance": 50,
      "stickers": []
    }
  }])
  .then(function(node1Content, node2Content){
    console.log(node1Content, node2Content);
    return p.publish(["request_for_graph_model_change", {
      graphId: graphId,
      type: 'addNode',
      parentNodeId: null,
      nodeContentId: node1Content.nodeContentId
    }],
    ["request_for_graph_model_change", {
      graphId: graphId,
      type: 'addNode',
      parentNodeId: null,
      nodeContentId: node2Content.nodeContentId
    }]);
  })
  .then(function(e){
    return p.publish(['load_graph_models'])
  })
  .then(function(e){
    return p.publish(['get_graph_models'])
  })
  .then(function(e){
    console.log(e[graphId].getNodes());
    return Promise.resolve();
    /*
    GRASP.TestHelpers.cmp(
        'graph should have new graph node',
        graphModel.getNodes(),
        true
    );
    */
  });
};