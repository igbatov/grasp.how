#!/usr/bin/php
<?php
$curdir = dirname(__FILE__);
$root = $curdir."/../..";

chdir($curdir);

/* handle cli args  */
if(isset($argv[1]) && is_numeric($argv[1])) $graph_id = $argv[1];
else $graph_id = null;

include($root.'/web/lib/server/Config.php');
include($root.'/web/lib/server/DB.php');
include($root.'/web/lib/server/NestedDB.php');
include($root.'/web/lib/server/EscapeDB.php');
include($root.'/web/lib/server/MultiTenantDB.php');
include($root.'/web/lib/server/GraphDiffCreator.php');
include($root.'/web/lib/server/ContentIdConverter.php');
include($root.'/web/lib/server/GraphIdConverter.php');
include($root.'/web/lib/server/Graphs.php');
include($root.'/web/lib/server/ErrorHandler.php');
include($root.'/web/lib/server/Logger.php');
include($root.'/web/lib/server/Helper.php');
include($root."/web/apps/frontend/server/EmbGraph.php");
include('GraphImageGenerator.php');

$c = new Config();
$db = new MultiTenantDB(
    new EscapeDB(
        new NestedDB($c->getDbConf())
    ),
    $c->get('userDBPrefix'),
    $c->getDbConf()->dbName
);
$contentIdConverter = new ContentIdConverter();

// set default log file
ini_set('error_log', $c->getDefaultPath('log')."/error_log.log");
error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);
$eh = new ErrorHandler();
$logger = new Logger($db, $eh, $curdir.'../../logs', 'generator.php');

$graphIdConverter = new GraphIdConverter($logger);

$authIds = [];
if($graph_id){
  $graphIdConverter->throwIfNotGlobal($graph_id);
  $localGraphId = $graphIdConverter->getLocalGraphId($graph_id);
  $authId = $graphIdConverter->getAuthId($graph_id);
  $authIds = [$authId];
}else{
  $q = "SELECT id FROM auth";
  $rows = $db->exec(null, $q);
  foreach ($rows as $row) {
    $authIds[] = $row['id'];
  }
}
$graphs = new Graphs($db, $contentIdConverter, $graphIdConverter, $logger);
$emb_graph = new EmbGraph($db, $contentIdConverter, $graphIdConverter, $graphs);
$helper = new Helper();
$graphImageGenerator = new GraphImageGenerator($emb_graph, $helper, $logger);
// for each user
foreach ($authIds as $authId){
// for each graph generate its jpeg image with #node converter.js graph.svg
  $q = "SELECT id FROM graph ".($graph_id ? "WHERE id = '".$localGraphId."'" : "");
  foreach($db->exec($authId, $q) as $row){
    $globalGraphId = $graphIdConverter->createGlobalGraphId($authId, $row['id']);
    // wrap in try-catch for one bad graph could not stop all proccess
    try{
      $graphImageGenerator->getImage([
        'graphId' => $globalGraphId,
        'step'=>null, // last step
        'ts'=>time()
      ]);
    }catch (Exception $e) {
      error_log('generator.php, graph_id='.$globalGraphId.' '.$e->getMessage());
    }
  }
}

