<?php


/**
 *
 */
class D20170318AddDefaultValueInAuthInfo extends Migration
{
  public function up()
  {
    $this->db->execute(<<<'SQL'
ALTER TABLE auth MODIFY COLUMN info text DEFAULT NULL;
SQL
    );
  }


  public function down()
  {
    $this->db->execute(<<<'SQL'
ALTER TABLE auth MODIFY COLUMN info text NOT NULL;
SQL
    );
  }
}
