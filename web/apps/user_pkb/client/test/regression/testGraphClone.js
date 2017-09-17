TEST_NAME='testBackend';
SUBTEST_NAME='testGraphClone';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph cloning
 */

// this will be used in testCloneUpdate
var originalGraphId;
var cloneGraphId;
var originalUserName;
var originalUserId;
var cloneUserName;
var cloneUserId;

// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  originalGraphId = GRAPH_ID;
  cloneGraphId = null;
  originalUserName = USERNAME;
  originalUserId = USER_ID;
  cloneUserName = null;
  cloneUserId = null;
  var original = {};
  return  addSource()
      /** first of all retrieve original graph to compare it then with cloned one */
      .then(function(){
        return getGraphData(originalGraphId, 2);
      })
      .then(function(e){
        original = e;
        return Promise.resolve();
      })
      .then(function(){
        return GRASP.TestHelpers.fetch(
            TEST_NAME,
            window.location.origin+'/createTestUser'
        )
        .then(function(loginData){
          console.log(loginData)
          loginData = JSON.parse(loginData);
          cloneUserName = loginData['username'];
          cloneUserId = loginData['id'];
          cloneGraphId = cloneUserId + '.' + originalGraphId.split('.')[1];
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              window.location.origin+'/loginTestUser?username='+cloneUserName
          ).then(function(){
            return GRASP.TestHelpers.fetch(
                TEST_NAME,
                window.location.origin+'/cloneGraph/'+originalGraphId
            );
          }).then(function(){
            return getGraphData(cloneGraphId, 1);
          }).then(function(e){
            var clone = e;
            // substitute nodeContentId with respect to new graphId
            GRASP.TestHelpers.substituteKeys(
                original,
                [originalGraphId+'-1', originalGraphId+'-2'],
                [cloneGraphId+"-1", cloneGraphId+"-2"]
            );
            GRASP.TestHelpers.substituteKeys(
                original,
                ['{\"'+originalGraphId+'-1\":\"0\"}', '{\"'+originalGraphId+'-1\":\"1\"}'],
                ['{\"'+cloneGraphId+'-1\":\"0\"}', '{\"'+cloneGraphId+'-1\":\"1\"}']
            );
            GRASP.TestHelpers.substituteKeys(
                original,
                ['{\"'+originalGraphId+'-2\":\"0\"}', '{\"'+originalGraphId+'-2\":\"1\"}'],
                ['{\"'+cloneGraphId+'-2\":\"0\"}', '{\"'+cloneGraphId+'-2\":\"1\"}']
            );
            GRASP.TestHelpers.substituteValues(
                original,
                [originalGraphId+'-1', originalGraphId+'-2'],
                [cloneGraphId+"-1",cloneGraphId+"-2"]
            );
            GRASP.TestHelpers.substituteFields(original, ['created_at', 'updated_at'], ["",""]);
            var list = original.nodeContent[cloneGraphId+'-1'].alternatives[0].list;
            GRASP.TestHelpers.substituteKeys(list, ['2'], ['1']);
            GRASP.TestHelpers.substituteFields(
                list['1'],
                ['id', 'source_id','cloned_from_auth_id','cloned_from_id'],
                ['1','1',originalUserId,'3']
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
      nodeContent = JSON.parse(e);
      return GRASP.TestHelpers.fetch(
          TEST_NAME,
          '/getGraphElementsAttributes',
          {"nodes":[graphId+"-1",graphId+"-2"],"edges":[graphId+["-1"]]}
      );
    })
    .then(function(e){
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
          "graphId": originalGraphId,
          "nodeContentId": originalGraphId + "-1",
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