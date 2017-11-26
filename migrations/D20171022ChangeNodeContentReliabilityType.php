<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20171022ChangeNodeContentReliabilityType extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content MODIFY reliability DOUBLE'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content MODIFY reliability DOUBLE'
      );
    }
  }


  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content MODIFY reliability INT(11)'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content MODIFY reliability INT(11)'
      );
    }
  }
}
