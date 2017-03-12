<?php

class Migration{
  protected $db;

  public function __construct(DB $db)
  {
    $this->db = $db;
  }


}

class MigrationRoller{
  private $db;
  private $migrationpath;

  public function __construct(DB $db, $migrationpath)
  {
    $this->db = $db;
    $this->migrationpath = $migrationpath;
  }

  public function hasNullMigrations(){
    $q = "SELECT * FROM migration_status WHERE `migration_timestamp` IS NULL";
    return count($this->db->execute($q)) > 0;
  }

  /**
   * Get all migrations from migration_status
   * and roll down till $timestamp
   * @param $timestamp
   */
  function rollDownTo($timestamp){
    $q = "SELECT * FROM migration_status WHERE migration_timestamp > '".$timestamp."'";
    $rows = $this->db->execute($q);
    foreach($rows as $row){
      $this->roll($row['migration_name'], 'down');
    }
  }

  /**
   * Roll up all migrations from $migrations that is not already in migration_status table
   * and has timestamp <= $timestamp
   * @param $timestamp
   * @param $migrations - in a form ['migration_name'=>timestamp, ...]
   */
  function rollUpTo($timestamp, $migrations){
    asort($migrations);
    $rolled_migrations = $this->getRolledMigrationNames();
    foreach ($migrations as $migration => $ts) {
      if($ts<=$timestamp && !in_array($migration, $rolled_migrations)){
        $this->roll($migration, 'up');
      }
    }
  }

  function getRolledMigrationNames(){
    $q = "SELECT migration_name FROM migration_status";
    $rows = $this->db->execute($q);
    $names = [];
    foreach ($rows as $row){
      $names[] = $rows['migration_name'];
    }
    return $names;
  }

  /**
   * Get date of revision in which $file was commited
   */
  function getFileRevisionDate($filename){
    $file = $this->migrationpath."/".$filename;
    exec('git log --pretty=format:%ct --diff-filter=A -- '.$file.' 2>&1', $date);
    if(count($date) == 0){
      // nothing found, file was not commited yet
      return $date[0];
    }
    else if(count($date) == 1){
      return $date[0];
    }
    else{
      $this->mylog('migration.php: getFileRevisionDate: error getting revision for file '.$file);
      return false;
    }
  }

  /**
   * get current revision date
   * @return mixed
   */
  function getRevisionDate(){
    // get current revision
    exec('git rev-parse HEAD 2>&1', $rev, $return_value);
    if(count($rev) == 1){
      $rev = $rev[0];
      // get date of current revision
      exec('git show -s --format=%ct '.$rev.' 2>&1', $revdate, $return_value);
      if(count($rev) == 1){
        $revdate = $revdate[0];
      }
      return $revdate;
    }
  }

  /**
   * Rolling one migration
   * @param $migrationName
   * @param $direction
   */
  function roll($migrationName, $direction){
    if(!$this->checkMigration($migrationName, $direction)){
      if($direction == 'up') $this->mylog($migrationName." already rolled up according to migration_status table. skipping...");
      if($direction == 'down') $this->mylog($migrationName." is not rolled up according to migration_status table. skipping...");
      return;
    }

    $m = new $migrationName($this->db);
    $this->db->startTransaction();
    try{
      $this->mylog('try rolling '.$direction.' '.$migrationName.'...');
      $m->$direction();
    }catch(Exception $e){
      $this->mylog($e->getMessage());
      $this->db->rollbackTransaction();
    }
    $this->db->commitTransaction();
    $timestamp = $this->getFileRevisionDate($migrationName);
    $this->updateMigrationStatus($migrationName, $direction, $timestamp);
    $this->mylog('successfully rolled '.$direction.' '.$migrationName);
  }

  function updateMigrationStatus($migrationName, $status, $timestamp){
    $q = null;
    if(!is_int($timestamp)) $timestamp = null;
    if($status == 'up') $q = "INSERT INTO migration_status SET migration_name='".$migrationName."', migration_timestamp=".($timestamp == null ? 'NULL' : "'".$timestamp."'").", created_at=NOW()";
    if($status == 'down') $q = "DELETE FROM migration_status WHERE migration_name='".$migrationName."'";
    if($q) $this->db->execute($q);
  }

  /**
   * Check that migration is not already rolled for up, or exists for down
   * @param $migrationName
   * @param $status
   * @return bool
   */
  function checkMigration($migrationName, $status){
    $q = "SELECT * FROM migration_status WHERE migration_name='".$migrationName."'";
    $rows = $this->db->execute($q);
    if($status == 'up' && count($rows)) return false;
    if($status == 'down' && !count($rows))  return false;
    return true;
  }

  function mylog($msg){
    error_log($msg."\n");
    echo $msg."\n";
  }

  function checkMigrationStatusTable(){
    $q = "SHOW TABLES LIKE 'migration_status'";
    $rows = $this->db->execute($q);
    if(count($rows)) return true;

    $q = "CREATE TABLE migration_status (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        migration_name varchar(255),
        migration_timestamp int DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  );";
    $this->db->execute($q);
    return true;
  }
}