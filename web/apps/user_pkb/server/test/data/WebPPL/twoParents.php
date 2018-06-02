<?php

/**
 * GRAPH:
 *  e2 --> h1 <-- e1
 */

$graph = [
    'nodes' => [
      'e1'=>[1,2],
      'e2'=>[1,2],
      'h1'=>[1,2]
    ],
    'edges' => [
      ["e2","h1"],
      ["e1","h1"]
    ]
];

$probabilities = [
    'e1'=>[
        'soft'=>['1'=>0.9, '2'=>0.1], // soft evidence for e1 and ^e1
    ],
    'e2'=>[
        'soft'=>['1'=>1, '2'=>0], // soft evidence for e2 and ^e2
    ],
    'h1'=>[
        '{"e2":"1", "e1":"1"}'=>[1=>0.9, 2=>0.1],
        '{"e2":"1", "e1":"2"}'=>[1=>0.99, 2=>0.01],
        '{"e2":"2", "e1":"1"}'=>[1=>0.999, 2=>0.001],
        '{"e2":"2", "e1":"2"}'=>[1=>0.9999, 2=>0.0001],
    ]
];

$expectedProbScript = <<<EOT
      
var e1 = function() {
  return categorical({vs:[1, 2], ps:[0.5, 0.5]});
}
      
var e2 = function() {
  return categorical({vs:[1, 2], ps:[0.5, 0.5]});
}
      
var h1 = function(s) {
  var p = {
    '{"e2":1,"e1":1}':{'keys':[1,2], 'values':[0.9,0.1]},
    '{"e2":1,"e1":2}':{'keys':[1,2], 'values':[0.99,0.01]},
    '{"e2":2,"e1":1}':{'keys':[1,2], 'values':[0.999,0.001]},
    '{"e2":2,"e1":2}':{'keys':[1,2], 'values':[0.9999,0.0001]},
  };
  var sp = p[objToKey(s)];
  return categorical({vs:sp['keys'], ps:sp['values']});
}

EOT;

$expectedMainScript = <<<EOT
var model = function() {    
  var se1 = e1();
  condition(softEvidence(se1, 1, 0.9) === true);
  var se2 = e2();
  condition(se2 === 1);
  var sh1 = h1({"e2":se2,"e1":se1});
  return {"h1":sh1};

}

var dist = Infer(
  {},
  model
);

console.log(dist.getDist());
EOT;

return [
    'graph' => $graph,
    'probabilities' => $probabilities,
    'expectedProbScript' => $expectedProbScript,
    'expectedMainScript' => $expectedMainScript,
];
