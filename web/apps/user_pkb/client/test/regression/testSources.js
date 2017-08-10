TEST_NAME='testBackend';
SUBTEST_NAME='testSources';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test publisher finder
 */
// test run
(function(SUBTEST_NAME){
  GRASP[TEST_NAME][SUBTEST_NAME] = function testSources(){
    return GRASP.TestHelpers.fetch(
        TEST_NAME,
        '/findSources',
        // this source was added in testUpdateNode
        {"source_type":"article","substring":"123"}
    )
        .then(function(e){
          var response = JSON.parse(e);
          GRASP.TestHelpers.cmp(
              'response from findSources',
              response,
              [
                {
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
                  "cloned_from_id": null,
                  "cloned_from_auth_id": null,
                  "created_at": null,
                  "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                  "order": 0,
                  "title": "123",
                  "source_id": "1"
                }
              ]
          );
          return Promise.resolve();
        })
        .then(function(e){
          return GRASP.TestHelpers.fetch(
              TEST_NAME,
              '/updateSource',
              {
                "comment":"new comment",
                "source_type":"meta-article",
                "name":"new source name",
                "url":"http://url",
                "author":"",
                "editor":"",
                "publisher":"",
                "publisher_reliability":"6",
                "scopus_title_list_id":"null",
                "publish_date":"",
                "id":"1"
              }
          )
              .then(function(){
                return GRASP.TestHelpers.fetch(
                    TEST_NAME,
                    '/getUserSources',
                    {}
                ).then(function(e){
                  GRASP.TestHelpers.cmp(
                      SUBTEST_NAME+': user sources must be updated',
                      JSON.parse(e)[0],
                      {
                        "id": "1",
                        "source_type": "meta-article",
                        "field_type": "",
                        "name": "new source name",
                        "url": "http://url",
                        "author": "",
                        "editor": "",
                        "publisher": "",
                        "publisher_reliability": "6",
                        "scopus_title_list_id": null,
                        "publish_date": "",
                        "comment": "new comment",
                        "cloned_from_id": null,
                        "cloned_from_auth_id": null,
                        "created_at": null,
                        "updated_at": GRASP.TestHelpers.likeYYYYMMDD_HHMMSS(),
                        "usedIn": []
                      }
                  );
                });
              })
              .then(function(){
                return GRASP.TestHelpers.fetch(
                    TEST_NAME,
                    '/removeUserSources',
                    ["1"]
                ).then(function(e){
                  return GRASP.TestHelpers.fetch(
                      TEST_NAME,
                      '/getUserSources',
                      {}
                  ).then(function(e){
                    GRASP.TestHelpers.cmp(
                        SUBTEST_NAME+': user sources must be removed',
                        GRASP.getObjectLength(JSON.parse(e)),
                        1
                    );
                  });
                });

              })
        });
  };
})(SUBTEST_NAME);
