<?php
// init config
$path = dirname(__FILE__);
require_once ($path.'/../../../../../web/lib/server/Config.php');
$c = new Config();

include_once('../Pymc3Querier.php');

$pymc3_querier = new Pymc3Querier($c->getPymc3Path(), $c->getDefaultPath('tmp'));

/**
 * GRAPH 1:
 *    e2 --> h1 --> e1
 */
$nodes = [
    'e1'=>[1,2],
    'e2'=>[1,2],
    'h1'=>[1,2]
];
$edges = [
    ["e2","h1"],
    ["h1","e1"]
];

$graph = ['nodes'=>$nodes, 'edges'=>$edges];

$probabilities = [
    'e1'=>[
        'soft'=>['1'=>0.9, '2'=>0.1], // soft evidence for e1 and ^e1
        '{"h1":"1"}'=>[1=>0.01, 2=>0.99], // sum must be equal to 1
        '{"h1":"2"}'=>[1=>0.99, 2=>0.01]  // sum must be equal to 1
    ],
    'e2'=>[
        'soft'=>['1'=>1, '2'=>0], // soft evidence for e2 and ^e2
    ],
    'h1'=>[
       '{"e2":"1"}'=>[1=>0.9999, 2=>0.0001],
       '{"e2":"2"}'=>[1=>0.99, 2=>0.01]
    ]
];

// =========== test 1
$pymc3_querier->initEdgeHashes($graph);
$args = $pymc3_querier->createProbabilitiesPart($graph, $probabilities);

var_dump($args, '');