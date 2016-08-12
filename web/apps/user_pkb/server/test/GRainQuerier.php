<?php
// init config
$path = dirname(__FILE__);
require_once ($path.'/../../../../../web/lib/server/Config.php');
$c = new Config();

include_once('../GRainQuerier.php');

$grain_querier = new GRainQuerier($c->getRscriptPath(), $c->getDefaultPath('tmp'));

/**
 * GRAPH 3:
 *   h1 ---> e1 <--- h2
 */
$nodes = array(
  'h1'=>array(1,2),
  'h2'=>array(1,2),
  'e1'=>array(1,2)
);
$edges = array(
  array("h1","e1"),
  array("h2","e1")
);

$graph = array('nodes'=>$nodes, 'edges'=>$edges);

$probabilities = array(
  'e1'=>array(
    'soft'=>array('1'=>0.85, '2'=>0.15), // soft evidence for e2 and ^e2
    '{"h1":"1","h2":"1"}'=>array('1'=>0.9,  '2'=>0.1), // sum must be equal to 1
    '{"h1":"1","h2":"2"}'=>array('1'=>0.15, '2'=>0.85), // sum must be equal to 1
    '{"h1":"2","h2":"1"}'=>array('1'=>0.2,  '2'=>0.8), // sum must be equal to 1
    '{"h1":"2","h2":"2"}'=>array('1'=>0.25, '2'=>0.75)  // sum must be equal to 1
  ),
);

// =========== test 1
$args = $grain_querier->getOrderedCptableArgs(array('h1','h2'),$nodes,$probabilities['e1'],$nodes['e1']);

var_dump($args, array(
    'grain_node_names'=>array('node_h1','node_h2'),
    'values'=>array(0.9,0.1,0.2,0.8,0.15,0.85,0.25,0.75),
    'levels'=>array('1', '2')
));

$text = $grain_querier->createScriptText($graph,$probabilities);

// =========== test 2
var_dump($text,"library(gRain)\n
node_h1 <- cptable(~node_h1,values=c(0.5, 0.5),levels=c('1', '2'))\n
node_h2 <- cptable(~node_h2,values=c(0.5, 0.5),levels=c('1', '2'))\n
node_e1 <- cptable(~node_e1|node_h1:node_h2,values=c(0.9, 0.1, 0.2, 0.8, 0.15, 0.85, 0.25, 0.75),levels=c('1', '2'))\n
plist <- compileCPT(list(node_h1,node_h2,node_e1))\n
net <- grain(plist)\n
net <- setEvidence(net, evidence=list(node_e1=c(0.85,0.15)))\n
querygrain(net, nodes=c('node_h1','node_h2'), type='marginal')");

// =========== test 3
$result = $grain_querier->queryGrain($graph, $probabilities);
var_dump($result, array (
    'h1' =>
        array (
            1 => '0.6272727',
            2 => '0.3727273',
        ),
    'h2' =>
        array (
            1 => '0.6484848',
            2 => '0.3515152',
        ),
));
