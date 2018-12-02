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
   * @param $localGraphId
   * @param $timestamp - unix timestamp epoch
   * @return int
   */
  public function createSnapshots($authId, $updatedInPeriod=null, $localGraphId=null, $timestamp=null)
  {
    if (!$timestamp) {
      $timestamp = time();
    }

    $q = 'SELECT * FROM node_content';
    $where = '';
    if ($updatedInPeriod) {
      $where = ' updated_at LIKE "'.date('Y-m-d', strtotime($updatedInPeriod)).' %" ';
    }

    if (!empty($localGraphId)) {
      $where .= ($where ? ' AND ' : '')." graph_id = '".$localGraphId."'";
    }

    if ($where) {
      $q .= ' WHERE '.$where;
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
        .'alternative_id = "'.$row['alternative_id'].'", '
        .'active_alternative_id = "'.$row['active_alternative_id'].'", '
        .'p = "'.$this->db->escape($row['p']).'", '
        .'value_type = "'.$this->db->escape($row['value_type']).'", '
        .'value_range = "'.$this->db->escape($row['value_range']).'", '
        .'stickers = "'.$this->db->escape($row['stickers']).'", '
        .'datetime = "'.$row['updated_at'].'", '
        .'type = "'.$row['type'].'", '
        .'reliability = "'.$row['reliability'].'", '
        .'importance = "'.$row['importance'].'", '
        .'label = "'.$this->db->escape($row['label']).'", '
        .'`text` = "'.$this->db->escape($row['text']).'", '
        .'has_icon = "'.$row['has_icon'].'", '
        .'created_at = "'.date('Y-m-d H:i:s', time()).'", '
        .'snap_timestamp = "'.$this->db->escape($timestamp).'"';

    return $q;
  }
}

