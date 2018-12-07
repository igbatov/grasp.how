<?php

class D20181206NormalizeContentHistoryTimestampAndReliability extends Migration {
  public function up($authId)
  {
    if($authId !== NULL) {
      $this->db->exec(
        $authId,
        'UPDATE node_content_history SET reliability = IF(reliability>1, reliability/100, reliability)'
      );
      $this->db->exec(
        $authId,
        'UPDATE node_content_history SET snap_timestamp = IF(CHAR_LENGTH (snap_timestamp)>10, FLOOR(snap_timestamp/1000), snap_timestamp)'
      );
    }
  }

  public function down($authId)
  {

  }
}