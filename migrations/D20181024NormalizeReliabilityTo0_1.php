<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20181024NormalizeReliabilityTo0_1 extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
    } else {
      $this->db->exec(
        $authId,
        'UPDATE node_content SET reliability = reliability/100;'
      );
    }
  }

  public function down($authId)
  {
    if($authId === NULL) {
    } else {
      $this->db->exec(
        $authId,
        'UPDATE node_content SET reliability = reliability*100;'
      );
    }
  }
}
