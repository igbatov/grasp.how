<?php


/**
 *
 */
class D20170314AddTestableAppQueriesTable extends Migration
{
  public function up($authId)
  {
    $this->db->exec($authId,<<<'SQL'
CREATE TABLE testableapp_queries (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name varchar(255),
        query text NOT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
SQL
    );
  }


  public function down($authId)
  {
    $this->db->exec($authId,<<<'SQL'
DROP TABLE testableapp_queries;
SQL
    );
  }
}
