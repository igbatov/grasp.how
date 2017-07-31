<?php

/**
 * This class converts between local graphId (that is unique for owner) and global graphId
 * (that is universally unique)
 */
class GraphIdConverter{
  private $logger;

  public function __construct(Logger $logger)
  {
    $this->logger = $logger;
  }

  /**
   * Creates unique across all users globalGraphId from $graphId and $authId
   * @param $authId
   * @param $graphId
   * @return string
   */
  public function createGlobalGraphId($authId, $graphId){
    if(GraphDiffCreator::isDiffGraphId($graphId)){
      $graphId1 = GraphDiffCreator::decodeDiffGraphId($graphId)['graphId1'];
      $graphId2 = GraphDiffCreator::decodeDiffGraphId($graphId)['graphId2'];
      $graphId1 = $this->isGraphIdGlobal($graphId1) ? $graphId1 : $this->createGlobalGraphId($authId, $graphId1);
      $graphId2 = $this->isGraphIdGlobal($graphId2) ? $graphId2 : $this->createGlobalGraphId($authId, $graphId2);
      return GraphDiffCreator::encodeDiffGraphId($graphId1, $graphId2);
    } else if (!$this->isGraphIdGlobal($graphId)) {
      return $authId.".".$graphId;
    } else {
      // it is already global
      return $graphId;
    }
  }

  /**
   * @param $globalGraphId
   * @return mixed
   * @throws Exception
   */
  public function getAuthId($globalGraphId){
    if(!$this->isGraphIdGlobal($globalGraphId)) throw new Exception('Cannot extract authId from localGraphId '.$globalGraphId);
    if(GraphDiffCreator::isDiffGraphId($globalGraphId)) throw new Exception('Cannot extract authId from diff graph id '.$globalGraphId);
    return explode('.', $globalGraphId)[0];
  }

  /**
   * Returns localGraphId from $globalGraphId
   * @param $globalGraphId
   * @return mixed
   */
  public function getLocalGraphId($globalGraphId){
    if(GraphDiffCreator::isDiffGraphId($globalGraphId)){
      $graphId1 = $this->getLocalGraphId(GraphDiffCreator::decodeDiffGraphId($globalGraphId)['graphId1']);
      $graphId2 = $this->getLocalGraphId(GraphDiffCreator::decodeDiffGraphId($globalGraphId)['graphId2']);
      return GraphDiffCreator::encodeDiffGraphId($graphId1, $graphId2);
    } else {
      if(!$this->isGraphIdGlobal($globalGraphId)) return $globalGraphId;
      return explode('.', $globalGraphId)[1];
    }
  }

  public function isGraphIdGlobal($graphId){
    if(GraphDiffCreator::isDiffGraphId($graphId)){
      $graphId1 = GraphDiffCreator::decodeDiffGraphId($graphId)['graphId1'];
      $graphId2 = GraphDiffCreator::decodeDiffGraphId($graphId)['graphId2'];
      return $this->isGraphIdGlobal($graphId1) && $this->isGraphIdGlobal($graphId2);
    } else {
      return strpos($graphId, ".") !== false;
    }
  }

  public function throwIfNotGlobal($graphId){
    if(!$this->isGraphIdGlobal($graphId)) {
      $msg ="Graph id must be in a global format! Got ".$graphId;
      $this->logger->log($msg);
      throw new Exception($msg);
    }
  }

  /**
   * NewNodesGraph is utility graph - it is used only as a source from which we can drag nodes to create new nodes on real graph.
   * It contains node of every type without edges
   * @param $globalGraphId
   * @return bool
   */
  public function isNewNodesGraph($globalGraphId){
    return substr($globalGraphId,0,strlen('newNodes:')) === 'newNodes:';
  }
}