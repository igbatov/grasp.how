<?php

class Migration{
  protected $db;
  protected $config;
  protected $logger;

  public function __construct(MultiTenantDB $db, Config $c, Logger $logger)
  {
    $this->db = $db;
    $this->config = $c;
    $this->logger = $logger;
  }

  public function up($authId) {}

  public function down($authId) {}

  public function dumpDB($authId=null){
    // dump database

  }

  public function restoreDump($authId=null){
    // restore database dump
  }
}

class MigrationRoller{
  private $db;
  private $migrationpath;
  private $config;
  private $logger;

  public function __construct(MultiTenantDB $db, $migrationpath, Config $config, Logger $logger)
  {
    $this->db = $db;
    $this->config = $config;
    $this->logger = $logger;
    $this->migrationpath = $migrationpath;
  }

  public function hasNullMigrations($authId){
    $q = "SELECT * FROM migration_status WHERE `migration_timestamp` IS NULL";
    return count($this->db->exec($authId, $q)) > 0;
  }

  /**
   * Get all migrations from migration_status
   * and roll down till $timestamp
   * @param $timestamp
   */
  function rollDownTo($authId, $timestamp){
    $q = "SELECT * FROM migration_status WHERE migration_timestamp > '".$timestamp."'";
    $rows = $this->db->exec($authId, $q);
    foreach($rows as $row){
      $this->roll($authId, $row['migration_name'], 'down');
    }
  }

  /**
   * Roll up all migrations from $migrations that is not already in migration_status table
   * and has timestamp <= $timestamp
   * @param $timestamp
   * @param $migrations - in a form ['migration_name'=>timestamp, ...]
   */
  function rollUpTo($authId, $timestamp, $migrations){
    asort($migrations);
    $rolled_migrations = $this->getRolledMigrationNames($authId);
    foreach ($migrations as $migration => $ts) {
    if((int)$ts<=(int)$timestamp && !in_array($migration, $rolled_migrations)){
        $this->roll($authId, $migration, 'up');
      }
    }
  }

  function getRolledMigrationNames($authId){
    $q = "SELECT migration_name FROM migration_status";
    $rows = $this->db->exec($authId, $q);
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
      return null;
    }
    else if(count($date) == 1){
      return (int)$date[0];
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
   * @param $authId
   * @param $migrationName
   * @param $direction
   */
  function roll($authId, $migrationName, $direction){
    if(!$this->checkMigration($authId, $migrationName, $direction)){
      if($direction == 'up') $this->mylog($migrationName." already rolled up according to migration_status table. skipping...");
      if($direction == 'down') $this->mylog($migrationName." is not rolled up according to migration_status table. skipping...");
      return false;
    }

    $m = new $migrationName($this->db, $this->config, $this->logger);
    $this->db->startTransaction();
    try{
      $this->mylog('try rolling '.$direction.' '.$migrationName.' on authId = '.$authId.'...');
      $m->$direction($authId);
    }catch(Exception $e){
      $this->mylog($e->getMessage());
      $this->db->rollbackTransaction();
      return false;
    }
    $this->db->commitTransaction();
    $timestamp = $this->getFileRevisionDate($migrationName.'.php');
    $this->updateMigrationStatus($authId, $migrationName, $direction, $timestamp);
    $this->mylog(($authId ? 'authId = '.$authId : 'general db').': successfully rolled '.$direction.' '.$migrationName);
    return true;
  }

  function updateMigrationStatus($authId, $migrationName, $status, $timestamp){
    $q = null;
    if(!is_int($timestamp)) $timestamp = null;
    if($status == 'up') $q = "INSERT INTO migration_status SET migration_name='".$migrationName."', migration_timestamp=".($timestamp == null ? 'NULL' : "'".$timestamp."'").", created_at=NOW()";
    if($status == 'down') $q = "DELETE FROM migration_status WHERE migration_name='".$migrationName."'";
    if($q) $this->db->exec($authId, $q);
  }

  /**
   * Check that migration is not already rolled for up, or exists for down
   * @param $authId
   * @param $migrationName
   * @param $status
   * @return bool
   */
  function checkMigration($authId, $migrationName, $status){
    $q = "SELECT * FROM migration_status WHERE migration_name='".$migrationName."'";
    $rows = $this->db->exec($authId, $q);
    if($status == 'up' && count($rows)) return false;
    if($status == 'down' && !count($rows))  return false;
    return true;
  }

  function mylog($msg){
    error_log($msg."\n");
    echo $msg."\n";
  }

  function checkMigrationStatusTable($authId){
    $q = "SHOW TABLES LIKE 'migration_status'";
    $rows = $this->db->exec($authId, $q);
    if(count($rows)) return true;

    $q = "CREATE TABLE migration_status (
        id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
        migration_name varchar(255),
        migration_timestamp int DEFAULT NULL,
        created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
  );";
    $this->db->exec($authId, $q);
    return true;
  }
}
