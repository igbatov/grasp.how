<?php

/**
 * This makes App testable. On every call to showView() it
 * - starts DB transaction
 * - replays all queries from testableapp_queries table where name = $_GET['TEST_NAME']
 * - saves all queries that is executed in app in testableapp_queries table (with name = $_GET['TEST_NAME'])
 * It also clears testableapp_queries upon 'clearTest?TEST_NAME=name' request
 * Class TestableApp
 */
class TestableApp{
  private $testConn; // separate db connection to save app queries between http requests - this connection is not rollbacked at the end
  private $app;
  private $testname;
  private $originalDBNamePrefix;
  private $skipQuerySave;
  private $autoincrements;
  private $catalog_tables = ['scopus_title_list', 'asjc_code_list'];
  const TEST_USER_PREFIX = 'testuser_';

  /**
   * TestableApp constructor.
   * @param MultiTenantDB $testConn
   * @param AppUserPkb $app
   * @param $testname
   */
  public function __construct(MultiTenantDB $testConn, AppUserPkb $app, $testname, $originalDBNamePrefix){
    if(!$testname) exit('not testname specified');
    $this->originalDBNamePrefix = $originalDBNamePrefix;

    $this->testname = $testname;
    $this->autoincrements = [];

    $this->app = $app;
    $this->testConn = $testConn;

    $this->skipQuerySave = false;
  }

  public static function getTestDBNamePrefix($testname){
    return 'test_'.$testname;
  }

  public static function getTestDBName($testname, $username){
    return self::getTestDBNamePrefix($testname).'_'.$username;
  }

  public function saveAppQuery($query){
    if($this->skipQuerySave) return;

    /**
     * the following SQL commands break a transaction that we are going to rollback
     * So filter out them here
     */
    $exceptionTransactionBreakers = [
        'LOCK TABLES',
        'UNLOCK TABLES',
        'SET AUTOCOMMIT = 1',
        'BEGIN',
        'START TRANSACTION',
        'ALTER TABLE',
        'CREATE INDEX',
        'DROP DATABASE',
        'DROP INDEX',
        'DROP TABLE',
        'RENAME TABLE',
        'TRUNCATE TABLE',
    ];
    foreach ($exceptionTransactionBreakers as $breaker) {
      if (strpos($query, $breaker) !== false) {
        throw new Exception('Cannot test request that makes query '.$query.' because it cannot be rollbacked!');
      }
    }


    // we want to save only queries that modify data
    if(strpos($query, 'INSERT') !== false
        || strpos($query, 'UPDATE')  !== false
        || strpos($query, 'DELETE')  !== false
    ){
      // we do not want to save log requests
      $request_log_starter = "INSERT INTO request_log";
      if(substr($query, 0, strlen($request_log_starter)) == $request_log_starter) return;

      $q = 'INSERT INTO `testableapp_queries` SET name = "'.$this->app->getDB()->escape($this->testname).'", query = "'.$this->app->getDB()->escape($query).'"';
      $this->testConn->exec($this->app->getAuthId(), $q);
    }
  }

  private function switchDB($dbname){
    $this->testConn->switchDB($dbname);
    $this->app->switchDB($dbname);
  }

  public function showView(){
    $vars = $this->app->getRoute();

    if($vars[0] === 'createTestUser'){
      $username = uniqid(self::TEST_USER_PREFIX);
      $password = '123';

      // create db for this user if not exists
      $tdb = self::getTestDBName($this->testname, $username);
      // TODO: in production second argument must be true
      $this->createTestDB($tdb, $_REQUEST['dbSchemaFromUserId'], false);

      // create user in this db
      $this->app->createNewUser($username, $password);

      $this->app->showRawData(json_encode([
          'username'=>$username
      ]));
      return;

    }elseif($vars[0] === 'clearTest'){
      $tdb = self::getTestDBName($this->testname, $this->app->session->getUsername());

      // drop test databases
      $q = 'DROP DATABASE '. $tdb;
      $this->testConn->exec(null, $q);
      return;

    }elseif($vars[0] === 'loginTestUser'){
      if(!isset($_REQUEST['username'])){
        error_log('loginTestUser request without username parameter. Exiting... '.var_export($_REQUEST, true));
        return;
      }

      $tdb = self::getTestDBName($this->testname, $_REQUEST['username']);

      // check that user has our prefix
      if(substr($_REQUEST['username'], 0, strlen(self::TEST_USER_PREFIX)) !== self::TEST_USER_PREFIX) {
        error_log($_REQUEST['username'].' not found in '.$tdb.'. Exiting...');
        return;
      }
      // check that this user exists in db
      $q = "SELECT username FROM ".$tdb.".auth WHERE username = '".$this->app->getDB()->escape($_REQUEST['username'])."'";
      $rows = $this->app->getDB()->exec(null, $q);
      if(count($rows) && $rows[0]['username'] == $_REQUEST['username']){
        $this->app->session->setAuth($_REQUEST['username']);
      } else{
        error_log($_REQUEST['username'].' not found in '.$tdb.'. Exiting...');
      }
      return;

    }elseif($vars[0] === 'rollbackTestChanges'){
      $tdb = self::getTestDBName($this->testname, $this->app->session->getUsername());
      $this->switchDB($tdb);

      $this->cleanTestableappQueries();

      // truncate all tables
      $q = "SHOW DATABASES LIKE '".$tdb."'";
      $rows = $this->testConn->exec(null, $q);
      if(count($rows)) {
        $tablenames = $this->app->getDB()->getTableNames();
        foreach ($tablenames as $tablename) {
          if(in_array($tablename, $this->catalog_tables)) continue;
          StopWatch::start($tablename . '1');
          $q = 'TRUNCATE TABLE ' . $tdb . '.' . $tablename;
          $this->testConn->exec(null, $q);
          error_log($tablename . ' TRUNCATE TABLE got ' . StopWatch::elapsed($tablename . '1'));
        }
      }

      return;
    }elseif($vars[0] === 'commitTestChanges'){
      $tdb = self::getTestDBName($this->testname, $this->app->session->getUsername());
      $this->switchDB($tdb);

      $this->replayPreviousQueries();

      return;
    }


    $username = $this->app->session->getUsername();
    if(!$username){
      error_log("use\n/createTestUser?dbSchemaFromUserId=1&TEST_NAME=<testName>\n"+
      +"and\n"+"/loginTestUser?username=<username>&TEST_NAME=<testName>\n to create and login for test");
    };

    $this->app->getDB()->addPreExecListener($this,'saveAppQuery');
    $this->saveAutoIncrement();
    $this->app->getDB()->startTransaction();
    $this->replayPreviousQueries();
    $this->app->showView();
    $this->app->getDB()->rollbackTransaction();
    $this->rollbackAutoIncrement();
  }

  /**
   * DB Rollback does not rollback autoincrements, so do it manually here
   */
  private function saveAutoIncrement(){
    $dbname = self::getTestDBName($this->testname, $this->app->session->getUsername());
    $tablenames = $this->app->getDB()->getTableNames();
    foreach($tablenames as $tablename){
      $this->autoincrements[$tablename] = $this->getAutoIncrement($dbname, $tablename);
    }
  }

  private function rollbackAutoIncrement(){
    $dbname = self::getTestDBName($this->testname, $this->app->session->getUsername());
    foreach ($this->autoincrements as $tablename => $autoincrement){
      if($this->getAutoIncrement($dbname, $tablename) == $autoincrement) continue;
      $q = "ALTER TABLE ".$dbname.".".$tablename." AUTO_INCREMENT = ".$autoincrement;
      $this->testConn->exec(null, $q);
    }
  }

  private function getAutoIncrement($dbname, $tablename){
    $q = "SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES "
        ." WHERE TABLE_SCHEMA = '".$dbname."'"
        ." AND   TABLE_NAME   = '".$tablename."'";
    $rows = $this->testConn->exec(null, $q);
    return reset(reset($rows));
  }

  private function replayPreviousQueries(){
    $q = 'SELECT query FROM `testableapp_queries` WHERE name = "'.$this->app->getDB()->escape($this->testname).'" ORDER BY id ASC';
    $rows = $this->testConn->exec($this->app->getAuthId(), $q);
    $this->skipQuerySave = true; // we do not want to save them twice
    foreach($rows as $row){
      $this->app->getDB()->exec($this->app->getAuthId(), $row['query']);
    }
    $this->skipQuerySave = false;
  }

  private function cleanTestableappQueries(){
    $q = 'DELETE FROM `testableapp_queries` WHERE name = "'.$this->app->getDB()->escape($this->testname).'"';
    $this->testConn->exec($this->app->getAuthId(), $q);
  }

  /**
   * Creating clean clone of current database.
   * Name of the clone is $tdb.
   * If such database exists and $dropIfExists==false - do nothing
   * Also copy contents of catalog tables - scopus_title_list and asjc_code_list
   * @param $tdb
   * @param bool $dbSchemaFromUserId
   * @param bool $dropIfExists
   * @return bool
   */
  private function createTestDB($tdb, $dbSchemaFromUserId, $dropIfExists=true)
  {
    if (!$this->testname) return false;

    if ($dropIfExists) {
      $q = "DROP DATABASE `" . $tdb . "`";
      $this->testConn->exec(null, $q);
    } else {
      // if database already exists do nothing
      $q = "SHOW DATABASES LIKE '" . $tdb . "'";
      $rows = $this->testConn->exec(null, $q);
      if (count($rows)) return true;
    }

    $cloneFromDB = $this->originalDBNamePrefix . $dbSchemaFromUserId;
    $this->testConn->copyDB($cloneFromDB, $tdb, $this->catalog_tables);
  }

  public function preAccessLog(){

  }

  public function postAccessLog(){

  }
}