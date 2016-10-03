<?php
/**
 * This file is running by script/cron.php
 *
 * we can use here (all defined in cli.bootstrap.php)
 * - $db to access DB
 * - $eh to throwError
 */

/**
 * This script adds to node_content_history add nodes updated the day before
 */

$q = 'SELECT * FROM node_content WHERE updated_at LIKE "'.date('Y-m-d', strtotime(' -1 day')).' %" ';
foreach($db->execute($q) as $row){
  try{
    $q = 'INSERT INTO node_content_history SET graph_id = "'.$row['graph_id'].'", local_content_id = "'.$row['local_content_id'].'", datetime = "'.$row['updated_at'].'", type = "'.$row['type'].'", reliability = "'.$row['reliability'].'", importance = "'.$row['importance'].'", label = "'.$db->escape($row['label']).'", text = "'.$db->escape($row['text']).'", has_icon = "'.$row['has_icon'].'"';
    $db->execute($q);
  }catch (Exception $e){
    error_log($e->getMessage());
  }
}