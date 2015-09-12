<?php
$path = dirname(__FILE__);
require_once ($path.'/../web/lib/server/Config.php');
require_once ($path.'/../web/lib/server/DB.php');
$c = new Config();
$db = new DB($c->getDbConf());

$colors = array("#00BFFF","#87CEFA","#3CB371","#8FBC8F","#FF69B4","#FF0000","#FFFFE0","#FFFF00","#FFA500");

$query = "SELECT id, graph FROM `graph`";
$rows = $db->execute($query);
foreach($rows as $row){
  $query = "SELECT settings FROM `graph_settings` WHERE graph_id = ".$row['id'];
  $settings = json_decode($db->execute($query)[0]['settings'], true);

  $edgeTypeColors = array();
  $edgeTypes = json_decode($row['graph'], true)['edgeTypes'];
  foreach($edgeTypes as $i => $type){
    $edgeTypeColors[$type] = $colors[$i];
  }

  $nodeTypeColors = array();
  $nodeTypes = json_decode($row['graph'], true)['nodeTypes'];
  foreach($nodeTypes as $i => $type){
    $nodeTypeColors[$type] = $colors[$i];
  }

  $settings['skin'] = array(
    "node"=>array(
      "constr"=>array(
        "withoutIcon"=>"GraphViewNode",
        "withIcon"=>"GraphViewNodeImage"
      ),
      "attr"=>array("typeColors"=>$nodeTypeColors)
    ),
    "edge"=>array(
      "constr"=>"GraphViewEdge",
      "attr"=>array("typeColors"=>$edgeTypeColors)
    ),
    "nodeLabel"=>array(
      "constr"=>"GraphViewNodeLabel",
      "attr"=>array('font'=>'Calibri', 'fill'=>'#BBBBBB', 'maxSize'=>24)
    )
  );

  $update_query = "UPDATE graph_settings SET settings = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE graph_id = ".$row['id'];
  echo $update_query."\n\n";
  $db->execute($update_query);
}
?>