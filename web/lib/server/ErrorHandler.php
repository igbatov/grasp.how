<?php
class ErrorHandler{
  private $session;

  public function __construct(Session $s=null)
  {
    if ($s == null) {
      $s = new Session(null);
    }
    $this->session = $s;
  }

  public function throwError($msg){
    throw new Exception($msg);
  }

  public function customExceptionHandler( Exception $e)
  {
    error_log(json_encode([
      'type'=>'ERROR',
      'exception'=>get_class($e),
      'username'=>$this->session->getUsername(),
      'uri'=>$this->session->getURI(),
      'request_id'=>$this->session->getRequestId(),
      'msg'=>$e->getMessage(),
      'file'=>$e->getFile(),
      'line'=>$e->getLine(),
      'code'=>$e->getCode(),
      //'trace'=>json_encode(debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS)),
      'trace'=>$e->getTraceAsString(),
    ]));
    return false;
  }

  public function customErrorHandler( $num, $str, $file, $line, $context = null )
  {
    return $this->customExceptionHandler(
      new ErrorException( $str, 0, $num, $file, $line )
    );
  }
}