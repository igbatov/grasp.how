<?php


/**
 *
 */
class D20170318AddDefaultValueInAuthInfo extends Migration
{
  public function up($authId)
  {
    $this->db->exec($authId,<<<'SQL'
ALTER TABLE auth MODIFY COLUMN info text DEFAULT NULL;
SQL
    );
  }


  public function down($authId)
  {
    $this->db->exec($authId,<<<'SQL'
ALTER TABLE auth MODIFY COLUMN info text NOT NULL;
SQL
    );
  }
}
