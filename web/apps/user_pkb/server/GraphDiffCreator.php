<?php

class GraphDiffCreator{
  private $original;
  private $clone;
  private $db;
  private $node_attributes;
  private $contentIdConverter;
  private $all_originally_cloned_local_content_ids;

  public function __construct($db, $original, $clone, $node_attributes, ContentIdConverter $contentIdConverter){
    $this->db = $db;
    $this->original = $original;
    $this->clone = $clone;
    $this->node_attributes = $node_attributes;
    $this->contentIdConverter = $contentIdConverter;

    // fill in all_originally_cloned_local_content_ids (remember, some of them may be already removed in $this->clone['element']['nodes'])
    $q = "SELECT cloned_from_local_content_id FROM node_content WHERE graph_id = ".$this->clone['graphId']." AND cloned_from_graph_id = ".$this->original['graphId']." AND cloned_from_local_content_id IS NOT NULL";
    $rows = $this->db->execute($q);
    foreach($rows as $row) $this->all_originally_cloned_local_content_ids[] = $row['cloned_from_local_content_id'];
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
   * Create array of nodes with all nodes from original and new nodes from clone
   * Return array('originalContentId'=> , 'clonedContentId'=> , 'status'=> ). There are 5 types of diff nodes
   * 1 "added_by_clonee" - nodes added in original graph while clone was edited
   * 2 "added_by_cloner": originalContentId == null, clonedContentId != null - nodes added by cloner
   * 3 "removed_by_cloner" - nodes deleted by cloner
   * 4,5 "modified" or "unmodified": originalContentId != null, clonedContentId != null - nodes that stay in cloned graph and may be modified on untouched
   * @return array
   */
  public function getDiffNodes(){
    $combined_nodes = array();

    /** == add nodes of clone to $combined_nodes == **/
    $clone_local_content_ids = $this->getNodeContentIds($this->clone['elements']['nodes']);

    $q = "SELECT graph_id, text, local_content_id, ".implode(', ', $this->node_attributes).", cloned_from_graph_id, cloned_from_local_content_id FROM node_content WHERE local_content_id IN (".implode(',', $clone_local_content_ids).") AND graph_id = ".$this->clone["graphId"];
    $rows = $this->db->execute($q);

    foreach($rows as $row){
      // if it is cloned
      if($row['cloned_from_local_content_id'] != null){
        // determine if any attr was modified
        $status = 'unmodified';
        foreach($this->node_attributes as $attr) if($row[$attr] != null) $status = 'modified';
        if($row['text'] != null) $status = 'modified';

        // form attributes for diff graph node
        $attrs = array();
        foreach($this->node_attributes as $attr) $attrs[$attr] = $row[$attr];
        $attrs['stickers']=array($status);

        // form diff graph nodes
        $combined_nodes[] = array(
          'contentId'=>array(
            'original'=>$this->contentIdConverter->createGlobalContentId($this->original['graphId'], $row['cloned_from_local_content_id']),
            'clone'=>$this->contentIdConverter->createGlobalContentId($this->clone["graphId"],$row['local_content_id'])),
          'attributes'=>$attrs
        );
      }
      // if it was brand new node
      else{
        // form attributes for diff graph node
        $attrs = array();
        foreach($this->node_attributes as $attr) $attrs[$attr] = $row[$attr];
        $attrs['stickers']=array('added_by_cloner');

        // form diff graph nodes
        $combined_nodes[] = array(
          'contentId'=>array(
            'original'=>null,
            'clone'=>$this->contentIdConverter->createGlobalContentId($this->clone["graphId"],$row['local_content_id'])
          ),
          'attributes'=>$attrs
        );
      }
    }

    /** == now add nodes of original graph to $combined_nodes == **/
    $original_local_content_ids = $this->getNodeContentIds($this->original['elements']['nodes']);

    // take original local_content_ids of clones nodes
    $original_nodes_already_in_combined = array();
    foreach($combined_nodes as $combined_node) if($combined_node['contentId']['original'] != null) $original_nodes_already_in_combined[] = $combined_node['contentId']['original'];

    // get all nodes that is in $this->original but not in $combined_nodes yet
    $q = "SELECT graph_id, text, local_content_id, ".implode(', ', $this->node_attributes)." FROM node_content WHERE".
        " local_content_id IN (".implode(',', array_diff($original_local_content_ids, $original_nodes_already_in_combined)).") AND".
        " graph_id = ".$this->original["graphId"];
    $rows = $this->db->execute($q);
    foreach($rows as $row){
      // determine status of the node
      $status = in_array($row['local_content_id'], $this->all_originally_cloned_local_content_ids) ? 'removed_by_cloner' : 'added_by_clonee';

      // form attributes for diff graph node
      $attrs = array();
      foreach($this->node_attributes as $attr) $attrs[$attr] = $row[$attr];
      $attrs['stickers']=array($status);

      $combined_nodes[] = array(
        'contentId'=>array(
            'original'=>$this->contentIdConverter->createGlobalContentId($this->original["graphId"],$row['local_content_id']),
            'clone'=>null
        ),
        'attributes'=>$attrs
      );
    }

    return $combined_nodes;
  }


  /**
   * Create array of edges with all edges from original graph and new one from clone
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

  private function findIndex($array, $value){
    foreach($array as $index=>$row){
      if($row == $value) return $index;
    }
    return false;
  }

  /**
   * Returns array of local_content_ids from $this->original['elements']['nodes'] or $this->clone['elements']['nodes']
   * @param $nodes
   * @return array
   */
  public function getNodeContentIds($nodes){
    $local_content_ids = array();
    foreach($nodes as $node){
      $local_content_ids[] = $this->contentIdConverter->getLocalContentId($node["nodeContentId"]);
    }
    return $local_content_ids;
  }
}
?>