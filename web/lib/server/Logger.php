<?php

class Logger{
  protected $db;
  protected $eh;
  protected $log_dir;
  protected $username;
  private $start_time = 0;
  private $id;

  public function __construct($db, $eh, $log_dir, $username){
    $this->db = $db;
    $this->eh = $eh;
    $this->log_dir = $log_dir;
    $this->username = $username;
    $this->start_time = microtime(true);
    $this->id = time().'.'.rand(100,999);
  }

  public function error($msg){
    error_log($msg);
    $this->dbLog('error',$msg);
    $this->eh->throwError($msg);
    $this->postAccessLog();
    exit();
  }

  public function dbLog($type,$msg,$data=null){
    // try to log error in request_log table
    if($this->db){
      $q = "INSERT INTO request_log SET user_login = '".$this->username."', user_id = NULL, type='".$type."', msg = '".$this->db->escape($msg)."', data = '".$this->db->escape($data)."'";
      //error_log($q);
      try{
        // $this->db->execute($q);
      }catch (Exception $e) {
        error_log($e->getMessage());
      }
    }
  }

  /**
   * Write log to file
   * First argument is filename
   * All other arguments are translated to strings, concatenated and written to filename
   */
  public function fileLog(){
    if(count(func_get_args()) < 2) return false;

    $msg = "";
    foreach(func_get_args() as $i => $arg){
      if($i==0) $filename = $arg;
      else{
        if(is_array($arg)) $msg .= var_export($arg, true);
        else $msg .= $arg;
        $msg .= " ";
      }
    }
    error_log($msg."\n", 3, $this->log_dir."/".$filename);
    return true;
  }

  /**
   * Log messages to error_log
   * All arguments are translated to strings and concatenated
   */
  public function log(){
    $msg = "";
    foreach(func_get_args() as $arg){
      if(is_array($arg)) $msg .= var_export($arg, true);
      else $msg .= $arg;
      $msg .= "\n";
    }
    error_log($msg);
    //$this->dbLog('log',$msg);
  }

  public function preAccessLog(){
    $ref = isset($_SERVER['HTTP_REFERER']) ?$_SERVER['HTTP_REFERER'] : null;
    $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : null;
    $self = isset($_SERVER['PHP_SELF']) ? $_SERVER['PHP_SELF'] : null;
    $req_method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : null;
    $this->fileLog('pre_access.log', $this->id.';'.time().';'.date('Y-m-d H:i:s').';'.getmypid().';'.$ref.';'.$uri.';'.$self.';'.$req_method.';'.memory_get_usage());
  }

  public function postAccessLog(){
    $ref = isset($_SERVER['HTTP_REFERER']) ?$_SERVER['HTTP_REFERER'] : null;
    $uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : null;
    $self = isset($_SERVER['PHP_SELF']) ? $_SERVER['PHP_SELF'] : null;
    $req_method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : null;
    $this->fileLog('post_access.log',$this->id.';'.time().';'.date('Y-m-d H:i:s').';'.getmypid().';'.$ref.';'.$uri.';'.$self.';'.$req_method.';'.memory_get_usage().';'.(microtime(true) - $this->start_time));
  }
}