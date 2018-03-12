<?php
class Pymc3Querier
{
  private $pymc3_path;
  private $tmp_dir;

  private $inbound;
  private $inboundWT;  // inbound without already traversed nodes
  private $outbound;

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
   * e1_virtual = pm.Categorical('e1', p=e1_virtual_prob_final, observed=0)
   *
   */
  public function queryPymc3($graph, $probabilities){
    $this->initEdgeHashes($graph);

  }

  /**
   * Get from inboundWT nodes that has no inbound edges and remove them from inboundWT
   */
  private function extractRoots($graph) {
    $roots = [];
    foreach ($graph['nodes'] as $node => $values) {
      if (!isset($this->inboundWT[$node])) {
        $roots[] = $node;
        // remove this `root` node from inbounds of its outbound nodes
        foreach ($this->outbound[$node] as $outNode) {
          unset($this->inboundWT[$outNode][$node]);
          if (empty($this->inboundWT[$outNode])) {
            unset($this->inboundWT[$outNode]);
          }
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
  private function initEdgeHashes($graph){
    foreach ($graph['edges'] as $edge){
      $this->outbound[$edge[0]][$edge[1]] = 1;
      $this->inbound[$edge[1]][$edge[0]] = 1;
      $this->inboundWT[$edge[1]][$edge[0]] = 1;
    }
  }

  public function createProbabilitiesPart($graph, $probabilities){
    $text = '';
    foreach ($probabilities as $node => $probability) {
      if (isset($probabilities[$node]['soft'])) {
        // this is evidence
        $trueProb = $probabilities[$node]['soft'][0];
        $notTrueProb = 1 - $trueProb;
        if ($trueProb != 0 && $trueProb != 1) {
          // if evidence is really soft, then create virtual child that will be observed
          $text = <<<EOT
  e{$node}_prob = np.array([0.5, 0.5])  
  e{$node}_virtual_prob = np.array([
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
        foreach ($probabilities[$node] as $key => $probability) {
          $probability = json_decode($probability);
          if ($key == 'soft') {
            continue;
          }
          $parentsValues = json_decode($key);
          $sortedKey = [];
          foreach ($parents as $parent){
            $sortedKey[$parent] = $parentsValues[$parent];
          }

          $sortedProbValues = [];
          $nodeValues = $graph[$node];
          sort($nodeValues);
          foreach ($nodeValues as $v) {
            $sortedProbValues[] = $probability[$v];
          }
          $sortedNodeProbs[json_encode($sortedKey)] = $sortedProbValues;
        }
        $probMatrix = $this->getConditionalMatrixString($sortedNodeProbs, $parents, [], $graph);
        $text = <<<EOT
  e{$node}_prob = np.array($probMatrix)
EOT;
      } else {
        // we will set `e{$node}` as observed, so this probability can be arbitrary
        $text = <<<EOT
  e{$node}_prob = np.array([0.5, 0.5])
EOT;
      }
    }
    return $text;
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
     return $this->getTabs(count($parentValues)).json_encode(
       $sortedNodeProbs[$this->getSortedNodeProbsKey($parents, $parentValues)]
     );
    } else {
     $nextParentValues = $graph[$parents[count($parentValues)]];
     sort($nextParentValues);
     $result = [];
     foreach ($nextParentValues as $nextParentValue) {
       $newParentValues = clone($parentValues);
       $newParentValues[] = $nextParentValue;
       $result[] = $this->getTabs(count($parentValues))."[\n".
           $this->getConditionalMatrixString($sortedNodeProbs, $parents, $newParentValues, $graph).
           $this->getTabs(count($parentValues))."\n]";
     }
     return implode(",\n", $result);
    }
  }

  private function getTabs($n){
    $str = '';
    for($i=0; $i<$n; $i++){
      $str .= " ";
    }
    return $str;
  }

  private function getSortedNodeProbsKey($parents, $parentValues){
    $key = [];
    foreach ($parents as $i => $parent) {
      $key[$parent] = $parentValues[$i];
    }

    return json_encode($key);
  }

  private function createMainPart($graph, $probabilities){
    $roots = $this->extractRoots($graph);
    while(!empty($roots)){
      foreach ($roots as $node) {

      }
      $roots = $this->extractRoots($graph);
    }
  }

  private function createScriptText($graph, $probabilities){
    $header = <<<EOD
import numpy as np
import pandas as pd

import pymc3 as pm
import theano.tensor as tt
from theano.compile.ops import as_op
import theano

with pm.Model() as model:
EOD;

    $footer = <<<EOD
with model:
    SAMPLE_NUM = 20000
    trace = pm.sample(SAMPLE_NUM)
    print(sum(trace['h1']) / float(SAMPLE_NUM))
EOD;

    return $header.
        $this->createProbabilitiesPart($graph, $probabilities).
        $this->createMainPart($graph, $probabilities).
        $footer;
  }
}