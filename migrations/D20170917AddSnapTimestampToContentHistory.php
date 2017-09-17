<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20170917AddSnapTimestampToContentHistory extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history ADD snap_timestamp BIGINT UNSIGNED DEFAULT NULL;'
      );
      $this->db->exec(
          null,
          'CREATE INDEX snap_timestamp_idx ON yovalue_user_template.node_content_history (snap_timestamp)'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history ADD snap_timestamp BIGINT UNSIGNED DEFAULT NULL;'
      );
      $this->db->exec(
          $authId,
          'CREATE INDEX snap_timestamp_idx ON node_content_history (snap_timestamp)'
      );
    }
  }


  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history DROP snap_timestamp'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history DROP snap_timestamp'
      );
    }
  }
}
