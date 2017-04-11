TEST_NAME='testBackend';
SUBTEST_NAME='testSources';
var p = Modules['Publisher'];
if (typeof(GRASP[TEST_NAME]) == 'undefined') GRASP[TEST_NAME] = {};
/**
 * Test publisher finder
 */
// test run
GRASP[TEST_NAME][SUBTEST_NAME] = function testSources(){
  return  GRASP.TestHelpers.fetch(
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
                "auth_id": "1",
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
                "source_id": "3"
              },
              {
                "auth_id": "1",
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
      });
};