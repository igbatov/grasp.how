<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20170917ChangeContentHistoryGraphIdIndex extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history DROP INDEX graph_id;'
      );
      $this->db->exec(
          null,
          'CREATE INDEX node_content_id ON yovalue_user_template.node_content_history (graph_id, local_content_id)'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history DROP INDEX graph_id'
      );
      $this->db->exec(
          $authId,
       'CREATE INDEX node_content_id ON node_content_history (graph_id, local_content_id)'
      );
    }
  }


  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history DROP INDEX node_content_id'
      );
      $this->db->exec(
          null,
          'CREATE UNIQUE INDEX graph_id ON yovalue_user_template.node_content_history (graph_id, local_content_id)'
      );
    } else {
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content_history DROP INDEX node_content_id'
      );
      $this->db->exec(
        $authId,
       'CREATE UNIQUE INDEX graph_id ON node_content_history (graph_id, local_content_id)'
      );
    }
  }
}
