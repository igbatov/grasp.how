<?php

class D20181201ResizeLabelInNodeContentHistory extends Migration {
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content_history MODIFY label varchar(8000) DEFAULT NULL'
      );
    } else {
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content_history MODIFY label varchar(8000) DEFAULT NULL'
      );
    }
  }

  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
        null,
        'ALTER TABLE yovalue_user_template.node_content_history MODIFY label varchar(255) DEFAULT NULL'
      );
    } else {
      $this->db->exec(
        $authId,
        'ALTER TABLE node_content_history MODIFY label varchar(255) DEFAULT NULL'
      );
    }
  }
}