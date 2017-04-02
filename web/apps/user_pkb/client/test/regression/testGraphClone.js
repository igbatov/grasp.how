TEST_NAME='testBackend';
SUBTEST_NAME='testGraphClone';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph cloning
 */
// test run
var graphId=1;
var cloneGraphId=2;
var original={};
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  return  addSource()
      /** first of all retrieve original graph to compare it then with cloned one */
      .then(function(){
        return getGraphData(graphId, 2);
      })
      .then(function(e){
        original = e;
        return Promise.resolve();
      })
      .then(function(){
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/logout'
        );
      })
      .then(function(){
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/createTestUser?dbSchemaFromUserId='+dbSchemaFromUserId
        )
        .then(function(loginData){
          console.log(loginData)
          loginData = JSON.parse(loginData);
          var userName = loginData['username'];
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              window.location.origin+'/loginTestUser?username='+userName
          ).then(function(){
            return GRASP.TestHelpers.fetch(
                TEST_NAME,
                window.location.origin+'/cloneGraph/'+graphId
            );
          }).then(function(){
            return getGraphData(cloneGraphId, 1);
          }).then(function(e){
            var clone = e;
            // substitute nodeContentId with respect to new graphId
            GRASP.TestHelpers.substituteKeys(original, [graphId+'-1', graphId+'-2'], [cloneGraphId+"-1",cloneGraphId+"-2"]);
            GRASP.TestHelpers.substituteKeys(
                original,
                ['{\"'+graphId+'-1\":\"0\"}', '{\"'+graphId+'-1\":\"1\"}'],
                ['{\"'+cloneGraphId+'-1\":\"0\"}', '{\"'+cloneGraphId+'-1\":\"1\"}']
            );
            GRASP.TestHelpers.substituteKeys(
                original,
                ['{\"'+graphId+'-2\":\"0\"}', '{\"'+graphId+'-2\":\"1\"}'],
                ['{\"'+cloneGraphId+'-2\":\"0\"}', '{\"'+cloneGraphId+'-2\":\"1\"}']
            );
            GRASP.TestHelpers.substituteValues(original, [graphId+'-1', graphId+'-2'], [cloneGraphId+"-1",cloneGraphId+"-2"]);
            GRASP.TestHelpers.substituteFields(original, ['created_at', 'updated_at'], ["",""]);
            var list = original.nodeContent[cloneGraphId+'-1'].alternatives[0].list;
            GRASP.TestHelpers.substituteKeys(list, ['2'], ['3']);
            GRASP.TestHelpers.substituteFields(
                list['3'],
                ['auth_id','id', 'source_id','cloned_from_auth_id','cloned_from_id'],
                ['2','3','4','1','3']
            );
            GRASP.TestHelpers.substituteFields(clone, ['created_at', 'updated_at'], ["",""]);
            GRASP.TestHelpers.cmp(
                'clone of graph must be equal to original one (but use another graphId)',
                clone,
                original
            );
            return Promise.resolve();
          });
        });
      });

  function getGraphData(graphId, historyStep){
    var graph={};
    var nodeContent={};
    var elementAttributes={};

    var data = {};
    data[graphId]=historyStep;
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/getGraphsHistoryChunk',
        data
    )
    .then(function(e){
      console.log(e);
      graph.elements = JSON.parse(e)[0]['elements'];
      graph.node_mapping = JSON.parse(e)[0]['node_mapping'];
      return Promise.resolve();
    })
    .then(function(){
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          '/getGraphNodeContent',
          {"graphId":graphId,"nodeContentIds":[graphId+"-1",graphId+"-2"]}
      );
    })
    .then(function(e){
      console.log(e);
      nodeContent = JSON.parse(e);
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          '/getGraphElementsAttributes',
          {"nodes":[graphId+"-1",graphId+"-2"],"edges":graphId+["-1"]}
      );
    })
    .then(function(e){
      console.log(e);
      elementAttributes = JSON.parse(e);
      return Promise.resolve();
    })
    .then(function(){
      return Promise.resolve({
        graph: graph,
        nodeContent: nodeContent,
        elementAttributes: elementAttributes
      });
    });
  }

  function addSource() {
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/updateGraphElementContent',
        {
          "type": "node_list_add_request",
          "graphId": graphId,
          "nodeContentId": graphId + "-1",
          "node_alternative_id": "0",
          "nodeType": "fact",
          "item": {
            "source_type": "article",
            "comment": "fgh",
            "name": "123",
            "url": "qwe",
            "author": "asd",
            "editor": "zxc",
            "publisher": "Science",
            "publisher_reliability": 6,
            "scopus_title_list_id": "30069",
            "publish_date": "1982-01-01",
            "pages": "rty",
            "source_id": "",
            "id": ""
          }
        })
  }
};