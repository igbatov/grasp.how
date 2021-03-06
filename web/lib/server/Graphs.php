<?php

class Graphs {
  private $db;
  private $contentIdConverter;
  private $graphIdConverter;
  private $logger;

  const gRain = 'gRain';
  const WebPPL = 'WebPPL';

  const NODE_VALUE_TYPE_CONTINUOUS = 'continuous';
  const NODE_VALUE_TYPE_DISCRETE = 'discrete';
  const NODE_VALUE_TYPE_LABELLED = 'labelled';

  const NODE_ATTRIBUTE_NAMES = ['type', 'importance', 'has_icon', 'active_alternative_id', 'stickers', 'value_type', 'value_range', 'p_samples'];
  const NODE_ALTERNATIVE_ATTRIBUTE_NAMES = ['label', 'reliability','p','created_at','updated_at'];

  const EDGE_ATTRIBUTE_NAMES = ['type', 'label'];
  const NODE_BASIC_TYPES = ['fact'=>'fact','proposition'=>'proposition'];

  public function __construct(
      MultiTenantDB $db,
      ContentIdConverter $contentIdConverter,
      GraphIdConverter $graphIdConverter,
      Logger $logger
  ){
    $this->db = $db;
    $this->logger = $logger;
    $this->contentIdConverter = $contentIdConverter;
    $this->graphIdConverter = $graphIdConverter;
  }

  public static function getNodeAttributeNames() {
    return self::NODE_ATTRIBUTE_NAMES;
  }

  public static function getNodeAlternativeAttributeNames() {
    return self::NODE_ALTERNATIVE_ATTRIBUTE_NAMES;
  }

  /**
   * Return graph properties from table 'graph' - name, node types, edge types
   * @param $graph_id
   * @return array
   */
  public function getGraphProps($graph_id){
    $this->graphIdConverter->throwIfNotGlobal($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $graph_query = "SELECT id, graph FROM graph WHERE id = '".$localGraphId."'";
    $rows = $this->db->exec($authId, $graph_query);
    return json_decode($rows[0]['graph'], true);
  }

  public function getGraphBayesEngine($graph_id) {
    $graph = $this->getGraphProps($graph_id);
    if (!isset($graph['bayesEngine'])) {
      return Graphs::gRain;
    }

    return $graph['bayesEngine'];
  }

  /**
   * Return graph settings from table 'graph_settings' - mainly skin: node type colors, node constructors, ...
   * @param $graph_id
   * @return array|bool
   */
  public function getGraphSettings($graph_id){
    if($this->graphIdConverter->isNewNodesGraph($graph_id)) return false;
    $this->graphIdConverter->throwIfNotGlobal($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $query = "SELECT graph_id, settings FROM graph_settings WHERE graph_id = '".$localGraphId."'";
    $rows = $this->db->exec($authId, $query);
    if(count($rows) == 0) return false;
    $row = $rows[0];
    return json_decode($row['settings'], true);
  }

  /**
   * @param $content_ids - node ids in 'global' format
   * @return array
   */
  public function getGraphNodeContent($content_ids){
    // get all except text and source list
    $nodes = $this->getNodeAttributes($content_ids);

    // add text and source list
    foreach($nodes as $content_id=>$node){
      $graph_id = $this->contentIdConverter->decodeContentId($content_id)['graph_id'];
      $this->graphIdConverter->throwIfNotGlobal($graph_id);
      $graphAuthId = $this->graphIdConverter->getAuthId($graph_id);
      $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
      $local_content_id = $this->contentIdConverter->decodeContentId($content_id)['local_content_id'];

      $node_rows = $this->db->exec($graphAuthId, "SELECT * FROM node_content WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."'");

      // alternatives
      foreach($node_rows as $node_row){
        // alternative text
        $nodes[$content_id]['alternatives'][$node_row['alternative_id']]['text'] = $node_row['text'];

        // get alternative lists
        $list_items = array();
        if($node['type'] == self::NODE_BASIC_TYPES['fact']){
          $q = "SELECT id, source_id, comment, pages FROM node_content_source WHERE graph_id='".$localGraphId."' AND local_content_id='".$local_content_id."' AND alternative_id='".$node_row['alternative_id']."'";
          $this->logger->log($q);
          $rows = $this->db->exec($graphAuthId, $q);
          foreach($rows as $row){
            $q = "SELECT * FROM source WHERE id='".$row['source_id']."'";
            $this->logger->log($q);
            $sources = $this->db->exec($graphAuthId, $q);
            if($sources&&count($sources)){
              $list_items[$row['id']] = $sources[0];
              $list_items[$row['id']]['id'] = $row['id'];
              $list_items[$row['id']]['source_id'] = $row['source_id'];
              $list_items[$row['id']]['pages'] = $row['pages'];
              $list_items[$row['id']]['comment'] = $row['comment'];
            }
          }
        }else{
          $q = "SELECT * FROM node_content_falsification".
              " WHERE graph_id='".$localGraphId."' AND local_content_id='".$local_content_id."' AND alternative_id='".$node_row['alternative_id']."'";
          $this->logger->log($q);
          $rows = $this->db->exec($graphAuthId, $q);
          foreach($rows as $row){
            $list_items[$row['id']] = $row;
          }
        }
        $nodes[$content_id]['alternatives'][$node_row['alternative_id']]['list'] = $list_items;
      }
    }
    return $nodes;
  }

  /**
   * Get all node content except text (because text can be very long)
   * @param $content_ids - content ids of nodes. If $authId is null, content id should contain graphId in a global format
   * @return array
   * @throws Exception
   */
  public function getNodeAttributes($content_ids){
    $nodes = array();
    foreach($content_ids as $content_id){
      // is content_id is from graph that shows difference between two graphs?
      if(GraphDiffCreator::isDiffContentId($content_id)){
        $contentId = GraphDiffCreator::decodeContentId($content_id);
        if($contentId['graphId1']){
          $global_content_id = $this->contentIdConverter->createGlobalContentId($contentId['graphId1'], $contentId['localContentId1']);
          $graph1NodeContents = $this->getNodeAttributes(array($global_content_id));
          $nodes[$content_id] = $graph1NodeContents[$global_content_id];
        }
        // if we have also graph2 attributes for this node, overwrite them
        if(!empty($contentId['graphId2'])){
          $global_content_id = $this->contentIdConverter->createGlobalContentId($contentId['graphId2'], $contentId['localContentId2']);
          $graph2NodeContent = $this->getNodeAttributes(array($global_content_id))[$global_content_id];
          foreach(array_keys($graph2NodeContent) as $attribute_name){
              $nodes[$content_id][$attribute_name] = $graph2NodeContent[$attribute_name];
          }
        }

        $nodes[$content_id]['nodeContentId'] = $content_id;

        // add stickers that show status of node modification
        $status = 'unmodified';
        if($contentId['graphId1'] && !$contentId['graphId2']) $status = 'absent';
        elseif(!$contentId['graphId1'] && $contentId['graphId2']) $status = 'added';
        elseif($contentId['graphId1'] && $contentId['graphId2']){
          $authId2 = $this->graphIdConverter->getAuthId($contentId['graphId2']);
          $localGraphId2 = $this->graphIdConverter->getLocalGraphId($contentId['graphId2']);
          $q = "SELECT * FROM node_content WHERE graph_id = '".$localGraphId2."' AND local_content_id = '".$contentId['localContentId2']."'";
          $rows = $this->db->exec($authId2, $q);
          if(GraphDiffCreator::isCloneModified($this->db, $this->graphIdConverter, $authId2, $rows)) {
            $status = 'modified';
            $nodes[$content_id]['modifications'][] = GraphDiffCreator::getCloneModifications($this->db, $this->graphIdConverter, $authId2, $rows);
          }
        }
        $nodes[$content_id]['stickers'][] = $status;

      } else {
        // $content_id is global content id from ordinary (not diff) graph

        $graph_id = $this->contentIdConverter->decodeContentId($content_id)['graph_id'];
        $authId = $this->graphIdConverter->getAuthId($graph_id);
        $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
        $local_content_id = $this->contentIdConverter->decodeContentId($content_id)['local_content_id'];

        $query = "SELECT '".$content_id."' as nodeContentId, "
            ."alternative_id, "
            .implode(',',self::NODE_ALTERNATIVE_ATTRIBUTE_NAMES).", "
            .implode(',',self::NODE_ATTRIBUTE_NAMES).", "
            ."cloned_from_graph_id, "
            ."cloned_from_local_content_id FROM node_content "
            ."WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."'";

        $node_rows = $this->db->exec($authId, $query);

        $node_attributes = array();

        // == fill in node attributes ==
        $node_row = $node_rows[0];
        // general attributes
        foreach(self::NODE_ATTRIBUTE_NAMES as $name){
          if ($name == 'stickers') {
            $stickers = json_decode($node_row[$name], true);
            if (is_array($stickers)) {
              $node_attributes[$name] = $stickers;
            } else {
              $node_attributes[$name] = [];
            }
          } else {
            $node_attributes[$name] = $node_row[$name];
          }
        }

        // icon
        $node_row['iconSrc'] = $node_row['has_icon'] == 1 ? 'getIcon/?data="'.$content_id.'"' : null;
        unset($node_row['has_icon']);
        // set active alternative
        foreach($node_rows as $row){
          $node_attributes['active_alternative_id'] = $row['active_alternative_id'];
        }

        //  == fill in attributes for every alternative ==
        $node_attributes['alternatives'] = array();
        foreach($node_rows as $row){
          if(!isset($node_attributes['alternatives'][$row['alternative_id']])) $node_attributes['alternatives'][$row['alternative_id']] = array();
          foreach(self::NODE_ALTERNATIVE_ATTRIBUTE_NAMES as $name){
            if($name == 'p'){
              $p = json_decode($row[$name], true);
              if($p) $v = $p;
              else $v = '';
            }else{
              $v = $row[$name];
            }
            $node_attributes['alternatives'][$row['alternative_id']][$name] = $v;
          }
        }
        $nodes[$content_id] = $node_attributes;
      }
    }

    return $nodes;
  }

  /**
   * @param $contentIds - global content id
   * @return array
   */
  public function getEdgeAttributes($contentIds){
    $edges = array();
    foreach($contentIds as $content_id){
      if(GraphDiffCreator::isDiffContentId($content_id)){
        $contentId = GraphDiffCreator::decodeContentId($content_id);
        if($contentId['graphId2']){
          $global_content_id = $this->contentIdConverter->createGlobalContentId($contentId['graphId2'], $contentId['localContentId2']);
          $edges[$content_id] = $this->getEdgeAttributes(array($global_content_id))[$global_content_id];
        }else{
          $global_content_id = $this->contentIdConverter->createGlobalContentId($contentId['graphId1'], $contentId['localContentId1']);
          $edges[$content_id] = $this->getEdgeAttributes(array($global_content_id))[$global_content_id];
        }
        $edges[$content_id]['edgeContentId'] = $content_id;

      }else{
        $graph_id = $this->contentIdConverter->decodeContentId($content_id)['graph_id'];
        $authId = $this->graphIdConverter->getAuthId($graph_id);
        $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
        $local_content_id = $this->contentIdConverter->decodeContentId($content_id)['local_content_id'];
        $query = "SELECT '".$content_id."' as edgeContentId, type, label, created_at, updated_at FROM edge_content WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."'";
        $edge_rows = $this->db->exec($authId, $query);
        $edge_row = $edge_rows[0];
        $edges[$content_id] = $edge_row;
      }
    }
    return $edges;
  }

  public function getGraphEdgeAttributes($graphId){
    $authId = $this->graphIdConverter->getAuthId($graphId);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graphId);
    $attributes = array();
    $q = "SELECT local_content_id FROM edge_content WHERE graph_id = '".$localGraphId."'";
    $rows = $this->db->exec($authId, $q);
    $contentIds = array();
    foreach($rows as $row) $contentIds[] = $this->contentIdConverter->createGlobalContentId($graphId, $row['local_content_id']);

    $attrs = $this->getEdgeAttributes($contentIds);
    foreach($attrs as $global_content_id => $attr){
      $attributes[$this->contentIdConverter->getLocalContentId($global_content_id)] = $attr;
    }
    return $attributes;
  }

  /**
   * Get node attributes - all node content except text
   * @param null $graph_ids - in a global format and not diffGraph
   * @return array|bool
   */
  public function getGraphNodeAttributes($graph_ids=null){
    $contentIds = array();
    if(!is_array($graph_ids)) return false;

    foreach ($graph_ids as $graph_id) {
      $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
      $authId = $this->graphIdConverter->getAuthId($graph_id);
      $q = "SELECT graph_id, local_content_id FROM node_content WHERE graph_id = '".$localGraphId."'";
      $rows = $this->db->exec($authId, $q);
      foreach ($rows as $row){
        $contentIds[] = $this->contentIdConverter->createGlobalContentId(
            $this->graphIdConverter->createGlobalGraphId($authId, $row['graph_id']),
            $row['local_content_id']
        );
      }
    }

    return $this->getNodeAttributes($contentIds);
  }

  public function updateGraphName($graph_id, $name){
    $this->graphIdConverter->throwIfNotGlobal($graph_id);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);
    $query = "SELECT graph FROM `graph` WHERE id=".$localGraphId;
    $row = $this->db->exec($authId, $query)[0];
    $settings = json_decode($row['graph'], true);
    $settings['name'] = $name;
    $update_query = "UPDATE graph SET graph = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE id = ".$localGraphId;
    $this->db->exec($authId, $update_query);
  }

  public function setGraphAttributes($graphId, $attributes){
    $this->graphIdConverter->throwIfNotGlobal($graphId);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graphId);
    $authId = $this->graphIdConverter->getAuthId($graphId);
    $query = "SELECT graph FROM `graph` WHERE id=".$localGraphId;
    $row = $this->db->exec($authId, $query)[0];
    $settings = json_decode($row['graph'], true);
    $settings['attributes'] = array_merge($settings['attributes'], $attributes);
    $update_query = "UPDATE graph SET graph = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE id = ".$localGraphId;
    $this->db->exec($authId, $update_query);
    return true;
  }

  /**
   * Change current selected graph
   * @param $graphId
   * @param $position - 'leftGraphView' or 'rightGraphView'
   * @param $user_graph_ids - all user graph_ids
   * @return bool
   */
  public function changeGraphPosition($graphId, $position, $user_graph_ids){
    $this->graphIdConverter->throwIfNotGlobal($graphId);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graphId);
    $authId = $this->graphIdConverter->getAuthId($graphId);
    $user_graph_ids = array_map(function($graphId) {
      return $this->graphIdConverter->getLocalGraphId($graphId);
    }, $user_graph_ids);
    if(!in_array($position, array('leftGraphView', 'rightGraphView'))) return false;

    $query = "SELECT graph_id, settings FROM graph_settings WHERE graph_id IN (".implode(',',$user_graph_ids).")";
    $rows = $this->db->exec($authId, $query);
    foreach($rows as $row){
      $settings = json_decode($row['settings'], true);
      if($settings['position'] == $position){
        $settings['position'] = 'not to be shown';
        $update_query = "UPDATE graph_settings SET settings = '".$this->db->escape(json_encode($settings, JSON_UNESCAPED_UNICODE))."' WHERE graph_id = '".$row['graph_id']."'";
        $this->db->exec($authId, $update_query);
      }
      if($row['graph_id'] == $localGraphId){
        $settings['position'] = $position;
        $update_query = "UPDATE graph_settings SET settings = '".$this->db->escape(json_encode($settings, JSON_UNESCAPED_UNICODE))."' WHERE graph_id = '".$row['graph_id']."'";
        $this->db->exec($authId, $update_query);
      }
    }
    return true;
  }

  public function updateGraphElementContent($graph_id, $local_content_id, $r){
    $this->graphIdConverter->throwIfNotGlobal($graph_id);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);
    if($r['type'] == 'updateNodeText'){
      $query = "UPDATE node_content SET text = '".$this->db->escape($r['text'])."', updated_at = NOW() WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$r['node_alternative_id']."'";
      $this->db->exec($authId, $query);
    }else if($r['type'] == 'node_list_add_request'){
      return $this->addNodeContentList($r);
    }else if($r['type'] == 'node_list_remove_request'){
      return $this->removeNodeContentList($r);
    }else if($r['type'] == 'node_list_update_request'){
      return $this->updateNodeContentList($r);
    }else if($r['type'] == 'addAlternative'){
      // get type and importance of node
      $query = "SELECT type, importance FROM node_content WHERE `graph_id` = '".$localGraphId."' AND  local_content_id = '".$local_content_id."'";
      $rows = $this->db->exec($authId, $query);
      $type = $rows[0]['type'];
      $importance = $rows[0]['importance'];
      $alternative = $r['alternative'];
      $this->logger->log('$r='.var_export($r, true));
      $query = "INSERT INTO node_content SET `graph_id` = '".$this->db->escape($localGraphId)
          ."', `local_content_id` = '".$this->db->escape($local_content_id)
          ."', `alternative_id` = '".$this->db->escape($r['new_alternative_id'])
          ."', `p` = '".$this->db->escape(json_encode($alternative['p']))
          ."', `active_alternative_id` = '".$this->db->escape($r['new_alternative_id'])
          ."', `type` = '".$this->db->escape($type)
          ."', `label` = '".$this->db->escape($alternative['label'])
          ."', `text` = '".$this->db->escape($alternative['text'])
          ."', `reliability` = ".(is_numeric($alternative['reliability']) ? $alternative['reliability'] : 0)
          .", `importance` = ".(is_numeric($importance) ? $importance : 0).", created_at = NOW()";
      $this->logger->log($query);
      $this->db->exec($authId, $query);

      // update all alternatives to have the same active_alternative_id
      $query = "UPDATE node_content SET active_alternative_id = '".$this->db->escape($r['new_alternative_id'])."' WHERE `graph_id` = '".$localGraphId."' AND  local_content_id = '".$local_content_id."'";
      $this->logger->log($query);
      $this->db->exec($authId, $query);

    }else if($r['type'] == 'removeAlternative'){
      $query = "DELETE FROM node_content WHERE alternative_id = '".$this->db->escape($r['node_alternative_id'])."' AND `graph_id` = '".$localGraphId."' AND  local_content_id = '".$local_content_id."'";
      $this->logger->log($query);
      $this->db->exec($authId, $query);

      $query = "SELECT alternative_id FROM node_content WHERE `graph_id` = '".$localGraphId."' AND  local_content_id = '".$local_content_id."' ORDER BY alternative_id ASC";
      $rows = $this->db->exec($authId, $query);


      $query = "UPDATE node_content SET active_alternative_id = '".$rows[0]['alternative_id']."' WHERE `graph_id` = '".$localGraphId."' AND  local_content_id = '".$local_content_id."'";
      $this->logger->log($query);
      $this->db->exec($authId, $query);

    }else if($r['type'] == 'updateNodesReliabilities'){
      foreach($r['data'] as $node_content_id => $node){
        $local_content_id = $this->contentIdConverter->getLocalContentId($node_content_id);
        $query = "SELECT value_type FROM node_content WHERE `graph_id` = '".$localGraphId."' AND  local_content_id = '".$local_content_id."' AND alternative_id = 0";
        $rows = $this->db->exec($authId, $query);
        if (isset($rows[0]) && in_array($rows[0]['value_type'],  [Graphs::NODE_VALUE_TYPE_CONTINUOUS, Graphs::NODE_VALUE_TYPE_DISCRETE])) {
          $query = "UPDATE node_content SET p_samples = '".json_encode($node)."' WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."' AND alternative_id = 0";
          $this->logger->log($query);
          $this->db->exec($authId, $query);
        } else {
          foreach($node as $alternative_id => $reliability){
            $value = $this->db->escape($reliability);
            $query = "UPDATE node_content SET reliability = '".$value."' WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$alternative_id."'";
            $this->logger->log($query);
            $this->db->exec($authId, $query);
          }
        }
      }

    }else if($r['type'] == 'updateNodeAlternativesP'){
      foreach($r['alternatives'] as $alternative_id => $p){
        $value = $this->db->escape(json_encode($p));
        $query = "UPDATE node_content SET p = '".$value."' WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$alternative_id."'";
        $this->db->exec($authId, $query);
      }

      // we assume here that $r['alternatives'] contains _ALL_ alternatives of node
      // so we can safely remove other alternatives
      $query = "DELETE FROM node_content WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."' AND alternative_id NOT IN ('".implode("','",array_keys($r['alternatives']))."')";
      $this->logger->log($query);
      $this->db->exec($authId, $query);

    }else if($r['type'] == 'updateNodeAttribute'){
      if(in_array($r['nodeAttribute']['name'], self::NODE_ATTRIBUTE_NAMES)) $query = "UPDATE node_content SET `".$r['nodeAttribute']['name']."` = '".$this->db->escape($r['nodeAttribute']['value'])."' WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."'";
      if(in_array($r['nodeAttribute']['name'], self::NODE_ALTERNATIVE_ATTRIBUTE_NAMES)){
        if($r['nodeAttribute']['name'] == 'p') $value = $this->db->escape(json_encode($r['nodeAttribute']['value']));
        else $value = $this->db->escape($r['nodeAttribute']['value']);
        $query = "UPDATE node_content SET `".$r['nodeAttribute']['name']."` = '".$value."' WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$r['node_alternative_id']."'";
      }
      $this->db->exec($authId, $query);
      // if user changed type of node, drop nodes conditional probabilities
      if($r['nodeAttribute']['name'] == 'type'){
        $query = "UPDATE node_content SET `p` = '[]' WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."'";
        $this->db->exec($authId, $query);
      }

    }else if($r['type'] == 'updateEdgeAttribute'){
      $query = "UPDATE edge_content SET `".$r['edgeAttribute']['name']."` = '".$this->db->escape($r['edgeAttribute']['value'])."' WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."'";
      $this->db->exec($authId, $query);

    }else if($r['type'] == 'clear_node_conditionalPs'){
      $query = "UPDATE node_content SET `p` = '[]' WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."'";
      $this->logger->log($query);
      $this->db->exec($authId, $query);

    }else if($r['type'] == 'addEdge'){
      $lockName = $this->db->getCurrentDB().'.edge_content';
      $this->db->exec(null, 'SELECT GET_LOCK("'.$lockName.'",10)');
      $query = "SELECT MAX(local_content_id) as max_id FROM edge_content WHERE `graph_id` = '".$this->db->escape($localGraphId)."'";
      $rows = $this->db->exec($authId, $query);
      $local_content_id = (int)$rows[0]['max_id'] + 1;
      $query = "INSERT INTO edge_content SET `graph_id` = '".$this->db->escape($localGraphId)."', `local_content_id` = '".$this->db->escape($local_content_id)."', `type` = '".$this->db->escape($r['edge']['type'])."', `label` = '".$this->db->escape($r['edge']['label'])."', created_at = NOW()";
      $this->db->exec($authId, $query);
      $this->db->exec(null, 'SELECT RELEASE_LOCK("'.$lockName.'")');
      return json_encode(array('edgeContentId'=>$this->contentIdConverter->createGlobalContentId($graph_id,$local_content_id)));

    }else if($r['type'] == 'addNode'){
      $lockName = $this->db->getCurrentDB().'.node_content';
      $this->db->exec(null, 'SELECT GET_LOCK("'.$lockName.'",10)');

      $query = "SELECT MAX(local_content_id) as max_id FROM node_content WHERE `graph_id` = '".$this->db->escape($localGraphId)."'";
      $rows = $this->db->exec($authId, $query);
      $local_content_id = $rows[0]['max_id'] + 1;
      foreach($r['node']['alternatives'] as $alternative_id => $alternative){
        // mysql_real_escape(0) gives '' so check this numeric fields here
        if(!is_numeric($alternative_id)) $this->logger->log('Error: alternative_id '.var_export($alternative_id, true).' is not numeric');
        if(!is_numeric($local_content_id)) $this->logger->log('Error: local_content_id '.var_export($local_content_id, true).' is not numeric');
        if(!is_numeric($r['node']['active_alternative_id'])) $this->logger->log('Error: active_alternative_id '.var_export($r['node']['active_alternative_id'], true).' is not numeric');

        $query = "INSERT INTO node_content SET `graph_id` = '".$this->db->escape($localGraphId)
            ."', `local_content_id` = '".$local_content_id
            ."', `alternative_id` = '".$alternative_id
            ."', `p` = '".$this->db->escape(json_encode($alternative['p']))
            ."', `active_alternative_id` = '".$r['node']['active_alternative_id']
            ."', `type` = '".$this->db->escape($r['node']['type'])
            ."', `label` = '".$this->db->escape($alternative['label'])
            ."', `text` = '".$this->db->escape($alternative['text'])
            ."', `reliability` = ".(is_numeric($alternative['reliability']) ? $alternative['reliability'] : 0)
            .", `importance` = ".(is_numeric($r['node']['importance']) ? $r['node']['importance'] : 0).", created_at = NOW()";
        $this->logger->log($query);

        $this->db->exec($authId, $query);
      }

      $this->db->exec(null, 'SELECT RELEASE_LOCK("'.$lockName.'")');
      return json_encode(array('nodeContentId'=>$this->contentIdConverter->createGlobalContentId($graph_id, $local_content_id)));

    }else if($r['type'] == 'addIcon'){
      // mark in db that now it has icon
      $query = "UPDATE node_content SET has_icon = 1 WHERE graph_id = '".$localGraphId."' AND local_content_id = '".$local_content_id."'";
      $this->db->exec($authId, $query);

    }
    return true;
  }

  public function addSource($auth_id, $item){
    $q = "INSERT INTO source SET "
        ."source_type='".$item['source_type']
        ."', `name`='".$this->db->escape($item['name'])
        ."', url='".$this->db->escape($item['url'])
        ."', author='".$this->db->escape($item['author'])
        ."', editor='".$this->db->escape($item['editor'])
        ."', publisher='".$this->db->escape($item['publisher'])
        ."', publisher_reliability=".doubleval($item['publisher_reliability'])
        .",  scopus_title_list_id=".(strlen($item['scopus_title_list_id']) ? (int)($item['scopus_title_list_id']) : "NULL")
        .",  publish_date='".$this->db->escape($item['publish_date'])
        ."', `comment`='".$this->db->escape($item['comment'])."' ";
    $this->logger->log($q);
    return $this->db->exec($auth_id, $q);
  }

  private function addNodeContentList($r){
    $graph_id = $r['graphId'];
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);

    if($r['nodeType'] == self::NODE_BASIC_TYPES['fact']){
      // if it is a new source - add it to the main list
      if(empty($r['item']['source_id'])){
        // TODO: even though client thinks there is no correspondent source, it may be in fact - we need to check it here somehow
        $r['item']['source_id'] = $this->addSource($authId, $r['item']);
      }

      $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
      $q = "INSERT INTO node_content_source SET graph_id='".$localGraphId
          ."', local_content_id='".$local_content_id
          ."', alternative_id='".$r['node_alternative_id']
          ."', comment='".$this->db->escape($r['item']['comment'])
          ."', source_id='".$this->db->escape($r['item']['source_id'])
          ."', `pages`='".$this->db->escape($r['item']['pages'])."' ";

      $this->logger->log($q);
      $item_id = $this->db->exec($authId, $q);
      // calculate fact reliability
      $reliability = $this->getFactReliability($graph_id,$local_content_id);
      return json_encode(array('result'=>'SUCCESS','id'=>$item_id,'reliability'=>$reliability));

    }elseif($r['nodeType'] == self::NODE_BASIC_TYPES['proposition']){
      $graph_id = $r['graphId'];
      $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
      $q = "INSERT INTO node_content_falsification SET graph_id='".$localGraphId
          ."', local_content_id='".$local_content_id
          ."', alternative_id='".$r['node_alternative_id']
          ."', `name`='".$this->db->escape($r['item']['name'])
          ."', comment='".$this->db->escape($r['item']['comment'])."' ";

      $this->logger->log($q);
      $item_id = $this->db->exec($authId, $q);
      return json_encode(array('result'=>'SUCCESS','id'=>$item_id));
    }
  }

  private function updateNodeContentList($r){
    $graph_id = $r['graphId'];
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);
    $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
    if($r['nodeType'] == self::NODE_BASIC_TYPES['fact']) {
      // Client sets $r['item']['source_id'] as empty if user modified fields of source
      // We treat it here as signal for new source creation
      if(empty($r['item']['source_id'])){
        $source_id = $this->addSource($authId, $r['item']);
      }else{
        // TODO: check that this source_id is ours
        $source_id = $r['item']['source_id'];
      }
      $q = "UPDATE node_content_source SET "
          . " source_id='" . $this->db->escape($source_id)
          . "', comment='" . $this->db->escape($r['item']['comment'])
          . "', `pages`='" . $this->db->escape($r['item']['pages'])
          . "' WHERE id = '" . $this->db->escape($r['item']['id']) . "'";
      $this->logger->log($q);
      $this->db->exec($authId, $q);
      // calculate fact reliability
      $reliability = $this->getFactReliability($graph_id, $local_content_id);

      return json_encode(array('result' => 'SUCCESS', 'reliability' => $reliability));

    }elseif($r['nodeType'] == self::NODE_BASIC_TYPES['proposition']){
      $q = "UPDATE node_content_falsification SET "
          ."`name` = '" . $this->db->escape($r['item']['name'])
          . "', comment = '" . $this->db->escape($r['item']['comment'])
          . "' WHERE id = '" . $this->db->escape($r['item']['id']) . "'";
      $this->logger->log($q);
      $this->db->exec($authId, $q);

     return json_encode(array('result' => 'SUCCESS'));
    }
  }

  private function removeNodeContentList($r){
    $graph_id = $r['graphId'];
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);
    $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
    if($r['nodeType'] == self::NODE_BASIC_TYPES['fact']) {
      $q = "DELETE FROM node_content_source WHERE graph_id='".$localGraphId
          ."' AND local_content_id='".$local_content_id
          ."' AND alternative_id='".$r['node_alternative_id']
          ."' AND id='".$this->db->escape($r['itemId'])."'";
      $this->logger->log($q);
      $this->db->exec($authId, $q);
      // calculate fact reliability
      $reliability = $this->getFactReliability($graph_id,$local_content_id);
      return json_encode(array('result'=>'SUCCESS','reliability'=>$reliability));
    }else{
      $q = "DELETE FROM node_content_falsification WHERE graph_id='".$localGraphId
          ."' AND local_content_id='".$local_content_id
          ."' AND alternative_id='".$r['node_alternative_id']
          ."' AND id='".$this->db->escape($r['itemId'])."'";
      $this->logger->log($q);
      $this->db->exec($authId, $q);
      return json_encode(array('result'=>'SUCCESS'));
    }
  }

  public function getFactReliability($graph_id,$local_content_id){
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);
    $q = "SELECT source_id FROM node_content_source WHERE graph_id='".$localGraphId."' AND local_content_id='".$local_content_id."'";
    $this->logger->log($q);
    $rows = $this->db->exec($authId, $q);

    $reliability_array = array();
    foreach($rows as $row){
      $q = "SELECT publisher_reliability FROM source WHERE id='".$row['source_id']."'";
      $this->logger->log($q);
      $rs = $this->db->exec($authId, $q);
      $reliability_array[] = $rs[0]['publisher_reliability'];
    }

    return min(array_sum($reliability_array)*10,100)/100;
  }

  public function removeGraph($graph_id){
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);

    $tables = array('graph_history','graph_settings','node_content','edge_content','node_content_source','node_content_falsification');
    $result = array();

    $q = "DELETE FROM graph WHERE id = '".$localGraphId."'";
    $r = $this->db->exec($authId, $q);
    if($r == true) $result['graph'] = 'success';
    else $result['graph'] = print_r($r, true);

    foreach($tables as $table){
      $q = "DELETE FROM ".$table." WHERE graph_id = '".$localGraphId."'";
      $r = $this->db->exec($authId, $q);
      if($r == true) $result[$table] = 'success';
      else $result[$table] = print_r($r, true);
    }
    return $result;
  }

  public function createNewGraph($auth_id, $name){
    if(strlen($auth_id) == 0){
      $this->logger->log('cannot createNewGraph for auth_id='.$auth_id);
      return false;
    }

    $graph = '{"name":"'.$this->db->escape($name).'","isEditable":true, "attributes":{"isInTrash":false}, "edgeTypes":["link","causal","conditional"],"nodeTypes":["fact","proposition","illustration","question", "to_read", "best_known_practice"],"nodeDefaultType":"text","edgeDefaultType":"causal"}';
    $q = "INSERT INTO graph SET graph = '".$graph."', created_at = NOW()";
    $graph_id = $this->db->exec($auth_id, $q);

    $elements = '{"nodes":{},"edges":{}}';
    $q = "INSERT INTO graph_history SET graph_id = '".$graph_id."', step = '1', timestamp = unix_timestamp(NOW()), elements = '".$elements."'";
    $this->db->exec($auth_id, $q);

    $default_skin = '{"node":{"constr":{"withoutIcon":"GraphViewNode","withIcon":"GraphViewNodeImage"},"attr":{"typeColors":{"fact":"#50ade3","proposition":"#b363d2","illustration":"#51d272","question":"#bdbdbd","to_read":"#e3d634","best_known_practice":"#ffa500"},"stickers":{"bayes_error":"<svg xmlns=\'http://www.w3.org/2000/svg\'  width=\'25\' height=\'25\'><g id=\'alert\' fill=\'yellow\'><rect id=\'point\' x=\'11\' y=\'16\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' width=\'2\' height=\'2\'/><polygon id=\'stroke\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' points=\'13.516,10 10.516,10 11,15 13,15\'/><g id=\'triangle\'><path d=\'M12.017,5.974L19.536,19H4.496L12.017,5.974 M12.017,3.5c-0.544,0-1.088,0.357-1.5,1.071L2.532,18.402C1.707,19.831,2.382,21,4.032,21H20c1.65,0,2.325-1.169,1.5-2.599L13.517,4.572C13.104,3.857,12.561,3.5,12.017,3.5L12.017,3.5z\'/></g></g></svg>"}}},"edge":{"constr":"GraphViewEdge","attr":{"typeColors":{"link":"#0f1226","causal":"#847fa5","conditional":"#6a6a6b"},"typeDirection":{"link":"bi","causal":"uni","conditional":"uni"}}},"nodeLabel":{"constr":"GraphViewNodeLabel","attr":{"font":"Roboto","fill":"#BBBBBB","maxSize":24}}}';
    $settings = '{"skin":'.$default_skin.',"layout":"basicLayout","position":"leftGraphView"}';
    $q = "INSERT INTO graph_settings SET graph_id = '".$graph_id."', settings = '".$this->db->escape($settings)."'";
    $this->logger->log($q);
    $this->db->exec($auth_id, $q);

    return $this->graphIdConverter->createGlobalGraphId($auth_id, $graph_id);
  }

  /**
   * Copy graph with all history
   * @param $auth_id
   * @param $name
   * @param $graph_id
   */
  public function copyGraph($auth_id, $name, $graph_id){
    $this->graphIdConverter->throwIfNotGlobal($graph_id);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);
    $authId = $this->graphIdConverter->getAuthId($graph_id);
    $q = "SELECT graph FROM graph WHERE id = '".$localGraphId."'";
    $rows = $this->db->exec($authId, $q);
    $graph = json_decode($rows[0]['graph'], true);
    $graph['name'] = $name;
    $graph = json_encode($graph, JSON_UNESCAPED_UNICODE);
    $q = "INSERT INTO graph SET graph = '".$graph."'";
    $new_graph_id = $this->db->exec($auth_id, $q);

    $q = "SELECT * FROM graph_history WHERE graph_id = '".$graph_id."'";
    $rows = $this->db->exec($authId, $q);
    foreach($rows as $row){
      $nodes = array();
      $edges = array();
      $elements = json_decode($row['elements'], true);

      foreach($elements['nodes'] as $k => $node){
        $local_content_id = $this->contentIdConverter->getLocalContentId($node['nodeContentId']);
        $node['nodeContentId'] = $this->contentIdConverter->createGlobalContentId($new_graph_id, $local_content_id);
        $nodes[$k] = $node;
      }
      foreach($elements['edges'] as $k => $edge){
        $local_content_id = $this->contentIdConverter->getLocalContentId($edge['edgeContentId']);
        $edge['edgeContentId'] = $this->contentIdConverter->createGlobalContentId($new_graph_id, $local_content_id);
        $edges[$k] = $edge;
      }
      $elements = json_encode(array("nodes"=>$nodes, "edges"=>$edges), JSON_FORCE_OBJECT);
      $q = "INSERT INTO graph_history SET graph_id = '".$new_graph_id."', step = '".$row['step']."', timestamp = '".$row['timestamp']."', elements = '".$elements."'";
      $this->db->exec($auth_id, $q);
    }

    $q = "SELECT settings FROM graph_settings WHERE graph_id = '".$graph_id."'";
    $rows = $this->db->exec($authId, $q);
    foreach ($rows as $row) {
      $q = "INSERT INTO graph_settings SET graph_id = '".$new_graph_id."', settings = '".$row['settings']."'";
      $this->db->exec($auth_id, $q);
    }

    $q = "SELECT local_content_id, type, label, reliability, importance, text, has_icon FROM node_content WHERE graph_id = '".$graph_id."'";
    $rows = $this->db->exec($authId, $q);
    foreach ($rows as $row) {
      $q = "INSERT INTO node_content SET ".
          "graph_id = '".$new_graph_id."', local_content_id = '".$row['local_content_id']."', ".
          "type = '".$row['type']."',	label = '".$row['label']."', ".
          "reliability = '".$row['reliability']."', importance = '".$row['importance']."', ".
          "text = '".$row['local_content_id']."', has_icon = '".$row['local_content_id']."', updated_at = NOW(), created_at = NOW()";
      $this->db->exec($auth_id, $q);
    }

    $q = "SELECT local_content_id,	type,	label FROM edge_content WHERE graph_id = '".$graph_id."'";
    $rows = $this->db->exec($authId, $q);
    foreach ($rows as $row) {
      $q = "INSERT INTO edge_content SET ".
      "graph_id='".$new_graph_id."', ".
      "local_content_id='".$row['local_content_id']."', ".
      "`type`='".$row['type']."',	label='".$row['label']."', updated_at=NOW(), created_at=NOW()";
      $this->db->exec($auth_id, $q);
    }
  }

  /**
   * @param $originalP
   * @param $new_graph_id
   * @param ContentIdConverter $contentIdConverter
   * @return mixed
   */
  public static function convertPforClone($nodeValueType, $originalP, $new_graph_id, ContentIdConverter $contentIdConverter)
  {
    if ($nodeValueType == Graphs::NODE_VALUE_TYPE_CONTINUOUS || $nodeValueType == Graphs::NODE_VALUE_TYPE_DISCRETE) {
      // formula uses only local node ids and thus does not change
      return $originalP;
    }

    $newP = [];
    foreach ($originalP as $parentAlternativesSet => $probability){
      $parentAlternativesSet = json_decode($parentAlternativesSet, true);
      $newParentAlternativesSet = [];
      foreach ($parentAlternativesSet as $parentGlobalNodeId=>$parentAlternativeId) {
        $local_content_id = $contentIdConverter->decodeContentId($parentGlobalNodeId)['local_content_id'];
        $newGlobalContentId = $contentIdConverter->createGlobalContentId($new_graph_id, $local_content_id);
        $newParentAlternativesSet[$newGlobalContentId] = $parentAlternativeId;
      }
      $newParentAlternativesSet = json_encode($newParentAlternativesSet);
      $newP[$newParentAlternativesSet] = $probability;
    }
    return $newP;
  }

  private function getInsertQuery(
      $row,
      $new_graph_id,
      $node_alternative_attr_names_without_time,
      $localGraphId,
      $fromAuthId
  ){
    $q = "INSERT INTO node_content SET graph_id=".$new_graph_id.", "
        ."local_content_id=".$row['local_content_id'].", "
        ."alternative_id=".$row['alternative_id'].", "
        .$this->getQueryPart(self::NODE_ATTRIBUTE_NAMES, $row).", "
        .$this->getQueryPart($node_alternative_attr_names_without_time, $row).", "
        ." `text`='".$this->db->escape($row['text'])."', "
        ." cloned_from_graph_id='".$localGraphId."', "
        ." cloned_from_local_content_id='".$row['local_content_id']."', "
        ." cloned_from_auth_id='".$fromAuthId."', "
        ." updated_at=NOW(), created_at=NOW()";
    return $q;
  }

  private function getQueryPart($names, $values){
    $str = "";
    foreach ($names as $name) {
      $str .= ", `".$name."` = ".(!isset($values[$name]) || $values[$name] === null ? "null" : "'".$this->db->escape($values[$name])."'");
    }
    return substr($str,1);
  }

  /**
   * Clone graph from specific step. All text and attributes are copied
   * - this preserve text on clone from modification by clonee and
   * simplify process of cloning from clones itself
   * @param $graph_id - original graph id in a global format
   * @param $graph_history_step - step in history of original graph
   * @param $ts - timestamp that determine node content version in node_content_history
   * @param $auth_id - user who clones graph
   * @return array|bool|int|mysqli_result|string
   * @throws Exception
   *
   */
  public function cloneGraph($graph_id, $graph_history_step, $ts, $auth_id){
    if(!$this->graphIdConverter->isGraphIdGlobal($graph_id)){
      throw new Exception("Error in ".__CLASS__."::".__METHOD__.": graph_id must be in a global format, but got ".$graph_id);
    }

    $fromAuthId = $this->graphIdConverter->getAuthId($graph_id);
    $localGraphId = $this->graphIdConverter->getLocalGraphId($graph_id);

    // copy row in graph table
    $q = "SELECT graph FROM graph WHERE id = '".$localGraphId."'";
    $this->logger->log($q);
    $rows = $this->db->exec($fromAuthId, $q);
    if(!count($rows)) return false;

    $q = "INSERT INTO graph SET graph = '".$rows[0]['graph']."', cloned_from_graph_id = '".$localGraphId."', cloned_from_graph_history_step = '".$graph_history_step."', cloned_from_auth_id = '".$fromAuthId."', created_at = NOW()";
    $new_graph_id = $this->db->exec($auth_id, $q);
    $global_new_graph_id = $this->graphIdConverter->createGlobalGraphId($auth_id, $new_graph_id);
    // change nodeContentId, edgeContentId in graph_history table for new graph
    $q = "SELECT elements, node_mapping FROM graph_history WHERE graph_id = '".$localGraphId."' AND step = '".$graph_history_step."'";
    $rows = $this->db->exec($fromAuthId, $q);
    $nodes = array();
    $edges = array();
    $local_content_ids = array();
    $elements = json_decode($rows[0]['elements'], true);

    foreach($elements['nodes'] as $k => $node){
      $local_content_id = $this->contentIdConverter->getLocalContentId($node['nodeContentId']);
      $node['nodeContentId'] = $this->contentIdConverter->createGlobalContentId($global_new_graph_id, $local_content_id);
      $local_content_ids[] = $local_content_id;
      $nodes[$k] = $node;
    }
    foreach($elements['edges'] as $k => $edge){
      $local_content_id = $this->contentIdConverter->getLocalContentId($edge['edgeContentId']);
      $edge['edgeContentId'] = $this->contentIdConverter->createGlobalContentId($global_new_graph_id, $local_content_id);
      $edges[$k] = $edge;
    }
    $elements = json_encode(array("nodes"=>$nodes, "edges"=>$edges), JSON_FORCE_OBJECT);
    $q = "INSERT INTO graph_history SET graph_id = '".$new_graph_id."', step = '1', timestamp = '".time()."', elements = '".$elements."', node_mapping = '".$rows[0]['node_mapping']."'";
    $this->logger->log($q);
    $this->db->exec($auth_id, $q);

    $this->copyNodeContents($fromAuthId, $auth_id, $new_graph_id, $localGraphId, $local_content_ids, $ts);

    // transform conditional probabilities to respect new nodeContentIds
    $q = "SELECT local_content_id, alternative_id, p, value_type FROM node_content WHERE graph_id = '".$new_graph_id."'";
    $rows = $this->db->exec($auth_id, $q);
    foreach ($rows as $row) {
      if($row['p'] && $row['p'] !== '' && json_decode($row['p'], true)){
        $newP = Graphs::convertPforClone($row['value_type'], json_decode($row['p'], true), $global_new_graph_id, $this->contentIdConverter);
        $q = "UPDATE node_content SET p = '".$this->db->escape(json_encode($newP))."'"
            ." WHERE graph_id = '".$new_graph_id."' AND local_content_id='".$row['local_content_id']."' AND alternative_id='".$row['alternative_id']."'";
        $this->db->exec($auth_id, $q);
      }
    }

    // Copy node_content_sources
    $q = "SELECT * FROM node_content_source WHERE graph_id = '".$localGraphId."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $rows = $this->db->exec($fromAuthId, $q);
    foreach ($rows as $row){
      $q = "SELECT id FROM source WHERE cloned_from_id = '".$row['source_id']."' AND cloned_from_auth_id='".$fromAuthId."'";
      $cloned_sources = $this->db->exec($auth_id, $q);
      // if we have already duplicated source for this node_content_source, just use its id
      if(count($cloned_sources)){
        $id = $cloned_sources[0]['id'];
      }else{
        // duplicate source for clonee user
        $q = "SELECT * FROM source WHERE id = '".$row['source_id']."'";
        $sourceArr = $this->db->exec($fromAuthId, $q);

        if (!count($sourceArr))  continue;

        $source = $sourceArr[0];

        $q = "INSERT INTO source SET ".
            " source_type = '".$source['source_type']."',".
            " field_type = '".$source['field_type']."',".
            " `name` = '".$this->db->escape($source['name'])."',".
            " url = '".$this->db->escape($source['url'])."',".
            " author = '".$this->db->escape($source['author'])."',".
            " editor = '".$this->db->escape($source['editor'])."',".
            " publisher = '".$this->db->escape($source['publisher'])."',".
            " publisher_reliability = '".$source['publisher_reliability']."', ".
            " scopus_title_list_id = ".($source['scopus_title_list_id'] ? "'".$source['scopus_title_list_id']."'" : 'NULL').", ".
            " publish_date = '".$source['publish_date']."', ".
            " `comment` = '".$this->db->escape($source['comment'])."', ".
            " cloned_from_id = '".$source['id']."', ".
            " cloned_from_auth_id = '".$fromAuthId."', ".
            " created_at = NOW(), ".
            " updated_at = NOW()";
        $this->logger->log($q);
        $id = $this->db->exec($auth_id, $q);
      }

      $q = "INSERT INTO node_content_source SET ".
          "graph_id = '".$new_graph_id."',".
          "local_content_id = '".$row['local_content_id']."',".
          "alternative_id = '".$row['alternative_id']."',".
          "pages = '".$this->db->escape($row['pages'])."',".
          "`comment` = '".$this->db->escape($row['comment'])."',".
          "source_id = '".$id."',".
          "created_at = NOW(), ".
          "updated_at = NOW()";
      $this->db->exec($auth_id, $q);
      $this->logger->log($q);
    }

    // Copy node_content_falsification
    $q = "SELECT '".$new_graph_id."', local_content_id, alternative_id, `name`, comment FROM node_content_falsification "
        ."WHERE graph_id = '".$localGraphId."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $rows = $this->db->exec($fromAuthId, $q);

    foreach ($rows as $row) {
      $q = "INSERT INTO node_content_falsification SET ".
          "`graph_id` = '".$new_graph_id."', ".
          "`local_content_id` = '".$row['local_content_id']."', ".
          "`alternative_id` = '".$row['alternative_id']."', ".
          "`name` = '".$this->db->escape($row['name'])."', ".
          "`comment` = '".$this->db->escape($row['comment'])."', ".
          "`created_at` = NOW(), ".
          "`updated_at` = NOW()";
      $this->db->exec($auth_id, $q);
    }

    // just copy edges as is
    $q = "SELECT `local_content_id`, `type`, `label` FROM edge_content WHERE graph_id = '".$localGraphId."'";
    $rows = $this->db->exec($fromAuthId, $q);
    foreach ($rows as $row) {
      $q = "INSERT INTO edge_content SET ".
          "`graph_id` = '".$new_graph_id."', ".
          "`local_content_id` = '".$row['local_content_id']."', ".
          $this->getQueryPart(self::EDGE_ATTRIBUTE_NAMES, $row).", ".
          "`updated_at` = NOW(), `created_at` = NOW()";
      $this->db->exec($auth_id, $q);
    }

    // copy graph settings
    $q = "SELECT settings FROM graph_settings WHERE graph_id = '".$localGraphId."'";
    $rows = $this->db->exec($fromAuthId, $q);
    foreach ($rows as $row) {
      $q = "INSERT INTO  graph_settings SET graph_id = ".$new_graph_id.", settings = '".$this->db->escape($row['settings'])."'";
      $this->db->exec($auth_id, $q);
    }

    // add cloned graph info to original graph.cloned_to
    $q = "SELECT cloned_to FROM graph WHERE id = '".$localGraphId."'";
    $rows = $this->db->exec($fromAuthId, $q);
    $cloned_to = json_decode($rows[0]['cloned_to'], true);
    $cloned_to[$this->graphIdConverter->createGlobalGraphId($auth_id, $new_graph_id)] = $this->getClonedToRecord($auth_id, $new_graph_id);
    $q = "UPDATE graph SET cloned_to='".$this->db->escape(json_encode($cloned_to))."' WHERE id = '".$localGraphId."'";
    $this->db->exec($fromAuthId, $q);

    return $this->graphIdConverter->createGlobalGraphId($auth_id, $new_graph_id);
  }

  public function copyNodeContents($fromAuthId, $auth_id, $new_graph_id, $localGraphId, $local_content_ids, $ts)
  {
    $node_alternative_attr_names_without_time = self::NODE_ALTERNATIVE_ATTRIBUTE_NAMES;
    unset($node_alternative_attr_names_without_time[array_search('created_at', self::NODE_ALTERNATIVE_ATTRIBUTE_NAMES)]);
    unset($node_alternative_attr_names_without_time[array_search('updated_at', self::NODE_ALTERNATIVE_ATTRIBUTE_NAMES)]);

    // if timestamp is set copy node_contents from node_content_history
    $historyNodeContentIds = [];
    if ($ts) {
      $subq = "SELECT MAX(id) FROM node_content_history "
          ."WHERE graph_id='".$localGraphId."' AND snap_timestamp <= '".$ts."' GROUP BY local_content_id, alternative_id";
      $q = "SELECT * FROM node_content_history WHERE id IN (".$subq.")";
      $rows = $this->db->exec($fromAuthId, $q);
      foreach ($rows as $row) {
        $historyNodeContentIds[] = $row['local_content_id'];
        $this->db->exec(
            $auth_id,
            $this->getInsertQuery(
                $row,
                $new_graph_id,
                $node_alternative_attr_names_without_time,
                $localGraphId,
                $fromAuthId
            )
        );
      }
    }

    // there maybe still exists some nodeContents that is not in history yet - copy them from node_content table
    $rest_local_content_ids = array_diff($local_content_ids, $historyNodeContentIds);
    if (!empty($rest_local_content_ids)) {
      $q ="SELECT id, local_content_id, alternative_id,	"
          .implode(',', self::NODE_ATTRIBUTE_NAMES).", "
          .implode(',', $node_alternative_attr_names_without_time)
          .", text"
          ." FROM node_content "
          ."WHERE graph_id = '".$localGraphId."' AND local_content_id IN ('".implode("','",$rest_local_content_ids)."')";
      $rows = $this->db->exec($fromAuthId, $q);
      foreach ($rows as $row) {
        $this->db->exec(
            $auth_id,
            $this->getInsertQuery(
                $row,
                $new_graph_id,
                $node_alternative_attr_names_without_time,
                $localGraphId,
                $fromAuthId
            )
        );
      }
    }
  }

  /**
   * Get value that must be added into json of cloned_to column
   * @param $auth_id
   * @param $new_graph_id
   * @return array
   */
  private function getClonedToRecord($auth_id, $new_graph_id) {
    $q = "SELECT username FROM auth WHERE id = '".$auth_id."'";
    $rows = $this->db->exec(null, $q);
    $username = $rows[0]['username'];
    $q = "SELECT graph FROM graph WHERE id = '".$new_graph_id."'";
    $rows = $this->db->exec($auth_id, $q);
    $name = json_decode($rows[0]['graph'], true)['name'];
    return [
        'graphId'=>$new_graph_id,
        'graphName'=>$name,
        'authId'=>$auth_id,
        'username'=>$username
    ];
  }
}
