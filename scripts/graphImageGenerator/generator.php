<?php
$root = "../../";
$curdir = dirname(__FILE__);
include($root.'web/lib/server/Config.php');
include($root.'web/lib/server/DB.php');
include($root."web/apps/frontend/server/EmbGraph.php");
$image = new Imagick();

$c = new Config();
$db = new DB($c->getDbConf());
$emb_graph = new EmbGraph($db);
// for each graph generate its jpeg image with #node converter.js graph.svg
$q = "SELECT id FROM graph LIMIT 2";
foreach($db->execute($q) as $row){
  file_put_contents('graph.json', json_encode($emb_graph->getGraphsData(array($row['id']))[$row['id']]));
  exec('node '.$curdir.'/converter.js '.$curdir.'/graph.json '.$curdir.'/'.$row['id']);

  $svg = file_get_contents($row['id'].'.svg');
  $svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'.$svg;
  $image->readImageBlob($svg);
  $image->setImageFormat('jpeg');
  $image->setImageCompressionQuality(90);
  $image->writeImage($row['id'].".jpg");

  // mv jpeg to its directory
  exec('mv '.$curdir.'/'.$row['id'].".jpg"." ".$root."web/img/");

  // remove tmp files
  unlink($curdir.'/'.$row['id'].'.svg');
  unlink($curdir.'/graph.json');
}

