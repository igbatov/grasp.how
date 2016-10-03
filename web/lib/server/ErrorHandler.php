<?php
class ErrorHandler{
  public function throwError($msg){
    throw new Exception($msg);
  }
}