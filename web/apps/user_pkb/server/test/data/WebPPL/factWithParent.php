<?php
/**
 * GRAPH:
 *    e2 --> h1 --> e1
 */
$graph = [
    'nodeTypes' => [
        'e1'=>Graphs::NODE_VALUE_TYPE_LABELLED, 'e2'=>Graphs::NODE_VALUE_TYPE_LABELLED, 'h1'=>Graphs::NODE_VALUE_TYPE_LABELLED
    ],
    'nodes'=>[
        'e1'=>[1,2], 'e2'=>[1,2], 'h1'=>[1,2]
    ],
    'edges'=>
        [
            ["e2","h1"],
            ["h1","e1"]
        ]
];

$probabilities = [
    'e1'=>[
        'soft'=>['1'=>0.9, '2'=>0.1], // soft evidence for e1 and ^e1
        '{"h1":"1"}'=>[1=>0.001, 2=>0.999], // sum must be equal to 1
        '{"h1":"2"}'=>[1=>0.999, 2=>0.001]  // sum must be equal to 1
    ],
    'e2'=>[
        'soft'=>['1'=>1, '2'=>0], // soft evidence for e2 and ^e2
    ],
    'h1'=>[
        '{"e2":"1"}'=>[1=>0.9999, 2=>0.0001],
        '{"e2":"2"}'=>[1=>0.5, 2=>0.5]
    ]
];

$expectedProbScript = <<<EOT
      
var e1 = function(s) {
  var p = {
    '{"h1":1}':{'keys':[1,2], 'values':[0.001,0.999]},
    '{"h1":2}':{'keys':[1,2], 'values':[0.999,0.001]},
  };
  var sp = p[objToKey(s)];
  return categorical({vs:sp['keys'], ps:sp['values']});
}
      
var e2 = function() {
  return categorical({vs:[1, 2], ps:[0.5, 0.5]});
}
      
var h1 = function(s) {
  var p = {
    '{"e2":1}':{'keys':[1,2], 'values':[0.9999,0.0001]},
    '{"e2":2}':{'keys':[1,2], 'values':[0.5,0.5]},
  };
  var sp = p[objToKey(s)];
  return categorical({vs:sp['keys'], ps:sp['values']});
}

EOT;

$expectedMainScript = <<<EOT
var model = function() {    
  var se2 = e2();
  condition(se2 === 1);
  var sh1 = h1({"e2":se2});
  var se1 = e1({"h1":sh1});
  condition(softEvidence(se1, 1, 0.9) === true);
  return {"h1":sh1};

}

var dist = Infer(
  {},
  model
);

console.log(JSON.stringify(dist.getDist()));
EOT;

$expectedResult = <<<EOT
{"h1":{"2":0.0008913574803449336,"1":0.9991086425196549}}
EOT;

return [
    'graph' => $graph,
    'probabilities' => $probabilities,
    'expected' => [
        'probScript' => $expectedProbScript,
        'mainScript' => $expectedMainScript,
        'result' => $expectedResult,
    ]
];
