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
}