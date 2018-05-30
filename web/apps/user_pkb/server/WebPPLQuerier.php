<?php
class WebPPLQuerier extends AbstractQuerier
{
  /**
   * Create webppl script and execute it
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

  console.log(dist.getDist())
   *
   * @param $graph
   * @param $probabilities
   * @return string
   */
  public function createScriptText($graph, $probabilities){
    $this->sanityCheck($graph, $probabilities);
    $script = "";
    $script .= $this->getHelperMethods();
    $script .= $this->getNodeMethods($probabilities);
    $script .= $this->getMain($graph, $probabilities);
    return $script;
  }

  public function sanityCheck($graph, $probabilities) {
    foreach ($graph['nodes'] as $nodeName) {
      // check that nodeName can be used as js function name
      if (preg_match('/^[A-Za-z_][A-Za-z_0-9]*$/', $nodeName) !== 1) {
        throw new Exception('Bad node name: '.$nodeName.'. Node name should start with letter and can contain only letters, digits, underscores.');
      }
    }
  }

  public function getNodeMethods($probabilities) {
    $text = "";
    foreach ($probabilities as $nodeName => $probs) {
      if (isset($probs['formula'])) {
        $text .=<<<EOT
      
var function {$nodeName}(s) {

EOT;
        $text .= "\n".$probs['formula']."\n";
      } else if (isset($probs['soft']) && count($probs) === 1) {
        // fact without incoming nodes
        $text .=<<<EOT
      
var function {$nodeName}() {
  return categorical({vs:[1, 2], ps:[0.5, 0.5]});

EOT;
      } else {
        $text .=<<<EOT
      
var function {$nodeName}(s) {
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

  public function getMain($graph, $probabilities) {
    $returnObj = "";
    $text = "";
    $roots = $this->getNextRoots($graph);
    while(!empty($roots)){
      foreach ($roots as $nodeName) {
        if (!isset($this->inbound[$nodeName])) {
          $text .= "var s".$nodeName." = ".$nodeName."();\n";
        } else {
          $parents = $this->inbound[$nodeName];
          $args = '';
          foreach ($parents as $parent => $v) {
            $args .= '"'.$parent.'":s'.$parent.',';
          }
          $text .= "var s".$nodeName." = ".$nodeName."({".substr($args, 0,strlen($args)-1)."});\n";
        }

        if (isset($probabilities[$nodeName]['soft'])) {
          // this is fact, so make condition for it
          $soft = $probabilities[$nodeName]['soft'];
          if ($soft[1] === 1) {
            // hard evidence
            $text .= "condition(s".$nodeName." === 1);\n";
          } else {
            // soft evidence
            $text .= "condition(softEvidence(s".$nodeName.", 1, ".$soft[1].") === true);\n";
          }
        } else {
          // it is hypothesis, include it in return object
          $returnObj .= '"'.$nodeName.'":s'.$nodeName.',';
        }
      }

      // get next layer of nodes
      $roots = $this->getNextRoots($graph);
    }
    $returnObj = "return {".substr($returnObj, 0, strlen($returnObj)-1)."};\n";
    $text .= $returnObj;
    return <<<EOT
var model = function() {    
  {$text}
}

var dist = Infer(
  {},
  model
);

console.log(dist.getDist())
EOT;

  }

  public function prepareScriptOutput($exec_output) {

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