<?php
class DB
{
  private $mysqlLink;
  private $preExecListeners;
  private $dbConf;
  private $logger;

  private static $totalTimeInExecute = 0; // in msec
  private static $totalTimeInQuery = 0; // in msec
  private static $totalTimeInFetch = 0; // in msec

  public function __construct(dbConf $c, callable $logger=null)
  {
    $this->mysqlLink = mysqli_connect($c->host, $c->login, $c->password, $c->dbName);
    mysqli_query($this->mysqlLink, "SET NAMES utf8");
    $this->preExecListeners = [];
    $this->dbConf = $c;
    $this->logger = $logger;
  }

  public function switchDB($dbname){
    return $this->execute("USE ".$dbname);
  }

  public function execute($query)
  {
    $startTimeExecute = round(microtime(true) * 1000);

    if ($this->dbConf->verbose_logging) {
      $this->log($query);
    }

    // notify all preexec listeners that we are going to execute query
    foreach($this->preExecListeners as $listener){
      try{
        $listener['obj']->$listener['method']($query);
      }catch(Exception $e){
        $this->log('Cannot exec '.$listener['obj'].'->'.$listener['method']);
      }
    }

    $startTimeQuery = round(microtime(true) * 1000);

    $result = mysqli_query($this->mysqlLink, $query);

    $stopTimeQuery = round(microtime(true) * 1000);
    self::$totalTimeInQuery += ($stopTimeQuery - $startTimeQuery);

    if($result === false){
      $error_msg = "MysqlHelper::execute ".mysqli_error($this->mysqlLink)."\n"." query='".$query."'\n";
      trigger_error($error_msg);
      throw new Exception($error_msg);
    }

    if(strtoupper(substr($query, 0, 6)) == "DELETE") return $result;
    if(strtoupper(substr($query, 0, 6)) == "INSERT") return mysqli_insert_id($this->mysqlLink);
    if(is_bool($result))  return $result;

    $rows = array();

    $startTimeFetch = round(microtime(true) * 1000);

    while ($row = mysqli_fetch_assoc($result)) {
      $rows[] = $row;
    }

    $stopTimeFetch = round(microtime(true) * 1000);
    self::$totalTimeInFetch += ($stopTimeFetch - $startTimeFetch);

    $stopTimeExecute = round(microtime(true) * 1000);
    self::$totalTimeInExecute += ($stopTimeExecute - $startTimeExecute);

    return $rows;
  }

  public function getTotalTimeInQuery() {
    return json_encode([
        'totalTimeInExecute'=>self::$totalTimeInExecute/1000,
        'totalTimeInQuery'=>self::$totalTimeInQuery/1000,
        'totalTimeInFetch'=>self::$totalTimeInFetch/1000,
    ]);
  }

  public function escape($str)
  {
    if($str === NULL) return NULL;
    if(!is_string($str) && !is_numeric($str)){
      $this->log('DB::escape: $str is not a string and not a number $str = '.var_export($str, true)." \n\n STACKTRACE: ".print_r(debug_backtrace(),true));
    }
    return mysqli_real_escape_string($this->mysqlLink, $str);
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
   return mysqli_query($this->mysqlLink, "BEGIN");
  }

  public function commitTransaction()
  {
    return mysqli_query($this->mysqlLink, "COMMIT");
  }

  public function rollbackTransaction()
  {
    return mysqli_query($this->mysqlLink, "ROLLBACK");
  }

  public function addPreExecListener($obj, $method){
    $this->preExecListeners[] = ['obj'=>$obj, 'method'=>$method];
    return true;
  }

  public function getCurrentDB(){
    $rows = $this->execute('SELECT DATABASE()');
    $rows = reset($rows);
    return reset($rows);
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

  public function isColumnExists($dbName, $tableName, $columnName)
  {
    $rows = $this->execute("SHOW COLUMNS FROM ".$dbName.".".$tableName." LIKE '".$columnName."'");
    return count($rows)>0 ? TRUE : FALSE;
  }

  private function log($m) {
    if ($this->logger) {
      $f = $this->logger;
      $f($m);
    } else {
      error_log($m);
    }
  }
}
?>
