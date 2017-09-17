<?php


/**
 * up() and down() will be executed for EVERY user ($authId argument)
 * and general DB ($authId = NULL)
 */
class D20170607AddSettingsColumnToAuthTable extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(null,<<<'SQL'
ALTER TABLE auth ADD settings TEXT DEFAULT NULL;
SQL
      );
    }
  }


  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(null, <<<'SQL'
ALTER TABLE auth DROP COLUMN settings;
SQL
      );
    }
  }
}
