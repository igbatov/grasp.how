<?php

/**
 * Makes nested DB transactions possible.
 * From http://www.yiiframework.com/wiki/38/how-to-use-nested-db-transactions-mysql-5-postgresql/
 * Class NestedDB
 */
class NestedDB extends DB {
  // The current transaction level.
  protected $transLevel = 0;

  public function startTransaction() {
    if($this->transLevel == 0) {
      parent::startTransaction();
    } else {
      $this->execute("SAVEPOINT LEVEL{$this->transLevel}");
    }

    $this->transLevel++;
  }

  public function commitTransaction() {
    $this->transLevel--;

    if($this->transLevel == 0) {
      parent::commitTransaction();
    } else {
      $this->execute("RELEASE SAVEPOINT LEVEL{$this->transLevel}");
    }
  }

  public function rollBack() {
    $this->transLevel--;

    if($this->transLevel == 0) {
      parent::rollbackTransaction();
    } else {
      $this->execute("ROLLBACK TO SAVEPOINT LEVEL{$this->transLevel}");
    }
  }
}