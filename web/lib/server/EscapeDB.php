<?php

/**
 * Interface for DB to autoescape query parameters
 * Class EscapeDB
 */
class EscapeDB {
  private $db;

  public function __construct(DB $db)
  {
    $this->db = $db;
  }

  /**
   * @param $query - like "SELECT * FROM users WHERE name = :name OR username = :name"
   * @param $params - array like ['name'=>'Nick']
   * @return array|bool|int|mysqli_result|string
   */
  public function exec($query, $params=array())
  {
    foreach($params as $key=>$value){
      $query = str_replace(':'.$key, '"'.$this->db->escape($value).'"', $query);
    }
    return $this->db->execute($query);
  }

  public function getTotalTimeInQuery() {
    return $this->db->getTotalTimeInQuery();
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

  public function getTableNames()
  {
    return $this->db->getTableNames();
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