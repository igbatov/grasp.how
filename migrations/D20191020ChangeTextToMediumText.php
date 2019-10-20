<?php

class D20191020ChangeTextToMediumText extends Migration {
  public function up($authId)
  {
    if ($authId === NULL) {
      $this->db->exec(
        $authId,
        'alter table yovalue_user_template.node_content modify `text` mediumtext null;'
      );
      $this->db->exec(
        $authId,
        'alter table yovalue_user_template.node_content_history modify `text` mediumtext null;'
      );
    } else {
      $this->db->exec(
        $authId,
        'alter table node_content modify `text` mediumtext null;'
      );
      $this->db->exec(
        $authId,
        'alter table node_content_history modify `text` mediumtext null;'
      );
    }
  }

  public function down($authId)
  {
    if ($authId === NULL) {
      $this->db->exec(
        $authId,
        'alter table yovalue_user_template.node_content modify `text` text null;'
      );
      $this->db->exec(
        $authId,
        'alter table yovalue_user_template.node_content_history modify `text` text null;'
      );
    } else {
      $this->db->exec(
        $authId,
        'alter table node_content modify `text` text null;'
      );
      $this->db->exec(
        $authId,
        'alter table node_content_history modify `text` text null;'
      );
    }
  }
}