<?php
$path = dirname(__FILE__);
require_once ($path.'/../web/lib/server/Config.php');
require_once ($path.'/../web/lib/server/DB.php');
$c = new Config();
$db = new DB($c->getDbConf());

$query = "SELECT * FROM `graph_history`";
$rows = $db->execute($query);
foreach($rows as $row){
  $elements = json_decode($row['elements'], true);

  $new_nodes = array();
  foreach($elements['nodes'] as $node){
    if($node['isRoot'] == true){
      $root_id = $node['id'];
      $tmp = explode('-', $node['nodeContentId']);
      $q = "DELETE FROM node_content WHERE graph_id = ".$tmp[0]." AND node_content_id = ".$tmp[1];
     // echo $q."\n\n";
      $db->execute($q);
      continue;
    }
    $new_nodes[$node['id']] = array("id"=>$node['id'], "nodeContentId"=>$node['nodeContentId']);
  }

  $new_edges = array();
  foreach($elements['edges'] as $edge){
    if($edge['source'] == $root_id || $edge['target'] == $root_id){
      $tmp = explode('-', $edge['edgeContentId']);
      $q = "DELETE FROM edge_content WHERE graph_id = ".$tmp[0]." AND edge_content_id = ".$tmp[1];
   //   echo $q."\n\n";
      $db->execute($q);
      continue;
    }
    $new_edges[$edge['id']] = array("id"=>$edge['id'], "source"=>$edge["source"], "target"=>$edge["target"], "edgeContentId"=>$edge['edgeContentId']);
  }

  $q = "UPDATE graph_history SET elements = '".json_encode(array("nodes"=>$new_nodes, "edges"=>$new_edges))."' WHERE id = ".$row['id'];
 // echo $q."\n\n";
  $db->execute($q);
}