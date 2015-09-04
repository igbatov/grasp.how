<?php
$path = dirname(__FILE__);
require_once ($path.'/../web/lib/server/Config.php');
require_once ($path.'/../web/lib/server/DB.php');
$c = new Config();
$db = new DB($c->getDbConf());

$query = "SELECT id, graph FROM `graph`";
$rows = $db->execute($query);
foreach($rows as $row){
  $settings = json_decode($row['graph'], true);
  $settings['attributes'] = array('isInTrash'=>$settings['isInTrash']);
  unset($settings['isInTrash']);
  //echo $settings['name'];
  $update_query = "UPDATE graph SET graph = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE id = ".$row['id'];
  //echo $update_query."\n";
  $db->execute($update_query);
}
?>