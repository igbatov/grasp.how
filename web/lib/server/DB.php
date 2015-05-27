<?php
class DB
{
  private $mysqlLink;

  public function __construct(dbConf $c)
  {
    $this->mysqlLink = mysql_connect($c->host, $c->login, $c->password);
    mysql_select_db($c->dbName, $this->mysqlLink);
    mysql_query("SET NAMES utf8");
  }

  public function execute($query)
  {
    $result = mysql_query($query, $this->mysqlLink) or trigger_error("MysqlHelper::execute query='".$query."'\n".mysql_error($this->mysqlLink));
    if(strtoupper(substr($query, 0, 6)) == "INSERT") return mysql_insert_id($this->mysqlLink);
    if(!is_resource($result))  return $result;

    $rows = array();
    while ($row = mysql_fetch_assoc($result))
    {
       $rows[] = $row;
    }
    return $rows;
  }

  public function escape($str)
  {
    return mysql_real_escape_string($str, $this->mysqlLink);
  }

  /**
   * @param $table
   * @param $keys
   * @param $fields
   * @return boolean
   */
  public function executeInsertUpdate($table, $keys, $fields)
  {
    $query = "INSERT INTO `".$table."` SET ";
    $key_part = "";
    foreach ($keys as $k => $v) {
      $key_part .= "`".$k."` = '".$this->escape($v)."', ";
    }

    $fields_part = "";
    foreach ($fields as $k => $v) {
      $fields_part .= "`".$k."` = '".$this->escape($v)."', ";
    }

    $query .= $key_part.$fields_part." ON DUPLICATE KEY UPDATE ".$update_part;

    return $this->execute($query);
  }

  /**
   * Example:
   *      $this->db->startTransaction();
   *      foreach($nodes as $node){
   *        // make $query here
   *          ...
   *        // try
   *        try{
   *          $this->db->execute($query);
   *        }catch (Exception $e) {
   *          $this->db->rollbackTransaction();
   *          $this->error("Error during transaction: ".mysql_error().". Transaction rollbacked.");
   *        }
   *      }
   *      $this->db->commitTransaction();
   */
  public function startTransaction()
  {
    mysql_query("BEGIN", $this->mysqlLink);
  }

  public function commitTransaction()
  {
    mysql_query("COMMIT", $this->mysqlLink);
  }

  public function rollbackTransaction()
  {
    mysql_query("ROLLBACK", $this->mysqlLink);
  }
}
?>
