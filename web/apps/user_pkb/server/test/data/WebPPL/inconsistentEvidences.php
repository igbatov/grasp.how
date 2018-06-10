<?php
/**
 * GRAPH:
 *    e2 <-- h1 --> e1
 */
$graph = [
    'nodes'=>[
        'e1'=>[1,2], 'e2'=>[1,2], 'h1'=>[1,2]
    ],
    'edges'=>
    [
        ["h1","e1"],
        ["h1","e2"]
    ]
];

$probabilities = [
    'e1'=>[
        'soft'=>['1'=>1, '2'=>0], // soft evidence for e1 and ^e1
        '{"h1":"1"}'=>[1=>1, 2=>0], // sum must be equal to 1
        '{"h1":"2"}'=>[1=>0, 2=>1]  // sum must be equal to 1
    ],
    'e2'=>[
        'soft'=>['1'=>1, '2'=>0], // soft evidence for e1 and ^e1
        '{"h1":"1"}'=>[1=>0, 2=>1], // sum must be equal to 1
        '{"h1":"2"}'=>[1=>1, 2=>0]  // sum must be equal to 1
    ],
    'h1'=>[]
];

$expectedProbScript = <<<EOT
      
var e1 = function(s) {
  var p = {
    '{"h1":1}':{'keys':[1,2], 'values':[1,0]},
    '{"h1":2}':{'keys':[1,2], 'values':[0,1]},
  };
  var sp = p[objToKey(s)];
  return categorical({vs:sp['keys'], ps:sp['values']});
}
      
var e2 = function(s) {
  var p = {
    '{"h1":1}':{'keys':[1,2], 'values':[0,1]},
    '{"h1":2}':{'keys':[1,2], 'values':[1,0]},
  };
  var sp = p[objToKey(s)];
  return categorical({vs:sp['keys'], ps:sp['values']});
}
      
var h1 = function() {
  return categorical({vs:[1, 2], ps:[0.5, 0.5]});
}

EOT;

$expectedMainScript = <<<EOT
var model = function() {    
  var sh1 = h1();
  var se1 = e1({"h1":sh1});
  condition(se1 === 1);
  var se2 = e2({"h1":sh1});
  condition(se2 === 1);
  return {"h1":sh1};

}

var dist = Infer(
  {},
  model
);

console.log(JSON.stringify(dist.getDist()));
EOT;

$expectedResult = <<<EOT

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
