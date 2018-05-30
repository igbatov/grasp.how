<?php

abstract class AbstractQuerier {
  const TAB = "  ";
  const EXT = "";
  protected $exec_path;
  protected $tmp_dir;

  protected $inbound;
  protected $outbound;

  protected $traversedRoots;
  protected $inboundWT;  // inbound without $traversedRoots

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
   * @return array - array of node names
   */
  protected function getNextRoots($graph) {
    $roots = [];
    foreach ($graph['nodes'] as $nodeName => $values) {
      if (!isset($this->inboundWT[$nodeName]) && !isset($this->traversedRoots[$nodeName])) {
        $this->traversedRoots[$nodeName] = 1;
        $roots[] = $nodeName;
      }
    }

    foreach ($roots as $rootName) {
      // remove this `root` node from inbounds of its outbound nodes
      if (!isset($this->outbound[$rootName])) {
        continue;
      }
      foreach ($this->outbound[$rootName] as $outNodeName => $v) {
        unset($this->inboundWT[$outNodeName][$rootName]);
        if (empty($this->inboundWT[$outNodeName])) {
          unset($this->inboundWT[$outNodeName]);
        }
      }
    }

    return $roots;
  }

}