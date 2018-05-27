<?php

abstract class AbstractQuerier {
  const TAB = "  ";
  const EXT = "";
  private $exec_path;
  private $tmp_dir;

  private $inbound;
  private $outbound;
  private $traversedRoots;
  private $inboundWT;  // inbound without $traversedRoots

  public function __construct($exec_path, $tmp_dir)
  {
    $this->exec_path = $exec_path;
    $this->tmp_dir = $tmp_dir;
  }

  public function query($graph, $probabilities){
    $this->initEdgeHashes($graph);
    $text = $this->createScriptText($graph, $probabilities);

    $tmp_filename_base = $this->tmp_dir."/querier.tmp.".rand(1,1000).".".time();
    $tmp_filename = $tmp_filename_base.".".self::EXT;
    $tmp_filename_result = $tmp_filename_base.".out";

    $myfile = fopen($tmp_filename, "w");
    if (!$myfile) {
      error_log("Unable to open file ".$tmp_filename." !");
      return false;
    }
    fwrite($myfile, $text);
    fclose($myfile);

    $cmd = '"'.$this->exec_path.'" "'.$tmp_filename.'" "'.$tmp_filename_result.'"  2>&1';
    $output = array();
    exec($cmd, $output, $error);
    error_log($cmd.' '.print_r($output, true).' '.print_r($error, true));

    return $this->prepareScriptOutput($output);
  }

  abstract protected function createScriptText ($graph, $probabilities);
  abstract protected function prepareScriptOutput($exec_output);

  /**
   * Create inbound and outbound hashes
   * Inbound - key nodeId, value - hash of inbound nodes
   * Outbound - key nodeId, value - hash of outbound nodes
   * @param $graph
   */
  public function initEdgeHashes($graph){
    $this->traversedRoots = [];
    $this->outbound = [];
    $this->inbound = [];
    $this->inboundWT = [];
    foreach ($graph['edges'] as $edge){
      $this->outbound[$edge[0]][$edge[1]] = 1;
      $this->inbound[$edge[1]][$edge[0]] = 1;
      $this->inboundWT[$edge[1]][$edge[0]] = 1;
    }
  }

  /**
   * Get from inboundWT nodes that has no inbound edges and remove them from inboundWT
   * @param $graph
   * @return array
   */
  private function extractRoots($graph) {
    $roots = [];
    foreach ($graph['nodes'] as $node => $values) {
      if (!isset($this->inboundWT[$node]) && !isset($this->traversedRoots[$node])) {
        $this->traversedRoots[$node] = 1;
        $roots[] = $node;
      }
    }

    foreach ($roots as $root) {
      // remove this `root` node from inbounds of its outbound nodes
      if (!isset($this->outbound[$root])) {
        continue;
      }
      foreach ($this->outbound[$root] as $outNode => $v) {
        unset($this->inboundWT[$outNode][$root]);
        if (empty($this->inboundWT[$outNode])) {
          unset($this->inboundWT[$outNode]);
        }
      }
    }

    return $roots;
  }

}