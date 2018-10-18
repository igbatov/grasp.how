<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20181018AddPSampleFieldToNodeContent extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content ADD p_samples LONGTEXT DEFAULT NULL'
      );
    } else {
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content ADD p_samples LONGTEXT DEFAULT NULL'
      );
    }
  }

  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content DROP p_samples'
      );
    } else {
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content DROP p_samples'
      );
    }
  }
}
