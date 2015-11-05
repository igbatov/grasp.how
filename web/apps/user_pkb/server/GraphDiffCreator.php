<?php

/**
 * Class that creates so called diff graph given original graph and cloned one.
 * Diff graph is a union of both graphs with nodes marked as new, deleted and modified (in clone compared to original).
 * Algorithms in methods relies heavily on the fact that local_content_ids of cloned nodes and edges
 * is the same in clone as in the original graph.
 */
class GraphDiffCreator{
  private $graph1;
  private $graph2;
  private $graph1NodeContentUpdatedAt;
  private $graph2NodeContentUpdatedAt;
  private $node_attribute_names;
  private $edge_attribute_names;
  private $contentIdConverter;

  /**
   * @param $graph1 - row from history of graph 1 in form (
   *  graphId=>123,
   *  elements=>array(
   *    nodes=>array(id=>array(nodeContentId=>globalContentId)),
   *    edges=>array(id=>array(source=>123, target=>234, edgeContentId=>globalContentId))
   *  )
   * @param $graph2 - row from history of graph 2
   * @param $graph1NodeContentUpdatedAt - update time of content of graph 1 nodes
   * @param $graph2NodeContentUpdatedAt - update time of content of graph 2 nodes
   * @param $node_attribute_names
   * @param $edge_attribute_names
   * @param ContentIdConverter $contentIdConverter
   */
  public function __construct(
    $graph1,
    $graph2,
    $graph1NodeContentUpdatedAt,
    $graph2NodeContentUpdatedAt,
    $node_attribute_names,
    $edge_attribute_names,
    ContentIdConverter $contentIdConverter
  ){
    $this->graph1 = $graph1;
    $this->graph2 = $graph2;
    $this->graph1NodeContentUpdatedAt = $graph1NodeContentUpdatedAt;
    $this->graph2NodeContentUpdatedAt = $graph2NodeContentUpdatedAt;
    $this->node_attribute_names = $node_attribute_names;
    $this->edge_attribute_names = $edge_attribute_names;
    $this->contentIdConverter = $contentIdConverter;
  }

  /**
   * Combine original graph and cloned one into one model that has 'diff' attribute
   * @return array
   */
  public function getDiffGraph(){
    foreach($this->graph1['elements']['nodes'] as $node)
      $graph1NodeLocalContentIds[] = $this->contentIdConverter->getLocalContentId($node['nodeContentId']);

    foreach($this->graph2['elements']['nodes'] as $node)
      $graph2NodeLocalContentIds[] = $this->contentIdConverter->getLocalContentId($node['nodeContentId']);

    $absentInGraph2 = array_diff($graph1NodeLocalContentIds, $graph2NodeLocalContentIds);
    $absentInGraph1 = array_diff($graph2NodeLocalContentIds, $graph1NodeLocalContentIds);
    $common = array_intersect($graph2NodeLocalContentIds, $graph1NodeLocalContentIds);

    // merge nodes from graph1 and graph2 in one array and set their modification statuses
    $diff_nodes = array();
    $i=0;
    foreach($absentInGraph2 as $localContentId){
      $i++;
      $diff_nodes[$i] = array(
        'contentId'=>$this->encodeContentId($this->graph1['graphId'], $localContentId, null, null),
        'status'=>'absent'
      );
    }
    foreach($absentInGraph1 as $localContentId){
      $i++;
      $diff_nodes[$i] = array(
        'contentId'=>$this->encodeContentId(null, null, $this->graph2['graphId'], $localContentId),
        'status'=>'added'
      );
    }
    foreach($common as $localContentId){
      $i++;
      $diff_nodes[$i] = array(
        'contentId'=>$this->encodeContentId($this->graph1['graphId'], $localContentId, $this->graph2['graphId'], $localContentId),
        'status'=>$this->graph1NodeContentUpdatedAt[$localContentId]['updated_at'] == $this->graph2NodeContentUpdatedAt[$localContentId]['updated_at'] ? 'unmodified' : 'modified'
      );
    }

    // merge edges from graph1 and graph2
    $diff_edges = array();
    $this->addDiffEdges($diff_edges, $this->graph1, $diff_nodes);
    $this->addDiffEdges($diff_edges, $this->graph2, $diff_nodes);

    return array(
      'nodes'=>$diff_nodes,
      'edges'=>$diff_edges,
    );
  }

  private function addDiffEdges(&$diff_edges, $graph, $diff_nodes){
    foreach($graph['elements']['edges'] as $edge){
      $sourceContentId = $graph['elements']['nodes'][$edge['source']]['nodeContentId'];
      $s = $this->findDiffNodeId(
        $graph['graphId'],
        $this->contentIdConverter->getLocalContentId($sourceContentId),
        $diff_nodes
      );
      $targetContentId = $graph['elements']['nodes'][$edge['target']]['nodeContentId'];
      $t = $this->findDiffNodeId(
        $graph['graphId'],
        $this->contentIdConverter->getLocalContentId($targetContentId),
        $diff_nodes
      );
      $diff_edges[$s."-".$t] = array('source'=>$s, 'target'=>$t, 'edgeContentId'=>$edge['edgeContentId']);
    }
  }

  /**
   * Finds diff node by content id
   * @param $graphId
   * @param $localContentId
   * @param $diff_nodes
   * @return null
   */
  private function findDiffNodeId($graphId, $localContentId, $diff_nodes){
    foreach($diff_nodes as $nodeId=>$diff_node){
      $contentId = $this->decodeContentId($diff_node['contentId']);
      if(
        $graphId == $contentId['graphId1'] && $localContentId == $contentId['localContentId1']
        ||
        $graphId == $contentId['graphId2'] && $localContentId == $contentId['localContentId2']
      ) return $nodeId;
    }
    return null;
  }

  private function encodeContentId($originalGraphId, $localContentId, $cloneGraphId, $localContentId){
    return $originalGraphId."-".$localContentId."/".$cloneGraphId."-".$localContentId;
  }
  
  private function decodeContentId($contentId){
    $t = explode('/',$contentId);
    $t0 = explode('-',$t[0]);
    $t1 = explode('-',$t[1]);
    return array(
      'graphId1'=>$t0[0],
      'localContentId1'=>$t[1],
      'graphId2'=>$t1[0],
      'localContentId2'=>$t1[1]
    );
  }
}
?>