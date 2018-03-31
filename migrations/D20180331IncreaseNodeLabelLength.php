<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20180331IncreaseNodeLabelLength extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content MODIFY label varchar(8000) DEFAULT NULL'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content MODIFY label varchar(8000) DEFAULT NULL'
      );
    }
  }

  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content MODIFY label varchar(255) DEFAULT NULL'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content MODIFY label varchar(255) DEFAULT NULL'
      );
    }
  }
}
