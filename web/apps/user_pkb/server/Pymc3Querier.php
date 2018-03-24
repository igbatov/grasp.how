<?php
class Pymc3Querier
{
  private $pymc3_path;
  private $tmp_dir;

  private $inbound;
  private $traversedRoots;
  private $inboundWT;  // inbound without already traversed nodes (roots)
  private $outbound;

  const TAB = "  ";

  public function __construct($pymc3_path, $tmp_dir)
  {
    $this->pymc3_path = $pymc3_path;
    $this->tmp_dir = $tmp_dir;
  }

  /**
   * Create pymc3 script and execute it
   * Approach from
   * https://github.com/pymc-devs/pymc3/issues/1790
   * https://gist.github.com/tbsexton/1349864212b25cce91dbe5e336d794b4
   * @param $graph
   * @param $probabilities
   *
   * Example for graph e2 --> h1 --> e1
   * $graph = {
   *   nodes:{'e1':['1','2'], 'e2':['1','2'], 'h1':['1','2']}, // every node contains array of its alternatives
   *   edges:[['h1','e1'],['e2','h1']]
   * };
   * $probabilities = {
   *  e1: {
   *    soft:{1:0.9, 2:0.1}, // soft evidence for e1 and ^e1
   *    '{"h1":"1"}':{1:0.01, 2:0.99}, // sum must be equal to 1
   *    '{"h1":"2"}':{1:0.99, 2:0.01}  // sum must be equal to 1
   *  },
   *  e2: {
   *    soft:{1:1, 2:0} // soft evidence for e2 and ^e2
   *  },
   *  h1: {
   *    // prior probability of proposition alternative is always 1/<number of alternatives>
   *    '{"e2":"1"}':{1:0.9999, 2:0.0001}, // sum must be equal to 1
   *    '{"e2":"2"}':{1:0.99, 2:0.01}  // sum must be equal to 1
   *   }
   * }
   *
   * Example of the Pymc3 script
   *
   * // e1 has 1 parent (h1) and 2 values => we have to define 2x2 matrix
   * e1_prob = np.array([
   *        [0.01, 0.99],
   *        [0.99, 0.01],
   *    ])
   *
   * // we model fact's virtual evidence as extra child of this fact with observed value
   * e1_virtual_prob = np.array([
   *  [0.9, 0.1],
   *  [0.1, 0.9]
   * ])
   *
   * h1_prob = np.array([
   *    [0.9999, 0.0001],
   *    [0.99, 0.01],
   * ])
   *
   * e2_prob = np.array([1, 0])
   *
   * e2 = pm.Categorical('e2', p=e2_prob, observed=0)
   *
   * h1_prob_shared = theano.shared(h1_prob)  # make it global
   * h1_prob_final = h1_prob_shared[e2]
   * h1 = pm.Categorical('h1', p=h1_prob_final)
   *
   * e1_prob_shared = theano.shared(e1_prob)  # make it global
   * e1_prob_final = e1_prob_shared[h1]  # select the prob array that "happened" thanks to parents
   * e1 = pm.Categorical('e1', p=e1_prob_final)
   *
   * e1_virtual_prob_shared = theano.shared(e1_virtual_prob)
   * e1_virtual_prob_final = e1_virtual_prob_shared[e1]
   * e1_virtual = pm.Categorical('e1_virtual', p=e1_virtual_prob_final, observed=0)
   *
   */
  public function queryPymc3($graph, $probabilities){
    $this->initEdgeHashes($graph);
    $text = $this->createScriptText($graph, $probabilities);

    $tmp_filename = $this->tmp_dir."/Pymc3Querier.tmp.".rand(1,1000).".".time().".py";

    $myfile = fopen($tmp_filename, "w");
    if(!$myfile){
      error_log("Unable to open file ".$tmp_filename." !");
      return;
    }
    fwrite($myfile, $text);
    fclose($myfile);

    $cmd = '"'.$this->pymc3_path.'" "'.$tmp_filename.'" 2>&1';
    $output = array();
    exec($cmd, $output, $error);
    error_log($cmd.' '.print_r($output, true).' '.print_r($error, true));

    $proposition_probabilities = array();

  }

  /**
   * Get from inboundWT nodes that has no inbound edges and remove them from inboundWT
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

  /**
   * Create inbound and outbound hashes
   * Inbound - key nodeId, value - hash of inbound nodes
   * Outbound - key nodeId, value - hash of outbound nodes
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

  public function createProbabilitiesPart($graph, $probabilities){
    $text = [];
    foreach ($probabilities as $node => $nodeProbabilities) {
      if (isset($nodeProbabilities['soft'])) {
        // this is evidence
        $nodeValues = $graph['nodes'][$node];
        sort($nodeValues);
        $trueProb = $nodeProbabilities['soft'][reset($nodeValues)];
        $notTrueProb = 1 - $trueProb;
        if ($trueProb != 0 && $trueProb != 1) {
          // if evidence is really soft, then create virtual child that will be observed
          $text[] = <<<EOT
  {$node}_virtual_prob = np.array([
    [$trueProb, $notTrueProb],
    [$notTrueProb, $trueProb]
  ])
EOT;
        }
      }

      // generate probability matrix for each parent's value combination
      if (isset($this->inbound[$node])) {
        $parents = array_keys($this->inbound[$node]);
        sort($parents);
        // remake keys of nodes conditional probabilities to be in sorted order
        $sortedNodeProbs = [];
        foreach ($nodeProbabilities as $key => $probability) {
          if ($key == 'soft') {
            continue;
          }

          $parentsValues = json_decode($key, true);
          $sortedKey = [];
          foreach ($parents as $parent){
            $sortedKey[$parent] = $parentsValues[$parent];
          }

          $sortedProbValues = [];
          $nodeValues = $graph['nodes'][$node];
          sort($nodeValues);
          foreach ($nodeValues as $v) {
            $sortedProbValues[] = $probability[$v];
          }
          $sortedNodeProbs[json_encode($sortedKey)] = $sortedProbValues;
        }
        $probMatrix = $this->getConditionalMatrixString($sortedNodeProbs, $parents, [], $graph);
        $probMatrix = $this->addTabsToMultiline($probMatrix, 1);
        $text[] = <<<EOT
  {$node}_prob = np.array({$probMatrix})
EOT;
      } else {
        // we will set `{$node}` as observed, so this probability can be arbitrary
        $nodeValuesCnt = count($graph['nodes'][$node]);
        $prob = 1/$nodeValuesCnt;
        $valueProbs = [];
        for($i=$nodeValuesCnt; $i>0; $i--){
          $valueProbs[] = $prob;
        }
        $valueProbsStr = implode(', ', $valueProbs);
        $text[] = <<<EOT
  {$node}_prob = np.array([{$valueProbsStr}])
EOT;
      }
    }
    return implode($text, "\n");
  }

  private function addTabsToMultiline($str, $n){
    $tabs = '';
    for($i=0; $i<$n; $i++){
      $tabs .= self::TAB;
    }
    return str_replace("\n", "\n".$tabs, $str);
  }

  /**
   * Recursively generate probability matrix from node parents and $probabilities
   * @param $sortedNodeProbs
   * @param $parents
   * @param $parentValues
   * @param $graph
   * @return string
   */
  private function getConditionalMatrixString($sortedNodeProbs, $parents, $parentValues, $graph){
    if (count($parentValues) == count($parents)) {
     return $this->getTabs(count($parentValues))."[".implode(
      ', ',
       $sortedNodeProbs[$this->getSortedNodeProbsKey($parents, $parentValues)]
     )."]";
    } else {
     $nextParentValues = $graph['nodes'][$parents[count($parentValues)]];
     sort($nextParentValues);
     $result = [];
     foreach ($nextParentValues as $nextParentValue) {
       $newParentValues = $parentValues;
       $newParentValues[] = $nextParentValue;
       $result[] = $this->getTabs(count($parentValues)).
           $this->getConditionalMatrixString($sortedNodeProbs, $parents, $newParentValues, $graph);
     }
     return $this->getTabs(count($parentValues))
         ."[\n".implode(",\n", $result)
         ."\n".$this->getTabs(count($parentValues))."]";
    }
  }

  private function getTabs($n){
    $str = '';
    for($i=0; $i<$n; $i++){
      $str .= self::TAB;
    }
    return $str;
  }

  private function getSortedNodeProbsKey($parents, $parentValues){
    $key = [];
    foreach ($parents as $i => $parent) {
      $key[$parent] = (string)$parentValues[$i];
    }

    return json_encode($key);
  }

  public function createMainPart($graph, $probabilities){
    $text = [];
    $nodes = $this->extractRoots($graph);
    while(!empty($nodes)){
      foreach ($nodes as $node) {
        if (isset($this->inbound[$node])) {
          $parents = array_keys($this->inbound[$node]);
          sort($parents);
          $parentsStr = implode(', ', $parents);
          $text[] = <<<EOT
  {$node}_prob_shared = theano.shared({$node}_prob)  # make it global
  {$node}_prob_final = {$node}_prob_shared[{$parentsStr}]
EOT;
          if (isset($probabilities[$node]['soft'])) {
            $firstProb = reset($probabilities[$node]['soft']);
            if ($firstProb === 0 || $firstProb === 1) {
              $observedValue = $firstProb ? 0 : 1;
              $text[] = <<<EOT
  {$node} = pm.Categorical('{$node}', p={$node}_prob_final, observed={$observedValue})
EOT;
            } else {
              $text[] = <<<EOT
  {$node} = pm.Categorical('{$node}', p={$node}_prob_final)
  {$node}_virtual_prob_shared = theano.shared({$node}_virtual_prob)
  {$node}_virtual_prob_final = {$node}_virtual_prob_shared[{$node}]
  {$node}_virtual = pm.Categorical('{$node}_virtual', p={$node}_virtual_prob_final, observed=0)
EOT;
            }
          } else {
            $text[] = <<<EOT
  {$node} = pm.Categorical('{$node}', p={$node}_prob_final)
EOT;
          }
        } else {
          if (isset($probabilities[$node]['soft'])) {
            $firstProb = reset($probabilities[$node]['soft']);
            if ($firstProb === 0 || $firstProb === 1) {
              $observedValue = $firstProb ? 0 : 1;
              $text[] = <<<EOT
  {$node} = pm.Categorical('{$node}', p={$node}_prob, observed={$observedValue})
EOT;
            } else {
              $text[] = <<<EOT
  {$node} = pm.Categorical('{$node}', p={$node}_prob)
  {$node}_virtual_prob_shared = theano.shared({$node}_virtual_prob)
  {$node}_virtual_prob_final = {$node}_virtual_prob_shared[{$node}]
  {$node}_virtual = pm.Categorical('{$node}_virtual', p={$node}_virtual_prob_final, observed=0)
EOT;
            }
          } else {
            $text[] = <<<EOT
  {$node} = pm.Categorical('{$node}', p={$node}_prob)
EOT;
          }
        }
      }
      $nodes = $this->extractRoots($graph);
    }

    return implode("\n", $text);
  }

  private function createScriptText($graph, $probabilities){
    $header = <<<EOT
import numpy as np
import pandas as pd

import pymc3 as pm
import theano.tensor as tt
from theano.compile.ops import as_op
import theano

with pm.Model() as model:

EOT;

    $footer = <<<EOT

  SAMPLE_NUM = 50000
  trace = pm.sample(SAMPLE_NUM)
  
  filename = "out.txt"
  file = open(filename, "a")
  
EOT;
    $footerPrints = [];
    foreach ($graph['nodes'] as $node => $values) {
      if (isset($probabilities[$node]['soft'])) {
        continue;
      }
      sort($values);
      foreach ($values as $i => $value) {
        $footerPrints[] = <<<EOT
        
  vsum = (trace['{$node}'] == {$i}).sum()
  {$node}_value_prob = vsum / float(SAMPLE_NUM)
  file.write("{$node}[{$value}] = " + str({$node}_value_prob) + '\\n')

EOT;
      }
    }

    return $header.
        "\n"."\n".
        $this->createProbabilitiesPart($graph, $probabilities)
        ."\n"."\n".
        $this->createMainPart($graph, $probabilities).
        "\n"."\n".
        $footer
        ."\n"."\n".
        implode("\n", $footerPrints);
  }
}