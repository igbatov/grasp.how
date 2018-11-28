<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */
class D20181126AddSnapHashTable extends Migration
{
  public function up($authId)
  {
    $tableTemplateHeader = <<<'SQL'
CREATE TABLE yovalue_user_template.snap_hash (
SQL;

    $tableHeader = <<<'SQL'
CREATE TABLE snap_hash (
SQL;

    $tableDef = <<<'SQL'
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        settings text,
        hash varchar(255),
        local_graph_id int,
        step bigint,
        ts bigint unsigned,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (hash),
        INDEX (local_graph_id, step, ts)
  );
SQL;

    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
        null,
        $tableTemplateHeader.$tableDef
      );
    } else {
      $this->db->exec(
        $authId,
        $tableHeader.$tableDef
      );
    }
  }

  public function down($authId)
  {
    if($authId === NULL) {
      $this->db->exec(
        $authId,
        'DROP TABLE yovalue_user_template.snap_hash'
      );
    } else {
      $this->db->exec(
        $authId,
        'DROP TABLE snap_hash'
      );
    }
  }
}
