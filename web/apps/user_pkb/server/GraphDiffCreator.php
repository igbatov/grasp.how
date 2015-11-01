<?php

/**
 * Class that creates so called diff graph given original graph and cloned one.
 * Diff graph is a union of both graphs with nodes marked as new, deleted and modified (in clone compared to original).
 * Algorithms in methods relies heavily on the fact that local_content_ids of cloned nodes and edges
 * is the same in clone as in the original graph.
 */
class GraphDiffCreator{
  private $original;
  private $clone;
  private $db;
  private $node_attributes;
  private $edge_attributes;
  private $contentIdConverter;
  private $all_originally_cloned_local_content_ids;

  public function __construct($db, $original, $clone, $node_attributes, $edge_attributes, ContentIdConverter $contentIdConverter){
    $this->db = $db;
    $this->original = $original;
    $this->clone = $clone;
    $this->node_attributes = $node_attributes;
    $this->edge_attributes = $edge_attributes;
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
var_dump($diff_nodes);
var_dump($diff_edges);
    // format node array in a standard way
    $nodes = array();
    $count = 0;
    foreach($diff_nodes as $node){
      $node[$count] = array(
        'id'=>$count,
        'nodeContentId'=>$this->createGlobalContentId(
                $this->contentIdConverter->getGraphId($node['contentId']['original']),
                $this->contentIdConverter->getLocalContentId($node['contentId']['original']),
                $this->contentIdConverter->getGraphId($node['contentId']['clone']),
                $this->contentIdConverter->getLocalContentId($node['contentId']['clone'])
            ),
        'attributes'=>$node['attributes'],
      );
      $count++;
    }

    // format edge array in a standard way
    $edges = array();
    $count = 0;
    foreach($diff_edges as $edge){
      $edges[$count] = array(
        'id'=>$count,
        'source'=>$edge['source'],
        'target'=>$edge['target'],
        'edgeContentId'=>$this->createGlobalContentId(
                $this->contentIdConverter->getGraphId($edge['contentId']['original']),
                $this->contentIdConverter->getLocalContentId($edge['contentId']['original']),
                $this->contentIdConverter->getGraphId($edge['contentId']['clone']),
                $this->contentIdConverter->getLocalContentId($edge['contentId']['clone'])
            ),
        'attributes'=>$edge['attributes'],
      );
      $count++;
    }

    $original_settings_query = "SELECT settings FROM graph_settings WHERE graph_id = ".$this->original['graphId'];
    $original_settings = $this->db->execute($original_settings_query);
    $clone_settings_query = "SELECT settings FROM graph_settings WHERE graph_id = ".$this->clone['graphId'];
    $clone_settings = $this->db->execute($clone_settings_query);

    // check that original and clone settings are compatible

    return array(
      'nodes'=>$nodes,
      'edges'=>$edges,
      'settings'=>$original_settings
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
      // if it was brand new node in clone
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
   * @param $diff_nodes
   * @return array
   */
  public function getDiffEdges($diff_nodes){
    $combined_edges = array();

    $original_edge_local_content_ids = array();
    foreach($this->original['elements']['edges'] as $edge){
      $s = $this->findIndex($diff_nodes, 'original', $this->original['elements']['nodes'][$edge['source']]['nodeContentId']);
      $t = $this->findIndex($diff_nodes, 'original', $this->original['elements']['nodes'][$edge['target']]['nodeContentId']);
      $combined_edges[$s."-".$t] = array(
          'source'=>$s,
          'target'=>$t,
          'contentId'=>array('original'=>$edge['edgeContentId']), 'clone'=>null);
      $original_edge_local_content_ids[] = $edge['edgeContentId'];
    }

    // add all from cloned one (edges with the same source and destination will be rewrited)
    $clone_edge_local_content_ids = array();
    foreach($this->clone['elements']['edges'] as $edge){
      $s = $this->findIndex($diff_nodes, 'clone', $this->clone['elements']['nodes'][$edge['source']]['nodeContentId']);
      $t = $this->findIndex($diff_nodes, 'clone', $this->clone['elements']['nodes'][$edge['target']]['nodeContentId']);
      if(isset($combined_edges[$s."-".$t])) $combined_edges[$s."-".$t] = array(
        'source'=>$s,
        'target'=>$t,
        'contentId'=>array('original'=>$edge['edgeContentId'], 'clone'=>$edge['edgeContentId']),
        'attributes'=>array()
      );
      else $combined_edges[$s."-".$t] = array(
        'source'=>$s,
        'target'=>$t,
        'edgeContentId'=>array('original'=>null, 'clone'=>$edge['edgeContentId']),
        'attributes'=>array()
      );
      $clone_edge_local_content_ids[] = $edge['edgeContentId'];
    }

    // fill in attributes of new original edges
    $q = "SELECT graph_id, local_content_id, ".implode(', ', $this->edge_attributes)." FROM edge_content WHERE".
        " local_content_id IN (".implode(',', array_diff($original_edge_local_content_ids, $clone_edge_local_content_ids)).") AND".
        " graph_id = ".$this->original["graphId"];
    $rows = $this->db->execute($q);
    foreach($rows as $row){
      foreach($combined_edges as $combined_edge){
        if($this->contentIdConverter->getLocalContentId($combined_edge['contentId']['original']) == $row['local_content_id']){
          // form attributes for diff graph node
          $attrs = array();
          foreach($this->edge_attributes as $attr) $attrs[$attr] = $row[$attr];
          $combined_edge['attributes'] = $attrs;
        }
      }
    }

    // fill in attributes of clone edges
    $q = "SELECT graph_id, local_content_id, ".implode(', ', $this->edge_attributes)." FROM edge_content WHERE".
        " local_content_id IN (".implode(',', $clone_edge_local_content_ids).") AND".
        " graph_id = ".$this->clone["graphId"];
    $rows = $this->db->execute($q);
    foreach($rows as $row){
      foreach($combined_edges as $combined_edge){
        if($this->contentIdConverter->getLocalContentId($combined_edge['contentId']['clone']) == $row['local_content_id']){
          // form attributes for diff graph node
          $attrs = array();
          foreach($this->edge_attributes as $attr) $attrs[$attr] = $row[$attr];
          $combined_edge['attributes'] = $attrs;
        }
      }
    }

    return $combined_edges;
  }

  private function createGlobalContentId($originalGraphId, $localContentId, $cloneGraphId, $localContentId){
    return $originalGraphId."-".$localContentId."/".$cloneGraphId."-".$localContentId;
  }

  private function findIndex($diff_nodes, $type, $value){
    foreach($diff_nodes as $index=>$diff_node){
      if($diff_node['contentId'][$type] == $value) return $index;
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