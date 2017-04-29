<?php


/**
 *
 */
class D20170312MigrationTest extends Migration
{
  public function up($authId)
  {
    $this->db->exec($authId,"");
  }


  public function down($authId)
  {
    $this->db->exec($authId,"");
  }
}
