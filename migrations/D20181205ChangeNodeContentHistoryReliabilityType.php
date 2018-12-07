<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20181205ChangeNodeContentHistoryReliabilityType extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content_history MODIFY reliability DOUBLE'
      );
    } else {
      // make sure create_at is not null so alter table will not throw notice
      $this->db->exec(
        $authId,
        'UPDATE node_content_history SET created_at = updated_at WHERE created_at IS NULL'
      );
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content_history MODIFY reliability DOUBLE'
      );
    }
  }


  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content_history MODIFY reliability INT(11)'
      );
    } else {
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content_history MODIFY reliability INT(11)'
      );
    }
  }
}
