<?php

class D20191020ChangeTextToMediumText extends Migration {
  public function up($authId)
  {
    $this->db->exec(
      $authId,
      'alter table node_content modify `text` mediumtext null;'
    );
    $this->db->exec(
      $authId,
      'alter table node_content_history modify `text` mediumtext null;'
    );
  }

  public function down($authId)
  {
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