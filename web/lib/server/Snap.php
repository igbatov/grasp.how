<?php

class Snap {
  private $graphId; // globalGraphId
  private $step; // int
  private $ts; // timestamp (int)
  private $graphIdConverter;
  private $logger;

  public function __construct($vars, GraphIdConverter $graphIdConverter, Logger $logger)
  {
    $this->graphIdConverter = $graphIdConverter;
    $this->logger = $logger;
    $this->graphId = $vars['graphId'];
    if(!$this->graphIdConverter->isGraphIdGlobal($this->graphId)){
      $this->logger->log("Error: graphId=".$this->graphId." but must be in a global format. Exiting...");
      return false;
    }
    $this->step = $vars['step'];
    $this->ts = $vars['ts'];
  }

  public function getGraphId(){
    return $this->graphId;
  }

  public function getStep(){
    return $this->step;
  }

  public function getTs(){
    return $this->ts;
  }

  public function toJson(){
    return json_encode([
        'graphId'=>$this->graphId,
        'step'=>$this->step,
        'ts'=>$this->ts,
    ]);
  }
}