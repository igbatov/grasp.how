<?php
class ErrorHandler{
  public function throwError($msg){
    error_log($msg);
    throw new Exception($msg);
  }
}