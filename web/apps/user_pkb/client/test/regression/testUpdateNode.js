TEST_NAME='testBackend';
SUBTEST_NAME='testUpdateNode';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test graph (id=1) changing node
 */
// test run
var graphId=1;
GRASP[TEST_NAME][SUBTEST_NAME] = function testEmptyGraphCreation(){
  return testTextChange('123')
      .then(function(){
        return testAddSource();
      }).then(function(){
        return testUpdateSource();
      }).then(function(){
        return testRemoveSource();
      }).then(function(){
        return testAttributeChange('label', '123');
      }).then(function(){
        return testAttributeChange('importance', '32');
      }).then(function(){
        return testAttributeChange('active_alternative_id', '1');
      }).then(function(){
        return testAttributeChange('reliability', '1');
      }).then(function(){
        return testAttributeChange('type', 'proposition');
      }).then(function(){
        // return node back to fact for further tests
        return testAttributeChange('type', 'fact');
      }).then(function(){
        return testAttributeChange('p', '{}');
      }).then(function(){
        return testUpdateNodeAlternativesP();
      });

  function testUpdateNodeAlternativesP(){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/updateGraphElementContent',
        {
          "graphId":graphId,
          "type":"updateNodeAlternativesP",
          "nodeContentId":graphId + "-1",
          "alternatives":{
            "0":{
              "{\"1-2\":\"0\"}":"1",
              "{\"1-2\":\"1\"}":"0.3"
            },
            "1":{
              "{\"1-2\":\"0\"}":"0",
              "{\"1-2\":\"1\"}":"0.7"
            }
          }
        }
        ).then(function(e){
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              '/getGraphNodeContent',
              {"graphId":graphId,"nodeContentIds":[graphId + "-1"]}
          );
        })
        .then(function(e){
          GRASP.TestHelpers.cmp(
              'testRemoveSource: node alternative 0 should contain valid p',
              JSON.parse(e)[graphId+'-1']['alternatives'][0]['p'],
              {
                "{\"1-2\":\"0\"}":"1",
                "{\"1-2\":\"1\"}":"0.3"
              }
          );

          GRASP.TestHelpers.cmp(
              'testRemoveSource: node alternative 1 should contain valid p',
              JSON.parse(e)[graphId+'-1']['alternatives'][1]['p'],
              {
                "{\"1-2\":\"0\"}":"0",
                "{\"1-2\":\"1\"}":"0.7"
              }
          );

          return Promise.resolve();
        });
  }

  function testRemoveSource(){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/updateGraphElementContent',
        {
          "type":"node_list_remove_request",
          "graphId":graphId,
          "nodeContentId":graphId+"-1",
          "node_alternative_id":"0",
          "nodeType":"fact",
          "itemId":"1"
        }
        ).then(function(e){
          GRASP.TestHelpers.cmp(
              'testRemoveSource: response from node_list_add_request should have zero alternative reliability',
              JSON.parse(e),
              {"result":"SUCCESS","reliability":0}
          );
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              '/getGraphNodeContent',
              {"graphId":graphId,"nodeContentIds":[graphId + "-1"]}
          );
        })
        .then(function(e){
          GRASP.TestHelpers.cmp(
              'testRemoveSource: node alternative list should contain updated source',
              JSON.parse(e)[graphId+'-1']['alternatives'][0]['list'],
              []
          );

          return Promise.resolve();
        });
  }

  function testUpdateSource(){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/updateGraphElementContent',
        {
          "type":"node_list_update_request",
          "graphId":graphId,
          "nodeContentId":graphId + "-1",
          "node_alternative_id":"0",
          "item":{
            "id":"1",
            "source_type":"meta-article",
            "field_type":"",
            "name":"qqq",
            "url":"www",
            "author":"eee",
            "editor":"rrr",
            "publisher":"Scire",
            "publisher_reliability":3,
            "scopus_title_list_id":"30181",
            "publish_date":"2001-01-01",
            "comment":"sss",
            "cloned_from_id":null,
            "cloned_from_auth_id":null,
            "created_at":null,
            "updated_at":"2017-04-01 11:12:15",
            "source_id":"",
            "pages":"aaa",
          },
          "nodeType":"fact"
        }
        ).then(function(e){
           GRASP.TestHelpers.cmp(
              'response from node_list_add_request should have alternative new reliability',
              JSON.parse(e),
              {"result":"SUCCESS","reliability":30}
          );
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              '/getGraphNodeContent',
              {"graphId":graphId,"nodeContentIds":[graphId + "-1"]}
          );
        })
        .then(function(e){
          GRASP.TestHelpers.cmp(
              'node alternative list should contain updated source',
              JSON.parse(e)[graphId+'-1']['alternatives'][0]['list'],
              {
                "1":{
                  "id":"1",
                  "auth_id":"1",
                  "source_type":"meta-article",
                  "field_type":"",
                  "name":"qqq",
                  "url":"www",
                  "author":"eee",
                  "editor":"rrr",
                  "publisher":"Scire",
                  "publisher_reliability":3,
                  "scopus_title_list_id":"30181",
                  "publish_date":"2001-01-01",
                  "comment":"sss",
                  "cloned_from_id":null,
                  "cloned_from_auth_id":null,
                  "source_id":"2",
                  "pages":"aaa",
                  "created_at":null,
                  "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS()
                }
              }
          );

          return Promise.resolve();
        })
        .then(function(){
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              '/getUserSources',
              {}
          );

        })
        .then(function(e){
          GRASP.TestHelpers.cmp(
              'user sources should contain two items',
              JSON.parse(e),
              {
                "1":{
                  "id":"1",
                  "auth_id":"1",
                  "source_type":"article",
                  "field_type":"",
                  "name":"123",
                  "url":"qwe",
                  "author":"asd",
                  "editor":"zxc",
                  "publisher":"Science",
                  "publisher_reliability":"6",
                  "scopus_title_list_id":"30069",
                  "publish_date":"1982-01-01",
                  "comment":"fgh",
                  "cloned_from_id":null,
                  "cloned_from_auth_id":null,
                  "created_at":null,
                  "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                  "usedIn":[

                  ]
                },
                "2":{
                  "id":"2",
                  "auth_id":"1",
                  "source_type":"meta-article",
                  "field_type":"",
                  "name":"qqq",
                  "url":"www",
                  "author":"eee",
                  "editor":"rrr",
                  "publisher":"Scire",
                  "publisher_reliability":"3",
                  "scopus_title_list_id":"30181",
                  "publish_date":"2001-01-01",
                  "comment":"sss",
                  "cloned_from_id":null,
                  "cloned_from_auth_id":null,
                  "created_at":null,
                  "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                  "usedIn":{
                    "1":{
                      "graphId":graphId,
                      "graphName":"testGraph",
                      "usedInNodes":[
                        {
                          "nodeId":graphId+"-1",
                          "label":"fact"
                        }
                      ]
                    }
                  }
                }
              }
          );
        });

  }

  function testAddSource(){
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
        .then(function(e){
          GRASP.TestHelpers.cmp(
              'response from node_list_add_request should have id of list item and alternative new reliability',
              JSON.parse(e),
              {"result":"SUCCESS","id":1,"reliability":60}
          );
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              '/getGraphNodeContent',
              {"graphId":graphId,"nodeContentIds":[graphId + "-1"]}
          );
        })
        .then(function(e){
          GRASP.TestHelpers.cmp(
              'node alternative list should contain source',
              JSON.parse(e)[graphId+'-1']['alternatives'][0]['list'],
              {
                "1":{
                  "id":"1",
                  "auth_id":"1",
                  "source_type":"article",
                  "field_type":"",
                  "name":"123",
                  "url":"qwe",
                  "author":"asd",
                  "editor":"zxc",
                  "publisher":"Science",
                  "publisher_reliability":"6",
                  "scopus_title_list_id":"30069",
                  "publish_date":"1982-01-01",
                  "comment":"fgh",
                  "cloned_from_id":null,
                  "cloned_from_auth_id":null,
                  "created_at":null,
                  "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                  "source_id":"1",
                  "pages":"rty"
                }
              }
          );
          return Promise.resolve();

        })
        .then(function(){
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              '/getUserSources',
              {}
          );

        })
        .then(function(e){
          GRASP.TestHelpers.cmp(
              'user sources should contain one item',
              JSON.parse(e),
              {
                "1":{
                  "id":"1",
                  "auth_id":"1",
                  "source_type":"article",
                  "field_type":"",
                  "name":"123",
                  "url":"qwe",
                  "author":"asd",
                  "editor":"zxc",
                  "publisher":"Science",
                  "publisher_reliability":"6",
                  "scopus_title_list_id":"30069",
                  "publish_date":"1982-01-01",
                  "comment":"fgh",
                  "cloned_from_id":null,
                  "cloned_from_auth_id":null,
                  "created_at":null,
                  "updated_at":GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                  "usedIn":{
                    "1":{
                      "graphId":graphId,
                      "graphName":"testGraph",
                      "usedInNodes":[
                        {
                          "nodeId":graphId+"-1",
                          "label":"fact"
                        }
                      ]
                    }
                  }
                }
              }
          );
        });
  }

  function testTextChange(value){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/updateGraphElementContent',
        {
          "graphId":graphId,
          "type":"updateNodeAttribute",
          "nodeContentId":graphId + "-1",
          "node_alternative_id":"0",
          "text":value
        })
        .then(function(e){
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              '/getGraphNodeContent',
              {"graphId":graphId,"nodeContentIds":[graphId + "-1"]}
          );
        })
        .then(function(e){
          return GRASP.TestHelpers.cmp(
              'node text should be updated',
              JSON.parse(e)[graphId+'-1']['alternatives'][0]['text'],
              value
          );
        });
  }

  function testAttributeChange(name, value){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/updateGraphElementContent',
        {
          "graphId":graphId,
          "type":"updateNodeAttribute",
          "nodeContentId":graphId + "-1",
          "node_alternative_id":"0",
          "nodeAttribute":{
            "name":name,
            "value":value
          }
        })
        .then(function(e){
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              '/getGraphElementsAttributes',
              {'nodes':[graphId + "-1"]}
          );
        })
        .then(function(e){
          var field = ['p','label','reliability'].indexOf(name) !== -1 ?
              JSON.parse(e)['nodes'][graphId+'-1']['alternatives'][0] : JSON.parse(e)['nodes'][graphId+'-1'];
          return GRASP.TestHelpers.cmp(
              'node '+name+' should be updated',
              field[name],
              value
          );
        });
  }
};