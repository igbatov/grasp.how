<?php
class GraphDiffCreator{
  private $original;
  private $clone;
  private $db;
  private $node_attributes;
  private $all_originally_cloned_node_content_ids;

  public function __construct($db, $original, $clone, $node_attributes){
    $this->db = $db;
    $this->original = $original;
    $this->clone = $clone;
    $this->node_attributes = $node_attributes;

    // fill in all_originally_cloned_node_content_ids (remember, some of them may be already removed in $this->clone['element']['nodes'])
    $q = "SELECT cloned_from_node_content_id FROM node_content WHERE cloned_from_graph_id = ".$this->original['graphId'];
    $rows = $this->db->execute($q);
    foreach($rows as $row) $this->all_originally_cloned_node_content_ids[] = $row['cloned_from_node_content_id'];

    // check that they indeed clones

  }

  /**
   * Combine original graph and cloned one into one model that has 'diff' attribute
   * @return array
   */
  public function getDiffGraph(){
    $diff_nodes = $this->getDiffNodes();
    $diff_edges = $this->getDiffEdges($diff_nodes);


    return array(
        'nodes'=>$nodes,
        'edges'=>$edges,
        'settings'=>$settings,
        'graphNodeAttributes'=>$graphNodeAttributes,
        'graphEdgeAttributes'=>$graphEdgeAttributes
    );
  }

  /**
   * Create array of edges with all edges from original and new from clone
   * @param $nodes
   * @return array
   */
  public function getDiffEdges($nodes){
    $combined_edges = array();

    foreach($this->original['elements']['edges'] as $edge){
      $s = $this->findIndex($nodes, 'originalContentId', explode('-', $this->original['elements']['nodes'][$edge['source']]['nodeContentId'])[1]);
      $t = $this->findIndex($nodes, 'originalContentId', explode('-', $this->original['elements']['nodes'][$edge['target']]['nodeContentId'])[1]);
      $combined_edges[$s."-".$t] = array(
          'source'=>$s,
          'target'=>$t,
          'edgeContentId'=>array('original'=>$edge['edgeContentId']), 'clone'=>null);
    }

    // add all from cloned one (edges with the same source and destination will be rewrited)
    foreach($this->clone['elements']['edges'] as $edge){
      $s = $this->findIndex($nodes, 'clonedContentId', explode('-', $this->clone['elements']['nodes'][$edge['source']]['nodeContentId'])[1]);
      $t = $this->findIndex($nodes, 'clonedContentId', explode('-', $this->clone['elements']['nodes'][$edge['target']]['nodeContentId'])[1]);
      if(isset($combined_edges[$s."-".$t])) $combined_edges[$s."-".$t] = array(
        'source'=>$s,
        'target'=>$t,
        'edgeContentId'=>array('original'=>$edge['edgeContentId'], 'clone'=>$edge['edgeContentId']),
        'attributes'=>array()
      );
      else $combined_edges[$s."-".$t] = array(
        'source'=>$s,
        'target'=>$t,
        'edgeContentId'=>array('original'=>null, 'clone'=>$edge['edgeContentId']),
        'attributes'=>array()
      );
    }

    // format edge array in a standard way
    $count = 0;
    foreach($combined_edges as $i => $edge){
      $count++;
      $combined_edges[$count] = array(
          'id'=>$count,
          'source'=>$edge['source'],
          'target'=>$edge['target'],
          'edgeContentId'=>$edge['edgeContentId'],
          'attributes'=>$edge['attributes'],
      );
      unset($combined_edges[$i]);
    }

    return $combined_edges;
  }

  private function findIndex($array, $key, $value){
    foreach($array as $index=>$row){
      if($row[$key] == $value) return $index;
    }
    return false;
  }

  /**
   * Create array of nodes with all nodes from original and new nodes from clone
   * Return array('originalContentId'=> , 'clonedContentId'=> , 'status'=> ). There are four types of diff nodes
   * 1. "added_by_clonee": originalContentId = null, clonedContentId != null - nodes added by cloner
   * 2. "removed": originalContentId != null, clonedContentId == null - nodes deleted by cloner or added later by author of original graph (clonee)
   * 3. "modified" or "unmodified": originalContentId != null, clonedContentId != null - nodes that stay in cloned graph and may be modified on untouched
   * @return array
   */
  public function getDiffNodes(){
    $combined_nodes = array();

    // == add nodes of clone to $combined_nodes ==
    $clone_node_content_ids = $this->getNodeContentIds($this->clone['elements']['nodes']);

    $q = "SELECT graph_id, text, node_content_id, ".implode(', ', $this->node_attributes).", cloned_from_graph_id, cloned_from_node_content_id FROM node_content WHERE node_content_id IN (".implode(',', $clone_node_content_ids).") AND graph_id = ".$this->clone["graphId"];
    $rows = $this->db->execute($q);

    foreach($rows as $row){
      // if it is cloned
      if($row['cloned_from_node_content_id'] != null){
        $status = 'unmodified';
        foreach($this->node_attributes as $attr) if($row[$attr] != null) $status = 'modified';
        if($row['text'] != null) $status = 'modified';
        $combined_nodes[] = array('contentId'=>array('original'=>$this->original['graphId']."-".$row['cloned_from_node_content_id'], 'clone'=>$this->clone["graphId"]."-".$row['node_content_id']), 'attributes'=>array('stickers'=>[$status]));
      }
      // if it was brand new node
      else{
        $combined_nodes[] = array('contentId'=>array('original'=>null, 'clone'=>$this->clone["graphId"]."-".$row['node_content_id'], 'attributes'=>array('stickers'=>['added_by_cloner']));
      }
    }

    // == now add nodes of original graph to $combined_nodes ==
    $original_node_content_ids = $this->getNodeContentIds($this->original['elements']['nodes']);

    // take original node_content_ids of clones nodes
    $original_nodes_already_in_combined = array();
    foreach($combined_nodes as $combined_node) if($combined_node['originalContentId'] != null) $original_nodes_already_in_combined[] = $combined_node['originalContentId'];

    // get all nodes that is in $this->original but not in $combined_nodes yet
    $q = "SELECT graph_id, text, node_content_id, ".implode(', ', $this->node_attributes)." FROM node_content WHERE node_content_id IN (".implode(',', $original_node_content_ids).") AND node_content_id NOT IN (".implode(',', $original_nodes_already_in_combined).") AND graph_id = ".$this->original["graphId"];
    $rows = $this->db->execute($q);
    foreach($rows as $row){
      $status = in_array($row['node_content_id'], $this->all_originally_cloned_node_content_ids) ? 'removed' : 'added_by_clonee';
      $combined_nodes[] = array('contentId'=>array('original'=>$this->original["graphId"]."-".$row['node_content_id'], 'clone'=>null),  'attributes'=>array('stickers'=>[$status]));
    }

    return $combined_nodes;
  }

  /**
   * Returns array of node_content_ids from $this->original['elements']['nodes'] or $this->clone['elements']['nodes']
   * @param $nodes
   * @return array
   */
  public function getNodeContentIds($nodes){
    $node_content_ids = array();
    foreach($nodes as $node){
      $tmp = explode('-', $node["nodeContentId"]);
      $node_content_ids[] = $tmp[1];
    }
    return $node_content_ids;
  }
}
?>