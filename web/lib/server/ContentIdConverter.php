<?php

/**
 * Client (js) side uses unique globalContentId for every node and edge across all graphs
 * Backend (php) side prefers localContentId that is unique only within one graph
 * and stores globalContentId as (graphId, localContentId)
 * This class converts between (graphId, localContentId) and globalContentId to supply client side global unique content id
 */
class ContentIdConverter{
  /**
   * Creates unique across all graphs globalContentId from $graphId and $localContentId
   * @param $graphId
   * @param $localContentId
   * @return string
   */
  public function createGlobalContentId($graphId, $localContentId){
    return $graphId."-".$localContentId;
  }

  /**
   * Returns graphId from globalContentId
   * @param $contentId
   * @return mixed
   */
  public function getGraphId($contentId){
    return explode('-', $contentId)[0];
  }

  /**
   * Returns localContentId from globalContentId
   * @param $contentId
   * @return mixed
   */
  public function getLocalContentId($contentId){
    return explode('-', $contentId)[1];
  }

  /**
   * Check if $content_id if from diff graph or just ordinary one.
   * In either case appropriately decode it on $graph_id and $local_content_id
   * @param $content_id
   * @return array
   */
  public function decodeContentId($content_id){
    if(GraphDiffCreator::isDiffContentId($content_id)){
      $contentId = GraphDiffCreator::decodeContentId($content_id);
      if(!empty($contentId['graphId2'])){
        $graph_id = $contentId['graphId2'];
        $local_content_id = $contentId['localContentId2'];
      }else{
        $graph_id = $contentId['graphId1'];
        $local_content_id = $contentId['localContentId1'];
      }
    }else{
      $graph_id = $this->getGraphId($content_id);
      $local_content_id = $this->getLocalContentId($content_id);
    }
    return array('graph_id'=>$graph_id, 'local_content_id'=>$local_content_id);
  }
}