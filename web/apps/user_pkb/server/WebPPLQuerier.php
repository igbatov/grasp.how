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
    $script .= $this->getMain($probabilities);
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
      $text .= "var function ".$nodeName."() {\n";
      if (isset($probs['formula'])) {
        $text .= $probs['formula'];
      } else if (isset($probs['soft']) && count($probs) === 1) {
        // fact without incoming nodes
        $text .= "return categorical({vs:[1, 2], ps:[0.5, 0.5]})\n";
      } else {
        $text .= "var p = {\n";
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
            $text .= "'".$key."':{'keys':".json_encode($keys).", 'values':".json_encode($values)."},\n";
          }
        }
        $text .= "}\n";
        $text .= <<<EOT
  var sp = p[objToKey(s)];
  return categorical({vs:sp['keys'], ps:sp['values']});
EOT;
      }
      $text .= "}\n";
    }
  }

  public function getMain($probabilities) {

  }

  public function prepareScriptOutput($exec_output) {

  }

  private function getHelperMethods() {
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