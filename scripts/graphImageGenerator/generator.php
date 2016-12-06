<?php
include('../../web/lib/server/Config.php');
include('../../web/lib/server/DB.php');
include("../../web/apps/frontend/server/EmbGraph.php");

$c = new Config();
$db = new DB($c->getDbConf());

// for each graph generate its jpeg image with #node converter.js graph.svg
$q = "SELECT * FROM graph LIMIT 2";
var_dump($db->execute($q));