<?php

class D20190521AddActivityStatTable extends Migration {
  public function up($authId)
  {
    if($authId === NULL) {
      $this->db->exec(
        null,
        <<<SQL
CREATE TABLE IF NOT EXISTS activity_stat (
    id INT AUTO_INCREMENT,
    username VARCHAR(255) NOT NULL,
    date DATE,
    cnt INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE username_date (username,date)
)  ENGINE=INNODB;
SQL
      );
    }
  }

  public function down($authId)
  {
    if($authId === NULL) {
      $this->db->exec(
        null,
        'DROP TABLE IF EXISTS activity_stat;'
      );
    }
  }
}