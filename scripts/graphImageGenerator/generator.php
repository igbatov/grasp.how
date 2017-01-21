#!/usr/bin/php
<?php
$curdir = dirname(__FILE__);
$root = $curdir."/../..";
$node = '/root/.nvm/versions/node/v4.4.3/bin/node';

chdir($curdir);

/* handle cli args  */
if(isset($argv[1]) && is_numeric($argv[1])) $graph_id = $argv[1];
else $graph_id = null;

include($root.'/web/lib/server/Config.php');
include($root.'/web/lib/server/DB.php');
include($root.'/web/lib/server/GraphDiffCreator.php');
include($root.'/web/lib/server/ContentIdConverter.php');
include($root.'/web/lib/server/Graphs.php');
include($root.'/web/lib/server/ErrorHandler.php');
include($root.'/web/lib/server/Logger.php');
include($root."/web/apps/frontend/server/EmbGraph.php");
$image = new Imagick();

$c = new Config();
$db = new DB($c->getDbConf());
$contentIdConverter = new ContentIdConverter();
$eh = new ErrorHandler();
$logger = new Logger($db, $eh, $curdir.'../../logs', 'generator.php');
$graphs = new Graphs($db, $contentIdConverter, $logger, null);
$emb_graph = new EmbGraph($db, $contentIdConverter, $graphs);
// for each graph generate its jpeg image with #node converter.js graph.svg
$q = "SELECT id FROM graph ".($graph_id ? "WHERE id = '".$graph_id."'" : "");
foreach($db->execute($q) as $row){
  // wrap in try-catch for one bad graph could not stop all proccess
  try{
    file_put_contents($curdir.'/graph.json', json_encode($emb_graph->getGraphsData(array($row['id']))[$row['id']]));
    exec($node.' '.$curdir.'/converter.js '.$curdir.'/graph.json '.$curdir.'/'.$row['id']);

    $svg = file_get_contents($curdir.'/'.$row['id'].'.svg');
    $svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'.$svg;
    $image->readImageBlob($svg);
    $image->setImageFormat('jpg');
    $image->setImageCompressionQuality(90);
    $image->writeImage($curdir.'/'.$row['id'].".jpg");

    // mv jpeg to its directory
    exec('mv '.$curdir.'/'.$row['id'].".jpg"." ".$root."/web/img/graph_shots");

    // remove tmp files
    unlink($curdir.'/'.$row['id'].'.svg');
    unlink($curdir.'/graph.json');
  }catch (Exception $e) {
    error_log('generator.php, graph_id='.$row['id'].' '.$e->getMessage());
  }    
}

