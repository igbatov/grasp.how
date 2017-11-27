<?php

/**
 * Class that creates so called diff graph given original graph and modified (or cloned) one.
 * Diff graph is a union of both graphs with nodes marked as new, absent (removed), modified or unmodified.
 * Algorithms in methods relies heavily on the fact that local_content_ids of cloned nodes and edges
 * is the same in clone as in the original graph.
 * It also assumes that graph1 is ancestor from the history of graph2 or graph1 was cloned into graph2
 * - i.e. there was no edits in graph1 in the same time as graph2 was edited
 */
class GraphDiffCreator{
  private $authId1;
  private $graph1;
  private $authId2;
  private $graph2;
  private $contentIdConverter;
  private $graphIdConverter;
  private $logger;

  /**
   * @param $graph1 - row from history of graph 1 in form (
   *  graphId=>123,
   *  elements=>array(
   *    nodes=>array(id=>array(nodeContentId=>globalContentId)),
   *    edges=>array(id=>array(source=>123, target=>234, edgeContentId=>globalContentId))
   *  )
   * @param $graph2 - row from history of graph 2
   * @param ContentIdConverter $contentIdConverter
   * @param GraphIdConverter $graphIdConverter
   * @param Logger $logger
   * @throws Exception
   */
  public function __construct(
    $graph1,
    $graph2,
    ContentIdConverter $contentIdConverter,
    GraphIdConverter $graphIdConverter,
    Logger $logger
  ){
    $this->logger = $logger;
    $this->graphIdConverter = $graphIdConverter;
    if(!$this->graphIdConverter->isGraphIdGlobal($graph1['graphId'])
    || !$this->graphIdConverter->isGraphIdGlobal($graph2['graphId'])){
      $msg = __CLASS__."::".__METHOD__." error: Graph id must be in a global format, got ".$graph1['graphId']." and ".$graph2['graphId'];
      $this->logger->log($msg);
      throw new Exception($msg);
    }
    $this->authId1 = $this->graphIdConverter->getAuthId($graph1['graphId']);
    $this->graph1 = $graph1;
    $this->authId1 = $this->graphIdConverter->getAuthId($graph2['graphId']);
    $this->graph2 = $graph2;
    $this->contentIdConverter = $contentIdConverter;
  }

  /**
   * Combine graph1 and graph2 one into one model with node statuses 'absent', 'added', 'modified' or 'unmodified'
   * (graph1 is supposed to be earlier version of graph2)
   * 'modified' and 'unmodified' is set according to updated_at timestamp of the node
   * @return array
   */
  public function getDiffGraph(){
    $graph1NodeLocalContentIds = array();
    foreach($this->graph1['elements']['nodes'] as $node)
      $graph1NodeLocalContentIds[] = $this->contentIdConverter->getLocalContentId($node['nodeContentId']);

    $graph2NodeLocalContentIds = array();
    foreach($this->graph2['elements']['nodes'] as $node)
      $graph2NodeLocalContentIds[] = $this->contentIdConverter->getLocalContentId($node['nodeContentId']);

    // we can do this because no new nodes was added or removed in graph1, only in graph2
    $absentInGraph2 = array_diff($graph1NodeLocalContentIds, $graph2NodeLocalContentIds);
    $absentInGraph1 = array_diff($graph2NodeLocalContentIds, $graph1NodeLocalContentIds);
    $common = array_intersect($graph2NodeLocalContentIds, $graph1NodeLocalContentIds);

    // merge nodes from graph1 and graph2 in one array and set their modification statuses
    $diff_nodes = array();
    $i=0;
    foreach($absentInGraph2 as $localContentId){
      $i++;
      $diff_nodes[$i] = array(
        'id'=>$i,
        'nodeContentId'=>self::encodeContentId($this->graph1['graphId'], $localContentId, null, null),
      );
    }
    foreach($absentInGraph1 as $localContentId){
      $i++;
      $diff_nodes[$i] = array(
        'id'=>$i,
        'nodeContentId'=>self::encodeContentId(null, null, $this->graph2['graphId'], $localContentId),
      );
    }
    foreach($common as $localContentId){
      $i++;
      $diff_nodes[$i] = array(
        'id'=>$i,
        'nodeContentId'=>self::encodeContentId($this->graph1['graphId'], $localContentId, $this->graph2['graphId'], $localContentId),
      );
    }

    // merge edges from graph1 and graph2
    $diff_edges = array();
    $this->addDiffEdges($diff_edges, $this->graph1, $diff_nodes);
    $this->addDiffEdges($diff_edges, $this->graph2, $diff_nodes);

    // reformat edges to diff_nodes form
    $graph1EdgeLocalContentIds = array();
    foreach($this->graph1['elements']['edges'] as $edge)
      $graph1EdgeLocalContentIds[] = $this->contentIdConverter->getLocalContentId($edge['edgeContentId']);

    $graph2EdgeLocalContentIds = array();
    foreach($this->graph2['elements']['edges'] as $edge)
      $graph2EdgeLocalContentIds[] = $this->contentIdConverter->getLocalContentId($edge['edgeContentId']);

    $absentInGraph2 = array_diff($graph1EdgeLocalContentIds, $graph2EdgeLocalContentIds);
    $absentInGraph1 = array_diff($graph2EdgeLocalContentIds, $graph1EdgeLocalContentIds);
    $common = array_intersect($graph2EdgeLocalContentIds, $graph1EdgeLocalContentIds);

    $i=0;
    foreach($diff_edges as $key => $diff_edge){
      $i++;
      $localContentId = $this->contentIdConverter->getLocalContentId($diff_edge['edgeContentId']);
      $diff_edges[$i] = $diff_edge;
      if(in_array($localContentId, $absentInGraph2)){
        $diff_edges[$i]['edgeContentId'] = self::encodeContentId($this->graph1['graphId'], $localContentId, null, null);
        $diff_edges[$i]['id'] = $i;
      }
      if(in_array($localContentId, $absentInGraph1)){
        $diff_edges[$i]['edgeContentId'] = self::encodeContentId(null, null, $this->graph2['graphId'], $localContentId);
        $diff_edges[$i]['id'] = $i;
      }
      if(in_array($localContentId, $common)){
        $diff_edges[$i]['edgeContentId'] = self::encodeContentId($this->graph1['graphId'], $localContentId, $this->graph2['graphId'], $localContentId);
        $diff_edges[$i]['id'] = $i;
      }
      unset($diff_edges[$key]);
    }

    return array(
      'nodes'=>$diff_nodes,
      'edges'=>$diff_edges,
    );
  }

  /**
   * Merge edges of graph1 and graph2.
   * I.e. it creates array of all edges between diff_nodes
   * diff_edge edgeContentId = graph2 edge edgeContentId or graph1 edge edgeContentId if it absent in graph2
   * @param $diff_edges
   * @param $graph
   * @param $diff_nodes
   */
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
      $contentId = self::decodeContentId($diff_node['nodeContentId']);
      if(
        $graphId == $contentId['graphId1'] && $localContentId == $contentId['localContentId1']
        ||
        $graphId == $contentId['graphId2'] && $localContentId == $contentId['localContentId2']
      ) return $nodeId;
    }
    return null;
  }

  public static function encodeDiffGraphId($graphId1, $graphId2){
    return 'diff_'.$graphId1."_".$graphId2;
  }
  
  public static function decodeDiffGraphId($diffGraphId){
    $t = explode('_',substr($diffGraphId, 5));
    return array(
      'graphId1'=>$t[0],
      'graphId2'=>$t[1]
    );
  }

  public static function encodeContentId($graphId1, $localContentId1, $graphId2, $localContentId2){
    return $graphId1."-".$localContentId1.'/'.$graphId2."-".$localContentId2;
  }

  public static function decodeContentId($contentId){
    $t = explode('/',$contentId);
    $t0 = explode('-',$t[0]);
    $t1 = explode('-',$t[1]);
    return array(
      'graphId1'=>$t0[0],
      'localContentId1'=>$t0[1],
      'graphId2'=>$t1[0],
      'localContentId2'=>$t1[1]
    );
  }

  public static function isDiffGraphId($graphId){
    return substr($graphId, 0, 5) == 'diff_';
  }

  public static function isDiffContentId($contentId){
    return strpos($contentId, '/') !== false;
  }

  /**
   *
   * @param MultiTenantDB $db
   * @param $authId
   * @param GraphIdConverter $graphIdConverter
   * @param $nodeAlternatives - alternatives of clone node
   * @return bool
   */
  public static function isCloneModified(MultiTenantDB $db, GraphIdConverter $graphIdConverter, $authId, $nodeAlternatives){
    foreach($nodeAlternatives as $row){
       if(GraphDiffCreator::isCloneAlternativeModified($db, $graphIdConverter, $authId, $row)) return true;
    }
    return false;
  }

  /**
   *
   * @param $db
   * @param GraphIdConverter $graphIdConverter
   * @param $authId - $authId of clone owner
   * @param $alternative - alternative row from node_content table
   * @return bool
   */
  public static function isCloneAlternativeModified(MultiTenantDB $db, GraphIdConverter $graphIdConverter, $authId, $alternative){
    if($alternative['cloned_from_graph_id'] === null || $alternative['cloned_from_local_content_id'] === null) {
      return false;
    }

    //if($alternative['updated_at'] > $alternative['created_at']) return true;

    $q = 'SELECT * FROM node_content WHERE graph_id="'.$alternative['cloned_from_graph_id'].'" AND local_content_id="'.$alternative['cloned_from_local_content_id'].'" AND alternative_id="'.$alternative['alternative_id'].'"';
    $rows = $db->exec($alternative['cloned_from_auth_id'], $q);
    if(!self::isClonePEqual($graphIdConverter, $rows[0], $alternative)) return true;
    if(
        $rows[0]['type'] != $alternative['type']
        || $rows[0]['reliability'] != $alternative['reliability']
        || $rows[0]['importance'] != $alternative['importance']
        || $rows[0]['label'] != $alternative['label']
        || $rows[0]['text'] != $alternative['text']
        || $rows[0]['has_icon'] != $alternative['has_icon']
        || $rows[0]['stickers'] != $alternative['stickers']
    )
    {
      return true;
    }

    return false;
  }

  /**
   * Check that conditional probabilities of node alternative and its clone are equal
   * @param GraphIdConverter $graphIdConverter
   * @param $original
   * @param $clone
   * @return bool
   */
  public static function isClonePEqual(GraphIdConverter $graphIdConverter, $original, $clone)
  {
    if(
        $original['graph_id'] !== $clone['cloned_from_graph_id']
        || $original['local_content_id'] !== $clone['cloned_from_local_content_id']
    ){
      return false;
    }

    $originalP = json_decode($original['p'], true);
    $cloneP = json_decode($clone['p'], true);

    $globalOriginalGraphId = $graphIdConverter->createGlobalGraphId(
        $clone['cloned_from_auth_id'],
        $clone['cloned_from_graph_id']
    );

    $contentIdConverter = new ContentIdConverter();
    $mustBe = Graphs::convertPforClone($cloneP, $globalOriginalGraphId, $contentIdConverter);

    return $mustBe == $originalP;
  }

  public static function getDiffText(
      MultiTenantDB $db,
      GraphIdConverter $graphIdConverter,
      $graphId1,
      $localContentId1,
      $alternativeId1,
      $graphId2,
      $localContentId2,
      $alternativeId2)
  {
    // new node in $graph2 - return its text
    if(!$graphId1){
      $graphIdConverter->throwIfNotGlobal($graphId2);
      $localGraphId2 = $graphIdConverter->getLocalGraphId($graphId2);
      $authId2 = $graphIdConverter->getAuthId($graphId2);
      $q = "SELECT text FROM node_content WHERE graph_id = '".$localGraphId2."' AND local_content_id = '".$localContentId2."' AND alternative_id='".$alternativeId2."'";
      $rows = $db->exec($authId2, $q);
      if($rows && count($rows)) return $rows[0]['text'];

      return false;
    }

    // removed $graph1 node - return its text
    if(!$graphId2){
      $graphIdConverter->throwIfNotGlobal($graphId1);
      $localGraphId1 = $graphIdConverter->getLocalGraphId($graphId1);
      $authId1 = $graphIdConverter->getAuthId($graphId1);
      $q = "SELECT text FROM node_content WHERE graph_id = '".$localGraphId1."' AND local_content_id = '".$localContentId1."' AND alternative_id='".$alternativeId1."'";
      $rows = $db->exec($authId1, $q);
      if($rows && count($rows)) return $rows[0]['text'];

      return false;
    }

    $graphIdConverter->throwIfNotGlobal($graphId1);
    $localGraphId1 = $graphIdConverter->getLocalGraphId($graphId1);
    $authId1 = $graphIdConverter->getAuthId($graphId1);
    $graphIdConverter->throwIfNotGlobal($graphId2);
    $localGraphId2 = $graphIdConverter->getLocalGraphId($graphId2);
    $authId2 = $graphIdConverter->getAuthId($graphId2);

    // comparing different alternatives or different nodes, give text of node from $graphId2 if it exists, else give text of node from $graphId1
    if($alternativeId1 != $alternativeId2 || $localContentId1 != $localContentId2){
      $q = "SELECT text FROM node_content WHERE graph_id = '".$localGraphId2."' AND local_content_id = '".$localContentId2."' AND alternative_id='".$alternativeId2."'";
      $rows = $db->exec($authId2, $q);
      if($rows && count($rows)) return $rows[0]['text'];

      // not found text in $graphId2, try in $graphId1
      $q = "SELECT text FROM node_content WHERE graph_id = '".$localGraphId1."' AND local_content_id = '".$localContentId1."' AND alternative_id='".$alternativeId1."'";
      $rows = $db->exec($authId1, $q);
      if($rows && count($rows)) return $rows[0]['text'];

      return false;
    }

    $localContentId = $localContentId1;
    $alternativeId = $alternativeId1;

    $q = "SELECT * FROM node_content WHERE graph_id = '".$localGraphId2."' AND local_content_id = '".$localContentId."' AND alternative_id='".$alternativeId."'";
    $rows = $db->exec($authId2, $q);
    $is_modified = GraphDiffCreator::isCloneAlternativeModified($db, $graphIdConverter, $authId2, $rows[0]);

    // if it is cloned node and alternative content was not modified
    if(!$is_modified){
      $q = "SELECT text FROM node_content WHERE graph_id = '".$localGraphId2."' AND local_content_id = '".$localContentId."' AND alternative_id='".$alternativeId."'";
      $rows = $db->exec($authId2, $q);
      // in case clone removed one of alternatives we will find nothing in $contentId['graphId1']
      if($rows && count($rows)) return $rows[0]['text'];
    }
    // it is cloned node and alternative was modified
    else{
      $text1 = $db->exec($authId1, "SELECT text FROM node_content WHERE graph_id = '".$localGraphId1."' AND local_content_id = '".$localContentId."' AND alternative_id='".$alternativeId."'")[0]['text'];
      $text2 = $db->exec($authId2, "SELECT text FROM node_content WHERE graph_id = '".$localGraphId2."' AND local_content_id = '".$localContentId."' AND alternative_id='".$alternativeId."'")[0]['text'];
      $text1 = mb_convert_encoding($text1, 'HTML-ENTITIES', 'UTF-8');
      $text2 = mb_convert_encoding($text2, 'HTML-ENTITIES', 'UTF-8');
      return mb_convert_encoding(TextDiff::toHTML(TextDiff::compare($text1, $text2)), 'UTF-8', 'HTML-ENTITIES');
    }

    return false;
  }

  public static function getGraphSettings(MultiTenantDB $db, GraphIdConverter $graphIdConverter, $graphId1, $graphId2){
    $graphIdConverter->throwIfNotGlobal($graphId1);
    $graphIdConverter->throwIfNotGlobal($graphId2);
    $localGraphId1 = $graphIdConverter->getLocalGraphId($graphId1);
    $authId1 = $graphIdConverter->getAuthId($graphId1);
    $localGraphId2 = $graphIdConverter->getLocalGraphId($graphId2);
    $authId2 = $graphIdConverter->getAuthId($graphId2);
    $q = "SELECT settings FROM graph_settings WHERE graph_id = '".$localGraphId1."'";
    $graph1Settings = json_decode($db->exec($authId1, $q)[0]['settings'], true);
    $q = "SELECT settings FROM graph_settings WHERE graph_id = '".$localGraphId2."'";
    $graph2Settings = json_decode($db->exec($authId2, $q)[0]['settings'], true);


    // check that settings for $graphId1 is the sane as for $graphId2
    if($graph1Settings['skin'] != $graph2Settings['skin']){
      throw new Exception('Skins are different '.var_export(array_diff_key(
          $graph1Settings['skin'],
          $graph2Settings['skin']
          ),
          true
        )
      );
    }

    // add to skin modification stickers (icons from http://www.flaticon.com/)
    $graph1Settings['skin']['node']['attr']['stickers']['absent'] = '
 <svg version="1.1" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" style="enable-background:new 0 0 24 24;" xml:space="preserve">
<path fill="none" d="M0,0h24v24H0V0z"/>
<path fill="#848BA8" d="M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M17,13H7v-2h10V13z"/>
<rect x="7" y="11" width="10" height="2"/>
</svg>
    ';
    $graph1Settings['skin']['node']['attr']['stickers']['added'] = '
<svg version="1.1" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" style="enable-background:new 0 0 24 24;" xml:space="preserve">
<path fill="none" d="M0,0h24v24H0V0z"/>
<path fill="#848BA8" d="M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10s10-4.5,10-10S17.5,2,12,2z M17,13h-4v4h-2v-4H7v-2h4V7h2v4h4V13z"/>
<polygon points="17,13 13,13 13,17 11,17 11,13 7,13 7,11 11,11 11,7 13,7 13,11 17,11 "/>
</svg>
';
    $graph1Settings['skin']['node']['attr']['stickers']['modified'] = '
<svg version="1.1" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" style="enable-background:new 0 0 24 24;" xml:space="preserve">
<circle fill="#848BA8" cx="12" cy="12.4" r="10"/>
<path d="M7.2,14.9V17h2.1l6.2-6.2l-2.1-2.1L7.2,14.9z M17.2,9.2c0.2-0.2,0.2-0.6,0-0.8l-1.3-1.3c-0.2-0.2-0.6-0.2-0.8,0l-1,1
	l2.1,2.1C16.1,10.2,17.2,9.2,17.2,9.2z"/>
<path fill="none" d="M0,0h24v24H0V0z"/>
</svg>    
 ';
    $graph1Settings['skin']['node']['attr']['stickers']['unmodified'] = '
<svg xmlns=\'http://www.w3.org/2000/svg\'  width=\'25\' height=\'25\'></svg>
';

    $graph1Settings['position'] = 'rightGraphView';

    return $graph1Settings;
  }

  public static function getGraphModelSettings(MultiTenantDB $db, GraphIdConverter $graphIdConverter, $graphId1, $graphId2){
    $graphIdConverter->throwIfNotGlobal($graphId1);
    $graphIdConverter->throwIfNotGlobal($graphId2);
    $localGraphId1 = $graphIdConverter->getLocalGraphId($graphId1);
    $authId1 = $graphIdConverter->getAuthId($graphId1);
    $q = "SELECT graph FROM graph WHERE id = '".$localGraphId1."'";
    $graphModelSettings = json_decode($db->exec($authId1, $q)[0]['graph'], true);
    $graphModelSettings['name'] = GraphDiffCreator::encodeDiffGraphId($graphId1, $graphId2);
    $graphModelSettings['isEditable'] = false;

    return $graphModelSettings;
  }
}
?>