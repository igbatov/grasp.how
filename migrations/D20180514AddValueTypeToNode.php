<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20180514AddValueTypeToNode extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content ADD value_type varchar(255) DEFAULT NULL'
      );
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content ADD value_range LONGTEXT DEFAULT NULL'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content ADD value_type varchar(255) DEFAULT NULL'
      );
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content ADD value_range LONGTEXT DEFAULT NULL'
      );
    }
  }

  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content DROP value_type'
      );
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content DROP value_range'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content DROP value_type'
      );
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content DROP value_range'
      );
    }
  }
}
