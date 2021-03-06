<?php
class WebPPLQuerier extends AbstractQuerier
{
  const EXT = "ppl";
  /**
   * Create webppl script and execute it
   * Debugging webppl with Chrome:
   * http://webppl.readthedocs.io/en/master/debugging.html and
   * https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27
   * @param $graph
   * @param $probabilities
   *
   * Example for graph e2 --> h1 --> e1
   * $graph = {
   *   nodeTypes:{'h1':'continuous'}, // Type can by 'discrete', 'labelled' or 'continuous'.
   *   nodes:{'e1':['1','2'], 'e2':['1','2'], 'h1':['1','2']}, // every node contains array of its alternatives
   *   edges:[['h1','e1'],['e2','h1']]
   * };
   * $probabilities = {
   *  e1: {
   *    soft:{1:0.9, 2:0.1}, // soft evidence for e1 and ^e1
   *    '{"h1":"1"}':{1:0.001, 2:0.999}, // sum must be equal to 1
   *    '{"h1":"2"}':{1:0.999, 2:0.001}  // sum must be equal to 1
   *  },
   *  e2: {
   *    soft:{1:1, 2:0} // soft evidence for e2 and ^e2
   *  },
   *  h1: {
   *    'formula':'
   *       if (s["e1"] === 1) {
   *         return categorical({vs:[1, 2], ps:[0.0001, 0.9999]})
   *       }
   *       if (s["e1"] === 2) {
   *         return categorical({vs:[1, 2], ps:[0.5, 0.5]})
   *       }
   *    ',
   *   }
   * }
   *
   * Example of the WebPPL script
   *
  var softEvidence = function(s_value, value, p) {
    if (s_value === value) {
      return bernoulli({p: p})
    }
    return bernoulli({p: 1-p})
  }

  var objToKey = function(o) {
    return JSON.stringify(o)
  }

  var e2 = function() {
    return categorical({vs:[1, 2], ps:[0.5, 0.5]})
  }

  var h1 = function(s){
    if (s['e2'] === 1) {
      return categorical({vs:[1, 2], ps:[0.0001, 0.9999]})
    }
    if (s['e2'] === 2) {
      return categorical({vs:[1, 2], ps:[0.5, 0.5]})
    }
  }

  var e1 = function(s){
    var p = {
      '{"h1":1}':{'keys':[1, 2], 'values':[0.999, 0.001]},
      '{"h1":2}':{'keys':[1, 2], 'values':[0.001, 0.999]},
    }
    var sp = p[objToKey(s)];
    return categorical({vs:sp['keys'], ps:sp['values']})
  }

  var model = function() {
    var se2 = e2()
    var sh1 = h1({'e2':se2})
    var se1 = e1({'h1':sh1})

    condition(se2 === 1)
    condition(softEvidence(se1, 1, 0.999) === true);
    return sh1
  }

  var dist = Infer(
    {},
    model
  );

  console.log(JSON.stringify(dist.getDist()))
   *
   *
   * @param $graph
   * @param $probabilities
   * @return string
   */
  public function createScriptText($graph, $probabilities){
    $script = "";
    $script .= $this->getHelperMethods();
    $script .= $this->getNodeMethods($graph, $probabilities);
    $script .= $this->getMain($graph, $probabilities);
    return $script;
  }

  /**
   * Modify node names so that $graph and $probabilities will pass sanityCheck
   * (for example node name '2' is converted to 'n2')
   * @param $inGraph
   * @param $inProbabilities
   * @return array
   */
  public function prepareInput($inGraph, $inProbabilities) {
    $graph = [
        'nodeTypes'=>[],
        'nodes'=>[],
        'edges'=>[]
    ];
    $probabilities = [];
    foreach ($inGraph['nodeTypes'] as $nodeId => $type) {
      $graph['nodeTypes'][$this->nodeIdToFuncName($nodeId)] = $type;
    }
    foreach ($inGraph['nodes'] as $nodeId => $values) {
      $graph['nodes'][$this->nodeIdToFuncName($nodeId)] = $values;
    }
    foreach ($inGraph['edges'] as $edge) {
      $graph['edges'][] = [
          $this->nodeIdToFuncName($edge[0]),
          $this->nodeIdToFuncName($edge[1])
      ];
    }
    foreach ($inProbabilities as $nodeId => $inConditionals) {
      /**
       * $conditionals can be in form ['formula'=>'...']
       * or in form [
       *  '{"2":"1", "1":"1"}'=>[1=>0.9, 2=>0.1],
       *  '{"2":"1", "1":"2"}'=>[1=>0.99, 2=>0.01],
       *   ...
       * ]
       * In latter case we must rename node in keys to
       * [
       *  '{"n2":"1", "n1":"1"}'=>[1=>0.9, 2=>0.1],
       *  '{"n2":"1", "n1":"2"}'=>[1=>0.99, 2=>0.01],
       *   ...
       * ]
       */
      $conditionals = [];
      foreach ($inConditionals as $jsonKey => $value) {
        if ($jsonKey === 'formula' || $jsonKey === 'soft') {
          $newJsonKey = $jsonKey;
        } else {
          $key = json_decode($jsonKey, true);
          $newKey = [];
          foreach ($key as $parentNodeId => $parentNodeValue) {
            $newKey[$this->nodeIdToFuncName($parentNodeId)] = $parentNodeValue;
          }
          $newJsonKey = json_encode($newKey);
        }
        $conditionals[$newJsonKey] = $value;
      }
      $probabilities[$this->nodeIdToFuncName($nodeId)] = $conditionals;
    }
    return [
      'graph' => $graph,
      'probabilities' => $probabilities,
    ];
  }

  public function prepareOutput($output) {
    $newOutput = [];
    foreach ($output as $nodeName => $probs) {
      $newOutput[$this->funcNameToNodeId($nodeName)] = $probs;
    }
    return $newOutput;
  }

  private function nodeIdToFuncName($nodeName) {
    return 'n'.$nodeName;
  }
  private function funcNameToNodeId($funcName) {
    return substr($funcName, 1);
  }

  public function sanityCheck($graph, $probabilities) {
    foreach ($graph['nodes'] as $nodeName => $v) {
      // check that nodeName can be used as js function name
      if (preg_match('/^[A-Za-z_][A-Za-z_0-9]*$/', $nodeName) !== 1) {
        throw new Exception('Bad node name: '.$nodeName.'. Node name should start with letter and can contain only letters, digits, underscores.');
      }
    }
  }

  public function getNodeMethods($graph, $probabilities) {
    $text = "";
    foreach ($probabilities as $nodeName => $probs) {
      if (isset($probs['formula'])) {
        $text .=<<<EOT
      
var {$nodeName} = function(s) {

EOT;
        $text .= "\n".$probs['formula']."\n";

      } else if (isset($probs['soft']) && count($probs) === 1) {
        // fact without incoming nodes
        // As there is no incoming nodes we set in formula all alternatives as equal
        // Note, however, that soft evidence is still taken in consideration
        // in $this->getMain() with "condition(softEvidence(..."
        $vs = implode(array_keys($probs['soft']), ", ");
        $text .=<<<EOT
      
var {$nodeName} = function() {
  return categorical({vs:[{$vs}], ps:[0.5, 0.5]});

EOT;

      } else if (empty($probs)) {
        // hypothesis without incoming nodes - make uniform distribution for it
        if ($graph['nodeTypes'][$nodeName] === Graphs::NODE_VALUE_TYPE_CONTINUOUS) {
          $from = $graph['nodes'][$nodeName][0];
          $to = $graph['nodes'][$nodeName][1];
          $text .=<<<EOT
      
var {$nodeName} = function() {
  return uniform({a:{$from}, b:{$to}});

EOT;
        } else {
          $ps = [];
          $vs = $graph['nodes'][$nodeName];
          $prob = 1/count($vs);
          for ($i = 0; $i<count($vs); $i++) {
            $ps[] = $prob;
          }
          $ps = implode($ps, ", ");
          $vs = implode($vs, ", ");
          $text .=<<<EOT
      
var {$nodeName} = function() {
  return categorical({vs:[{$vs}], ps:[{$ps}]});

EOT;
        }
      } else {
        $text .=<<<EOT
      
var {$nodeName} = function(s) {
  var p = {

EOT;

        foreach ($probs as $key => $prob) {
          if ($key === 'soft') {
            continue;
          } else {
            /**
              var p = {
                '{"h1":1}':{'keys':[1, 2], 'values':[0.999, 0.001]},
                '{"h1":2}':{'keys':[1, 2], 'values':[0.001, 0.999]},
              }
              var sp = p[objToKey(s)];
              return categorical({vs:sp['keys'], ps:sp['values']})
            */
            $keys = array_map(function($key){return (int)$key;},array_keys($prob));
            $values = array_values($prob);
            $jsonKeys = json_encode($keys);
            $jsonValues = json_encode($values);
            // convert key values to int
            $key = json_encode($this->convertValuesToInt(json_decode($key)));
            $text .= <<<EOT
    '{$key}':{'keys':{$jsonKeys}, 'values':{$jsonValues}},

EOT;
          }
        }
        $text .= <<<EOT
  };
  var sp = p[objToKey(s)];
  return categorical({vs:sp['keys'], ps:sp['values']});

EOT;
      }
      $text .= <<<EOT
}

EOT;
    }

    return $text;
  }

  public function convertValuesToInt($o) {
    $result = [];
    foreach ($o as $k => $v) {
      $result[$k] = (int)$v;
    }
    return $result;
  }

  public function getMain($graph, $probabilities) {
    $returnObj = "";
    $text = "";
    $roots = $this->getNextRoots($graph);
    while(!empty($roots)){
      foreach ($roots as $nodeName) {
        if (!isset($this->inbound[$nodeName])) {
          $text .= "  var s".$nodeName." = ".$nodeName."();\n";
        } else {
          $parents = $this->inbound[$nodeName];
          $args = '';
          foreach ($parents as $parent => $v) {
            $args .= '"'.$parent.'":s'.$parent.',';
          }
          $text .= "  var s".$nodeName." = ".$nodeName."({".substr($args, 0,strlen($args)-1)."});\n";
        }

        if (isset($probabilities[$nodeName]['soft'])) {
          // this is fact, so make condition for it
          $soft = $probabilities[$nodeName]['soft'];
          if (reset($soft) === 1) {
            // hard evidence
            $text .= "  condition(s".$nodeName." === 1);\n";
          } else {
            // soft evidence
            $text .= "  condition(softEvidence(s".$nodeName.", 1, ".$soft[1].") === true);\n";
          }
        } else {
          // it is hypothesis, include it in return object
          $returnObj .= '"'.$nodeName.'":s'.$nodeName.',';
        }
      }

      // get next layer of nodes
      $roots = $this->getNextRoots($graph);
    }
    $returnObj = "  return {".substr($returnObj, 0, strlen($returnObj)-1)."};\n";
    $text .= $returnObj;
    return <<<EOT
var model = function() {    
{$text}
}

var dist = Infer(
  {},
  model
);

console.log(JSON.stringify(dist.getDist()));
EOT;

  }

  /**
   * Converts - [
   *   '{"{\"h1\":2}":{"val":{"h1":2},"prob":0.0008913574803449336},"{\"h1\":1}":{"val":{"h1":1},"prob":0.9991086425196549}}',
   *   'undefined'
   * ]
   * to
   * [
   *   'h1' => [
   *      1 => 0.9991086425196549,
   *      2 => 0.0008913574803449336
   *    ]
   * ]
   * @param $exec_output
   * @return array
   */
  public function prepareScriptOutput($exec_output) {
    array_pop($exec_output);
    $json = array_pop($exec_output);
    $data = json_decode($json, true);
    /**
     * Now $data looks like
     {
        '{"h1":2}' =>
        {
          'val' =>
          {
            'h1' => 2,
          },
          'prob' => 0.0008913574803449336,
        },
        '{"h1":1}' =>
        {
          'val' =>
          {
            'h1' => 1,
          },
          'prob' => 0.99910864251965492,
        },
     }
     */
    $result = [];
    foreach ($data as $row) {
      foreach ($row['val'] as $name => $value) {
        if (!isset($result[$name])) {
          $result[$name] = [];
        }
        $value = (string)$value;
        if (!isset($result[$name][$value])) {
          $result[$name][$value] = $row['prob'];
        } else {
          $result[$name][$value] += $row['prob'];
        }
      }
    }
    return $result;
  }

  public function getHelperMethods() {
    return <<<EOT
var softEvidence = function(s_value, value, p) {
  if (s_value === value) {
    return bernoulli({p: p})
  }
  return bernoulli({p: 1-p})
}
  
var objToKey = function(o) {
  return JSON.stringify(o)
}

EOT;

  }
}