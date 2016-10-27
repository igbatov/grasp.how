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
  private $graph1;
  private $graph2;
  private $contentIdConverter;

  /**
   * @param $graph1 - row from history of graph 1 in form (
   *  graphId=>123,
   *  elements=>array(
   *    nodes=>array(id=>array(nodeContentId=>globalContentId)),
   *    edges=>array(id=>array(source=>123, target=>234, edgeContentId=>globalContentId))
   *  )
   * @param $graph2 - row from history of graph 2
   * @param ContentIdConverter $contentIdConverter
   */
  public function __construct(
    $graph1,
    $graph2,
    ContentIdConverter $contentIdConverter
  ){
    $this->graph1 = $graph1;
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

  public static function isCloneModified($nodeAlternatives){
    foreach($nodeAlternatives as $row){
       if(GraphDiffCreator::isCloneAlternativeModified($row)) return true;
    }
    return false;
  }

  /**
   *
   * @param $alternative - alternative row from node_content table
   * @return bool
   */
  public static function isCloneAlternativeModified($alternative){
    if($alternative['updated_at'] > $alternative['created_at']) return true;
    else return false;
  }

  public  static function getDiffText($db, $graphId1, $localContentId1, $alternativeId1, $graphId2, $localContentId2, $alternativeId2){
    // new node in $graph2 - return its text
    if(!$graphId1){
      $q = "SELECT text FROM node_content WHERE graph_id = '".$graphId2."' AND local_content_id = '".$localContentId2."' AND alternative_id='".$alternativeId2."'";
      $rows = $db->execute($q);
      if($rows && count($rows)) return $rows[0]['text'];

      return false;
    }

    // removed $graph1 node - return its text
    if(!$graphId2){
      $q = "SELECT text FROM node_content WHERE graph_id = '".$graphId1."' AND local_content_id = '".$localContentId1."' AND alternative_id='".$alternativeId1."'";
      $rows = $db->execute($q);
      if($rows && count($rows)) return $rows[0]['text'];

      return false;
    }

    // comparing different alternatives or different nodes, give text of node from $graphId2 if it exists, else give text of node from $graphId1
    if($alternativeId1 != $alternativeId2 || $localContentId1 != $localContentId2){
      $q = "SELECT text FROM node_content WHERE graph_id = '".$graphId2."' AND local_content_id = '".$localContentId2."' AND alternative_id='".$alternativeId2."'";
      $rows = $db->execute($q);
      if($rows && count($rows)) return $rows[0]['text'];

      // not found text in $graphId2, try in $graphId1
      $q = "SELECT text FROM node_content WHERE graph_id = '".$graphId1."' AND local_content_id = '".$localContentId1."' AND alternative_id='".$alternativeId1."'";
      $rows = $db->execute($q);
      if($rows && count($rows)) return $rows[0]['text'];

      return false;
    }

    $localContentId = $localContentId1;
    $alternativeId = $alternativeId1;

    $q = "SELECT updated_at, created_at FROM node_content WHERE graph_id = '".$graphId2."' AND local_content_id = '".$localContentId."' AND alternative_id='".$alternativeId."'";
    $rows = $db->execute($q);
    $is_modified = GraphDiffCreator::isCloneAlternativeModified($rows);

    // if it is cloned node and alternative content was not modified
    if(!$is_modified){
      $q = "SELECT text FROM node_content WHERE graph_id = '".$graphId1."' AND local_content_id = '".$localContentId."' AND alternative_id='".$alternativeId."'";
      $rows = $db->execute($q);
      // in case clone removed one of alternatives we will find nothing in $contentId['graphId1']
      if($rows && count($rows)) return $rows[0]['text'];
    }
    // it is cloned node and alternative was modified
    else{
      $text1 = $db->execute("SELECT text FROM node_content WHERE graph_id = '".$graphId1."' AND local_content_id = '".$localContentId."' AND alternative_id='".$alternativeId."'")[0]['text'];
      $text2 = $db->execute("SELECT text FROM node_content WHERE graph_id = '".$graphId2."' AND local_content_id = '".$localContentId."' AND alternative_id='".$alternativeId."'")[0]['text'];
      $text1 = mb_convert_encoding($text1, 'HTML-ENTITIES', 'UTF-8');
      $text2 = mb_convert_encoding($text2, 'HTML-ENTITIES', 'UTF-8');
      return mb_convert_encoding(TextDiff::toString(TextDiff::compare($text1, $text2)), 'UTF-8', 'HTML-ENTITIES');
    }

    return false;
  }

  public static function getGraphModelSettings($db, $graphId1, $graphId2){
    $diffGraphId = GraphDiffCreator::encodeDiffGraphId($graphId1, $graphId2);
    $q = "SELECT graph FROM graph WHERE id = '".$graphId1."'";
    $graphModelSettings = json_decode($db->execute($q)[0]['graph'], true);
    $graphModelSettings['name'] = $diffGraphId;
    $graphModelSettings['isEditable'] = false;

    return $graphModelSettings;
    // check that settings for $graphId1 is the sane as for $graphId2
    if($graphModelSettings['skin'] != $graphModelSettings['skin']){
      exit('Skins are different');
    }

    // add to skin modification stickers
    $diffSkin = $graphModelSettings['skin'];
    $diffSkin['node']['attr']['stickers']['absent'] = '<svg xmlns=\'http://www.w3.org/2000/svg\'  width=\'25\' height=\'25\'><g id=\'alert\' fill=\'yellow\'><rect id=\'point\' x=\'11\' y=\'16\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' width=\'2\' height=\'2\'/><polygon id=\'stroke\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' points=\'13.516,10 10.516,10 11,15 13,15\'/><g id=\'triangle\'><path d=\'M12.017,5.974L19.536,19H4.496L12.017,5.974 M12.017,3.5c-0.544,0-1.088,0.357-1.5,1.071L2.532,18.402C1.707,19.831,2.382,21,4.032,21H20c1.65,0,2.325-1.169,1.5-2.599L13.517,4.572C13.104,3.857,12.561,3.5,12.017,3.5L12.017,3.5z\'/></g></g></svg>';
    $diffSkin['node']['attr']['stickers']['added'] = '<svg xmlns=\'http://www.w3.org/2000/svg\'  width=\'25\' height=\'25\'><g id=\'alert\' fill=\'yellow\'><rect id=\'point\' x=\'11\' y=\'16\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' width=\'2\' height=\'2\'/><polygon id=\'stroke\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' points=\'13.516,10 10.516,10 11,15 13,15\'/><g id=\'triangle\'><path d=\'M12.017,5.974L19.536,19H4.496L12.017,5.974 M12.017,3.5c-0.544,0-1.088,0.357-1.5,1.071L2.532,18.402C1.707,19.831,2.382,21,4.032,21H20c1.65,0,2.325-1.169,1.5-2.599L13.517,4.572C13.104,3.857,12.561,3.5,12.017,3.5L12.017,3.5z\'/></g></g></svg>';
    $diffSkin['node']['attr']['stickers']['modified'] = '<svg xmlns=\'http://www.w3.org/2000/svg\'  width=\'25\' height=\'25\'><g id=\'alert\' fill=\'yellow\'><rect id=\'point\' x=\'11\' y=\'16\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' width=\'2\' height=\'2\'/><polygon id=\'stroke\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' points=\'13.516,10 10.516,10 11,15 13,15\'/><g id=\'triangle\'><path d=\'M12.017,5.974L19.536,19H4.496L12.017,5.974 M12.017,3.5c-0.544,0-1.088,0.357-1.5,1.071L2.532,18.402C1.707,19.831,2.382,21,4.032,21H20c1.65,0,2.325-1.169,1.5-2.599L13.517,4.572C13.104,3.857,12.561,3.5,12.017,3.5L12.017,3.5z\'/></g></g></svg>';
    $diffSkin['node']['attr']['stickers']['unmodified'] = '<svg xmlns=\'http://www.w3.org/2000/svg\'  width=\'25\' height=\'25\'></svg>';
    $graphModelSettings['skin'] = $diffSkin;

    return $graphModelSettings;
  }
}
?>