<?php

include('../../web/lib/server/Config.php');
include('../../web/lib/server/DB.php');
include("../../web/apps/frontend/server/EmbGraph.php");
$image = new Imagick();

$c = new Config();
$db = new DB($c->getDbConf());
$emb_graph = new EmbGraph($db);
// for each graph generate its jpeg image with #node converter.js graph.svg
$q = "SELECT id FROM graph LIMIT 2";
foreach($db->execute($q) as $row){
  file_put_contents('graph.json', json_encode($emb_graph->getGraphsData(array($row['id']))[$row['id']]));
  exec('node converter.js graph.json '.$row['id']);

  $svg = file_get_contents($row['id'].'.svg');
  $svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'.$svg;
  $image->readImageBlob($svg);
  $image->setImageFormat('jpeg');
  $image->setImageCompressionQuality(90);
  $image->writeImage ($row['id'].".jpg");
}

