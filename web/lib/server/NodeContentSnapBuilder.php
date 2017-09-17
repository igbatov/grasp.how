<?php
/**
 * This class creates snapshots of node contents ans saves them in node_content_history
 */
class NodeContentSnapBuilder{
  private $db;
  public function __construct($db)
  {
    $this->db = $db;
  }

  /**
   * Creates snapshots of all node_contents and returns timestamp of transaction.
   * If $updatedInPeriod is set than it will snapshot only node_content updated in the period
   * from $updatedInPeriod till now
   * @param $authId
   * @param $updatedInPeriod - in a form that strtotime understands
   * @return int
   */
  public function createSnapshots($authId, $updatedInPeriod=null)
  {
    $timestamp = time();
    $q = 'SELECT * FROM node_content';
    if ($updatedInPeriod) {
      $q .= ' WHERE updated_at LIKE "'.date('Y-m-d', strtotime($updatedInPeriod)).' %" ';
    }
    foreach($this->db->exec($authId, $q) as $row){
      try{
        $q = $this->getInsertQuery($row, $timestamp);
        $this->db->exec($authId, $q);
      }catch (Exception $e){
        error_log($e->getMessage());
      }
    }
    return $timestamp;
  }

  /**
   * @param $row - node_content row
   * @param $timestamp - unix timestamp at which we start making this snapshot
   * @return string
   */
  private function getInsertQuery($row, $timestamp)
  {
    $q = 'INSERT INTO node_content_history SET '
        .'graph_id = "'.$row['graph_id'].'", '
        .'local_content_id = "'.$row['local_content_id'].'", '
        .'datetime = "'.$row['updated_at'].'", '
        .'type = "'.$row['type'].'", '
        .'reliability = "'.$row['reliability'].'", '
        .'importance = "'.$row['importance'].'", '
        .'label = "'.$this->db->escape($row['label']).'", '
        .'text = "'.$this->db->escape($row['text']).'", '
        .'has_icon = "'.$row['has_icon'].'", '
        .'created_at = "'.date('Y-m-d H:i:s', time()).'", '
        .'snap_timestamp = "'.$timestamp.'"';

    return $q;
  }
}

