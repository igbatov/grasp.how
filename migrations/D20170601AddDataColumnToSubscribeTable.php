<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20170601AddDataColumnToSubscribeTable extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(null,<<<'SQL'
ALTER TABLE subscribe_email ADD data TEXT DEFAULT NULL;
SQL
      );
    }
  }


  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(null, <<<'SQL'
ALTER TABLE subscribe_email DROP COLUMN data;
SQL
      );
    }
  }
}
