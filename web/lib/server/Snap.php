<?php

class Snap {
  private $graphId; // globalGraphId
  private $step; // int
  private $ts; // timestamp (int)
  private $graphIdConverter;
  private $logger;
  private $db;

  public function __construct($vars, GraphIdConverter $graphIdConverter, $db, Logger $logger)
  {
    $this->db = $db;
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

  public function getAuthId(){
    return $this->graphIdConverter->getAuthId($this->graphId);
  }

  public function getLocalGraphId(){
    return $this->graphIdConverter->getLocalGraphId($this->graphId);
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

  public function createHashBySnap($settings) {
    // create unique hash for this snap
    $authId = $this->graphIdConverter->getAuthId($this->graphId);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($this->graphId);

    $rows = $this->db->exec(
      $authId,
      "SELECT * FROM snap_hash WHERE local_graph_id = :local_graph_id AND step = :step AND ts = :ts AND settings = :settings",
      ['local_graph_id'=>$localGraphId, 'step'=>$this->step, 'ts'=>$this->ts, 'settings' => $settings]
    );
    if (!empty($rows)) {
      return $rows[0]['hash'];
    }

    $params = '['.json_encode(['graphId'=>$this->graphId, 'step'=>$this->step, 'ts'=>$this->ts]).']?p='.$settings;
    $hash = crc32($params.random_int(1, 999999));
    $ok = false;
    $tryCnt = 0;
    while (!$ok) {
      try {
        $q = "INSERT INTO snap_hash SET settings = :settings, hash = :hash, local_graph_id = :local_graph_id, step = :step, ts = :ts";
        $this->db->exec(
          $authId,
          $q,
          ['settings'=>$settings, 'hash'=>$hash, 'local_graph_id'=>$localGraphId, 'step'=>$this->step, 'ts'=>$this->ts]
        );
        $ok = true;
      } catch (\Throwable $e) {
        // if this is duplicate entry, try several new hashes
        $tryCnt++;
        $hash = crc32($params.random_int(1, 999999));
        if ($tryCnt > 10) {
          // cannot generate unique hash, just code params
          $hash = base64_encode($params);
        }
        if ($tryCnt > 11) {
          // cannot insert in db, just exit loop with coded hash
          $ok = true;
        }
      }
    }

    return $hash;
  }
}