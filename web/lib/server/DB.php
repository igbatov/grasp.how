<?php
class DB
{
  private $mysqlLink;
  private $preExecListeners;
  private $dbConf;

  public function __construct(dbConf $c)
  {
    $this->mysqlLink = mysqli_connect($c->host, $c->login, $c->password, $c->dbName);
    mysqli_query($this->mysqlLink, "SET NAMES utf8");
    $this->preExecListeners = [];
    $this->dbConf = $c;
  }

  public function switchDB($dbname){
    $this->execute("USE ".$dbname);
  }

  public function execute($query)
  {
    error_log($query);
    // notify all preexec listeners that we are going to execute query
    foreach($this->preExecListeners as $listener){
      try{
        $listener['obj']->$listener['method']($query);
      }catch(Exception $e){
        error_log('Cannot exec '.$listener['obj'].'->'.$listener['method']);
      }
    }

    $result = mysqli_query($this->mysqlLink, $query) or trigger_error("MysqlHelper::execute query='".$query."'\n".mysqli_error($this->mysqlLink));

    if(strtoupper(substr($query, 0, 6)) == "DELETE") return $result;
    if(strtoupper(substr($query, 0, 6)) == "INSERT") return mysqli_insert_id($this->mysqlLink);
    if(is_bool($result))  return $result;

    $rows = array();
    while ($row = mysqli_fetch_assoc($result)) $rows[] = $row;
    return $rows;
  }

  public function escape($str)
  {
    if($str === NULL) return NULL;
    if(!is_string($str) && !is_numeric($str)){
      error_log('DB::escape: $str is not a string and not a number $str = '.var_export($str, true)." \n\n STACKTRACE: ".print_r(debug_backtrace(),true));
    }
    return mysqli_real_escape_string($this->mysqlLink, $str);
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
    mysqli_query($this->mysqlLink, "BEGIN");
  }

  public function commitTransaction()
  {
    mysqli_query($this->mysqlLink, "COMMIT");
  }

  public function rollbackTransaction()
  {
    mysqli_query($this->mysqlLink, "ROLLBACK");
  }

  public function addPreExecListener($obj, $method){
    $this->preExecListeners[] = ['obj'=>$obj, 'method'=>$method];
  }

  public function getCurrentDB(){
    $rows = $this->execute('SELECT DATABASE()');
    return reset(reset($rows));
  }

  public function getTableNames(){
    $dbname = $this->getCurrentDB();
    $q = 'SHOW TABLES FROM '.$dbname;
    $rows = $this->execute($q);
    $tablenames = [];
    foreach($rows as $row){
      $tablenames[] = reset($row);
    }
    return $tablenames;
  }
}
?>
