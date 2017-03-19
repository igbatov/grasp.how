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
  private $skipQuerySave;
  private $autoincrements;

  /**
   * TestableApp constructor.
   * @param DB $testConn
   * @param AppUserPkb $app
   * @param $testname
   */
  public function __construct(DB $testConn, AppUserPkb $app, $testname){
    if(!$testname) exit('not testname specified');

    $this->testname = $testname;
    $this->autoincrements = [];

    $this->app = $app;
    $this->testConn = $testConn;

    $this->skipQuerySave = false;
  }

  private function getTestDBName($username){
    // TODO: switch to 'test_'.$this->testname.'_'.$username
    // (after implementing 'one user - one database' scheme)
    return 'test_'.$this->testname;
  }

  public function saveAppQuery($query){
    if($this->skipQuerySave) return;

    // we want to save only queries that modify data
    if(strpos($query, 'INSERT') === false && strpos($query, 'UPDATE')  === false) return;

    // we do not want to save log requests
    $request_log_starter = "INSERT INTO request_log";
    if(substr($query, 0, strlen($request_log_starter)) == $request_log_starter) return;

    $q = 'INSERT INTO `testableapp_queries` SET name = "'.$this->app->getDB()->escape($this->testname).'", query = "'.$this->app->getDB()->escape($query).'"';
    $this->testConn->execute($q);
  }

  private function switchDB($dbname){
    $this->testConn->switchDB($dbname);
    $this->app->switchDB($dbname);
  }

  public function showView(){
    $vars = $this->app->getRoute();

    if($vars[0] === 'createTestUser'){
      $username = uniqid('testuser_');
      $password = '123';

      // create db for this user if not exists
      $tdb = $this->getTestDBName($username);
      $this->createTestDB($tdb);

      $this->switchDB($tdb);

      // create user in this db
      $this->app->createNewUser($username, $password);

      $this->app->showRawData(json_encode([
          'username'=>$username
      ]));
      return;

    }elseif($vars[0] === 'clearTest'){
      // drop test databases
      $q = 'SHOW DATABASES';
      $rows = $this->testConn->execute($q);
      foreach ($rows as $row){
        $dbname = $row['Database'];
        $testdbmask = 'test_'.$this->testname;
        if(substr($dbname, 0, strlen($testdbmask)) == strtolower($testdbmask)){
          $q = 'DROP DATABASE '.$dbname;
          $this->testConn->execute($q);
        }
      }
      return;

    }elseif($vars[0] === 'loginTestUser'){
      if(!isset($_REQUEST['username'])){
        error_log('loginTestUser request without username parameter. Exiting... '.var_export($_REQUEST, true));
        return;
      }
      $tdb = $this->getTestDBName($_REQUEST['username']);
      $this->switchDB($tdb);
      // check that this user exists  in this db
      $q = "SELECT username FROM ".$tdb.".auth WHERE username = '".$this->app->getDB()->escape($_REQUEST['username'])."'";
      $rows = $this->app->getDB()->execute($q);
      if(count($rows) && $rows[0]['username'] == $_REQUEST['username']){
        $this->app->session->setAuth($_REQUEST['username']);
      } else{
        error_log($_REQUEST['username'].' not found in '.$tdb.'. Exiting...');
      }
      return;

    }elseif($vars[0] === 'rollbackTestChanges'){
      $this->cleanTestableappQueries();
      return;

    }elseif($vars[0] === 'commitTestChanges'){
      $this->replayPreviousQueries();
      return;

    }


    $username = $this->app->session->getUsername();
    if(!$username){
      error_log("use\n/createTestUser?dbSchemaFromUserId=1&TEST_NAME=<testName>\n"+
      +"and\n"+"/loginTestUser?username=<username>&TEST_NAME=<testName>\n to create and login for test");
    };

    // switch to test db
    $this->switchDB($this->getTestDBName($username));

    //$this->app->showView();


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
    $dbname = $this->app->getDB()->getCurrentDB();
    $tablenames = $this->app->getDB()->getTableNames();
    foreach($tablenames as $tablename){
      $this->autoincrements[$tablename] = $this->getAutoIncrement($dbname, $tablename);
    }
  }

  private function rollbackAutoIncrement(){
    $dbname = $this->app->getDB()->getCurrentDB();
    foreach ($this->autoincrements as $tablename => $autoincrement){
      if($this->getAutoIncrement($dbname, $tablename) == $autoincrement) continue;
      $q = "ALTER TABLE ".$dbname.".".$tablename." AUTO_INCREMENT = ".$autoincrement;
      $this->testConn->execute($q);
    }
  }

  private function getAutoIncrement($dbname, $tablename){
    $q = "SELECT `AUTO_INCREMENT` FROM  INFORMATION_SCHEMA.TABLES "
        ." WHERE TABLE_SCHEMA = '".$dbname."'"
        ." AND   TABLE_NAME   = '".$tablename."'";
    $rows = $this->testConn->execute($q);
    return reset(reset($rows));
  }

  private function replayPreviousQueries(){
    $q = 'SELECT query FROM `testableapp_queries` WHERE name = "'.$this->app->getDB()->escape($this->testname).'" ORDER BY id ASC';
    $rows = $this->testConn->execute($q);
    $this->skipQuerySave = true; // we do not want to save them twice
    foreach($rows as $row){
      $this->app->getDB()->execute($row['query']);
    }
    $this->skipQuerySave = false;
  }

  private function cleanTestableappQueries(){
    $q = 'DELETE FROM `testableapp_queries` WHERE name = "'.$this->app->getDB()->escape($this->testname).'"';
    $this->testConn->execute($q);
  }

  private function createTestDB($tdb){
    if(!$this->testname) return false;
    $currentDB = $this->app->getDB()->getCurrentDB();
    $q = "CREATE DATABASE IF NOT EXISTS ".$tdb;
    $this->testConn->execute($q);
    $tablenames = $this->app->getDB()->getTableNames();
    foreach ($tablenames as $tablename){
      StopWatch::start($tablename.'1');
      $q = 'CREATE TABLE '.$tdb.'.'.$tablename.' LIKE '.$currentDB.'.'.$tablename;
      $this->testConn->execute($q);
      error_log($tablename.' CREATE TABLE got '.StopWatch::elapsed($tablename.'1'));

      StopWatch::start($tablename.'2');
      $q = 'ALTER TABLE '.$tdb.'.'.$tablename.' AUTO_INCREMENT = 0';
      $this->testConn->execute($q);
      error_log($tablename.' AUTO_INCREMENT got '.StopWatch::elapsed($tablename.'2'));
    }
  }

  public function preAccessLog(){

  }

  public function postAccessLog(){

  }
}