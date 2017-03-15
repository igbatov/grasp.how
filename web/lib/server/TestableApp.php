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
  private $db;
  private $app;
  private $testname;
  private $skipQuerySave;

  public function __construct(DB $db, App $app, $testname=false){
    $this->testname = $testname;

    $this->app = $app;
    $this->db = $db;

    if($this->testname) $this->db->addPreExecListener($this,'saveAppQuery');

    $this->skipQuerySave = false;
  }

  public function saveAppQuery($query){
    if($this->skipQuerySave) return;

    // skip our own queries
    $own_query_mark = 'INSERT INTO `testableapp_queries` ';
    if(substr($query,0,strlen($own_query_mark)) == $own_query_mark) return;

    $q = 'INSERT INTO `testableapp_queries` SET name = "'.$this->db->escape($this->testname).'", query = "'.$this->db->escape($query).'"';
    $this->db->execute($q);
  }

  public function showView(){
    $vars = $this->app->getRoute();
    if($vars[0] === 'clearTest'){
      $this->clearSavedQueries();
      return;
    }

    $this->db->startTransaction();
    $this->replayPreviousQueries();
    $this->app->showView();
    $this->db->rollbackTransaction();
  }

  private function replayPreviousQueries(){
    $q = 'SELECT query FROM `testableapp_queries` WHERE name = "'.$this->db->escape($this->testname).'" ORDER BY id ASC';
    $rows = $this->db->execute($q);
    $this->skipQuerySave = true; // we do not want to save them twice
    foreach($rows as $row){
      $this->db->execute($row['query']);
    }
    $this->skipQuerySave = false;
  }

  private function clearSavedQueries(){
    if(!$this->testname) return;
    $q = 'DELETE FROM `testableapp_queries` WHERE name = "'.$this->db->escape($this->testname).'"';
    $this->db->execute($q);
  }
}