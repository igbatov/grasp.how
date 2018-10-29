<?php

/**
 * Interface to work with user multi-tenant DB architecture (i.e. each user has its own db)
 * Class MultiTenantDB
 */
class MultiTenantDB {
  private $db;
  private $currentAuthId;
  private $generalDBName; // database that is contains info common to all users

  private $PREFIX;

  public function __construct(EscapeDB $db, $prefix='user_', $generalDBName='general')
  {
    $this->currentAuthId = null;
    $this->db = $db;
    $this->PREFIX = $prefix;
    $this->generalDBName = $generalDBName;
    $this->db->switchDB($generalDBName);
  }

  public function getPrefix()
  {
    return $this->PREFIX;
  }

  public function exec($authId, $query, $params=array())
  {
    if($this->currentAuthId !== $authId) {
      $this->db->switchDB($this->getDBName($authId));
      $this->currentAuthId = $authId;
    }

    return $this->db->exec($query, $params);
  }

  public function getTotalTimeInQuery() {
    return $this->db->getTotalTimeInQuery();
  }

  public function getDBName($authId)
  {
    return $authId == null ? $this->generalDBName : $this->PREFIX.$authId;
  }

  public function copyDB($from, $to, $copyContentTables=null) {
    // if database already exists do nothing
    $q = "SHOW DATABASES LIKE '".$to."'";
    $rows = $this->exec(null, $q);
    if(count($rows)) {
      throw new Exception('Database '.$to.' already exist! Do nothing...');
    }

    $q = "CREATE DATABASE ".$to;
    $this->exec(null, $q);
    $tablenames = $this->getTableNames($from);
    foreach ($tablenames as $tablename){
      StopWatch::start($tablename.'1');
      $q = 'CREATE TABLE '.$to.'.'.$tablename.' LIKE '.$from.'.'.$tablename;
      $this->exec(null, $q);
      error_log($tablename.' CREATE TABLE got '.StopWatch::elapsed($tablename.'1'));

      StopWatch::start($tablename.'2');
      $q = 'ALTER TABLE '.$to.'.'.$tablename.' AUTO_INCREMENT = 0';
      $this->exec(null, $q);
      error_log($tablename.' AUTO_INCREMENT got '.StopWatch::elapsed($tablename.'2'));

      if($copyContentTables=null) $this->copyTableContents($from, $to, $tablename);
    }

    if(is_array($copyContentTables)) {
      foreach ($copyContentTables as $copyTable){
        $this->copyTableContents($from, $to, $copyTable);
      }
    }
  }

  public function copyTableContents($fromDB, $toDB, $tableName){
    $q = "INSERT INTO ".$toDB.".".$tableName." SELECT * FROM ".$fromDB.".".$tableName;
    $this->exec(null, $q);
  }


  public function switchDB($dbname)
  {
    return $this->db->switchDB($dbname);
  }

  public function startTransaction()
  {
    return $this->db->startTransaction();
  }

  public function commitTransaction()
  {
    return $this->db->commitTransaction();
  }

  public function rollbackTransaction()
  {
    return $this->db->rollbackTransaction();
  }

  public function addPreExecListener($obj, $method)
  {
    return $this->db->addPreExecListener($obj, $method);
  }

  public function getCurrentDB()
  {
    return $this->db->getCurrentDB();
  }

  public function getTableNames($dbname)
  {
    $q = 'SHOW TABLES FROM '.$dbname;
    $rows = $this->exec(null, $q);
    $tablenames = [];
    foreach($rows as $row){
      $tablenames[] = reset($row);
    }
    return $tablenames;
  }

  public function isColumnExists($dbName, $tableName, $columnName)
  {
    return $this->db->isColumnExists($dbName, $tableName, $columnName);
  }

  public function escape($str)
  {
    return $this->db->escape($str);
  }
}