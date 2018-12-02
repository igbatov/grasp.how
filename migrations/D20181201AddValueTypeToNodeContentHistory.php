<?php

class D20181201AddValueTypeToNodeContentHistory extends Migration {
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content_history ADD value_type varchar(255) DEFAULT NULL'
      );
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content_history ADD value_range LONGTEXT DEFAULT NULL'
      );
    } else {
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content_history ADD value_type varchar(255) DEFAULT NULL'
      );
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content_history ADD value_range LONGTEXT DEFAULT NULL'
      );
    }
  }

  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content_history DROP value_type'
      );
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content_history DROP value_range'
      );
    } else {
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content_history DROP value_type'
      );
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content_history DROP value_range'
      );
    }
  }

}