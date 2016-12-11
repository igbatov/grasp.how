<?php

class Graphs {
  private $db;
  private $contentIdConverter;
  private $logger;
  private $node_basic_types;

  private $node_attribute_names;
  private $node_alternative_attribute_names;
  private $edge_attribute_names;

  private $auth_id;

  public function __construct(DB $db, ContentIdConverter $contentIdConverter, $logger, $auth_id){
    $this->db = $db;
    $this->logger = $logger;
    $this->auth_id = $auth_id;
    $this->contentIdConverter = $contentIdConverter;

    $this->node_basic_types = array('fact'=>'fact','proposition'=>'proposition');

    // define node and edge attributes (must be the same as db table column names)
    $this->node_attribute_names = array('type', 'importance', 'has_icon', 'active_alternative_id', 'stickers');
    $this->node_alternative_attribute_names = array('label', 'reliability','p','created_at','updated_at');
    $this->edge_attribute_names = array('type', 'label');
  }

  /**
   * Return graph properties from table 'graph' - name, node types, edge types
   * @param $graph_id
   * @return array
   */
  public function getGraphProps($graph_id){
    $graph_query = "SELECT id, graph FROM graph WHERE id = '".$graph_id."'";
    $rows = $this->db->execute($graph_query);
    return json_decode($rows[0]['graph'], true);
  }

  /**
   * Return graph settings from table 'graph_settings' - mainly skin: node type colors, node constructors, ...
   * @param $graph_id
   * @return array|bool
   */
  public function getGraphSettings($graph_id){
    $query = "SELECT graph_id, settings FROM graph_settings WHERE graph_id = '".$graph_id."'";
    $rows = $this->db->execute($query);
    if(count($rows) == 0) return false;
    $row = $rows[0];
    return json_decode($row['settings'], true);
  }

  public function getGraphNodeContent($content_ids){
    // get all except text
    $nodes = $this->getNodeAttributes($content_ids);

    // add text
    foreach($nodes as $content_id=>$node){
      $graph_id = $this->contentIdConverter->decodeContentId($content_id)['graph_id'];
      $local_content_id = $this->contentIdConverter->decodeContentId($content_id)['local_content_id'];

      $node_rows = $this->db->execute("SELECT * FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'");

      // alternatives
      foreach($node_rows as $node_row){
        // alternative text
        $nodes[$content_id]['alternatives'][$node_row['alternative_id']]['text'] = $node_row['text'];

        // get alternative lists
        $list_items = array();
        if($node['type'] == $this->node_basic_types['fact']){
          $q = "SELECT id, source_id, comment, pages FROM node_content_source WHERE graph_id='".$graph_id."' AND local_content_id='".$local_content_id."' AND alternative_id='".$node_row['alternative_id']."'";
          $this->logger->log($q);
          $rows = $this->db->execute($q);
          foreach($rows as $row){
            $q = "SELECT * FROM source WHERE id='".$row['source_id']."' AND auth_id='".$this->auth_id."'";
            $this->logger->log($q);
            $sources = $this->db->execute($q);
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
              " WHERE graph_id='".$graph_id."' AND local_content_id='".$local_content_id."' AND alternative_id='".$node_row['alternative_id']."'";
          $this->logger->log($q);
          $rows = $this->db->execute($q);
          foreach($rows as $row){
            $list_items[$row['id']] = $row;
          }
        }
        $nodes[$content_id]['alternatives'][$node_row['alternative_id']]['list'] = $list_items;
      }
    }
    return $nodes;
  }

  public function getNodeAttributes($content_ids){
    $nodes = array();
    foreach($content_ids as $content_id){
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
            if(isset($graph2NodeContent[$attribute_name]) && $graph2NodeContent[$attribute_name] != null)
              $nodes[$content_id][$attribute_name] = $graph2NodeContent[$attribute_name];
          }
        }

        $nodes[$content_id]['nodeContentId'] = $content_id;

        // add stickers that show status of node modification
        $status = 'unmodified';
        if($contentId['graphId1'] && !$contentId['graphId2']) $status = 'absent';
        elseif(!$contentId['graphId1'] && $contentId['graphId2']) $status = 'added';
        elseif($contentId['graphId1'] && $contentId['graphId2']){
          $q = "SELECT created_at, updated_at FROM node_content WHERE graph_id = '". $contentId['graphId2']."' AND local_content_id = '".$contentId['localContentId2']."'";
          $rows = $this->db->execute($q);
          if(GraphDiffCreator::isCloneModified($rows)) $status = 'modified';
        }
        $nodes[$content_id]['stickers'][] = $status;

      }else{
        $graph_id = $this->contentIdConverter->decodeContentId($content_id)['graph_id'];
        $local_content_id = $this->contentIdConverter->decodeContentId($content_id)['local_content_id'];

        $query = "SELECT '".$content_id."' as nodeContentId, alternative_id, ".implode(',',$this->node_alternative_attribute_names).", ".implode(',',$this->node_attribute_names).", cloned_from_graph_id, cloned_from_local_content_id FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
        $node_rows = $this->db->execute($query);

        $node_attributes = array();

        // == fill in node attributes ==
        $node_row = $node_rows[0];
        // general attributes
        foreach($this->node_attribute_names as $name){
          $node_attributes[$name] = $node_row[$name];
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
          foreach($this->node_alternative_attribute_names as $name){
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
        $local_content_id = $this->contentIdConverter->decodeContentId($content_id)['local_content_id'];
        $query = "SELECT '".$content_id."' as edgeContentId, type, label, created_at, updated_at FROM edge_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
        $edge_rows = $this->db->execute($query);
        $edge_row = $edge_rows[0];
        $edges[$content_id] = $edge_row;
      }
    }
    return $edges;
  }

  public function getGraphEdgeAttributes($graphId){
    $attributes = array();
    $q = "SELECT local_content_id FROM edge_content WHERE graph_id = '".$graphId."'";
    $rows = $this->db->execute($q);
    $contentIds = array();
    foreach($rows as $row) $contentIds[] = $this->contentIdConverter->createGlobalContentId($graphId, $row['local_content_id']);

    $attrs = $this->getEdgeAttributes($contentIds);
    foreach($attrs as $global_content_id => $attr){
      $attributes[$this->contentIdConverter->getLocalContentId($global_content_id)] = $attr;
    }
    return $attributes;
  }

  public function getGraphNodeAttributes($graphId){
    $attributes = array();
    $q = "SELECT local_content_id FROM node_content WHERE graph_id = '".$graphId."'";
    $rows = $this->db->execute($q);
    $contentIds = array();
    foreach($rows as $row) $contentIds[] = $this->contentIdConverter->createGlobalContentId($graphId, $row['local_content_id']);

    $attrs = $this->graphs->getNodeAttributes($contentIds);
    foreach($attrs as $global_content_id => $attr){
      $attributes[$this->contentIdConverter->getLocalContentId($global_content_id)] = $attr;
    }
    return $attributes;
  }

  public function updateGraphName($graph_id, $name){
    $query = "SELECT graph FROM `graph` WHERE id=".$graph_id;
    $row = $this->db->execute($query)[0];
    $settings = json_decode($row['graph'], true);
    $settings['name'] = $name;
    $update_query = "UPDATE graph SET graph = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE id = ".$graph_id;
    $this->db->execute($update_query);
  }

  public function setGraphAttributes($graphId, $attributes){
    $query = "SELECT graph FROM `graph` WHERE id=".$graphId;
    $row = $this->db->execute($query)[0];
    $settings = json_decode($row['graph'], true);
    $settings['attributes'] = array_merge($settings['attributes'], $attributes);
    $update_query = "UPDATE graph SET graph = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE id = ".$graphId;
    $this->db->execute($update_query);
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
    if(!in_array($position, array('leftGraphView', 'rightGraphView'))) return false;

    $query = "SELECT graph_id, settings FROM graph_settings WHERE graph_id IN (".implode(',',$user_graph_ids).")";
    $rows = $this->db->execute($query);
    foreach($rows as $row){
      $settings = json_decode($row['settings'], true);
      if($settings['position'] == $position){
        $settings['position'] = 'not to be shown';
        $update_query = "UPDATE graph_settings SET settings = '".$this->db->escape(json_encode($settings, JSON_UNESCAPED_UNICODE))."' WHERE graph_id = '".$row['graph_id']."'";
        $this->db->execute($update_query);
      }
      if($row['graph_id'] == $graphId){
        $settings['position'] = $position;
        $update_query = "UPDATE graph_settings SET settings = '".$this->db->escape(json_encode($settings, JSON_UNESCAPED_UNICODE))."' WHERE graph_id = '".$row['graph_id']."'";
        $this->db->execute($update_query);
      }
    }
    return true;
  }

  public function updateGraphElementContent($graph_id, $local_content_id, $r){


    if($r['type'] == 'updateNodeText'){
      $query = "UPDATE node_content SET text = '".$this->db->escape($r['text'])."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$r['node_alternative_id']."'";
      $this->db->execute($query);
    }else if($r['type'] == 'node_list_add_request'){
      return $this->addNodeContentList($r);
    }else if($r['type'] == 'node_list_remove_request'){
      return $this->removeNodeContentList($r);
    }else if($r['type'] == 'node_list_update_request'){
      return $this->updateNodeContentList($r);
    }else if($r['type'] == 'addAlternative'){
      // get type and importance of node
      $query = "SELECT type, importance FROM node_content WHERE `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."'";
      $rows = $this->db->execute($query);
      $type = $rows[0]['type'];
      $importance = $rows[0]['importance'];
      $alternative = $r['alternative'];
      $this->logger->log('$r='.var_export($r, true));
      $query = "INSERT INTO node_content SET `graph_id` = '".$this->db->escape($graph_id)
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
      $this->db->execute($query);

      // update all alternatives to have the same active_alternative_id
      $query = "UPDATE node_content SET active_alternative_id = '".$this->db->escape($r['new_alternative_id'])."' WHERE `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."'";
      $this->logger->log($query);
      $this->db->execute($query);

    }else if($r['type'] == 'removeAlternative'){
      $query = "DELETE FROM node_content WHERE alternative_id = '".$this->db->escape($r['node_alternative_id'])."' AND `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."'";
      $this->logger->log($query);
      $this->db->execute($query);

      $query = "SELECT alternative_id FROM node_content WHERE `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."' ORDER BY alternative_id ASC";
      $rows = $this->db->execute($query);


      $query = "UPDATE node_content SET active_alternative_id = '".$rows[0]['alternative_id']."' WHERE `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."'";
      $this->logger->log($query);
      $this->db->execute($query);

    }else if($r['type'] == 'updateNodesReliabilities'){
      foreach($r['data'] as $node_content_id => $node){
        $local_content_id = $this->contentIdConverter->getLocalContentId($node_content_id);
        foreach($node as $alternative_id => $reliability){
          $value = $this->db->escape($reliability);
          $query = "UPDATE node_content SET reliability = '".$value."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$alternative_id."'";
          $this->logger->log($query);
          $this->db->execute($query);
        }
      }

    }else if($r['type'] == 'updateNodeAlternativesP'){
      foreach($r['alternatives'] as $alternative_id => $p){
        $value = $this->db->escape(json_encode($p));
        $query = "UPDATE node_content SET p = '".$value."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$alternative_id."'";
        $this->db->execute($query);
      }

    }else if($r['type'] == 'updateNodeAttribute'){
      if(in_array($r['nodeAttribute']['name'], $this->node_attribute_names)) $query = "UPDATE node_content SET `".$r['nodeAttribute']['name']."` = '".$this->db->escape($r['nodeAttribute']['value'])."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
      if(in_array($r['nodeAttribute']['name'], $this->node_alternative_attribute_names)){
        if($r['nodeAttribute']['name'] == 'p') $value = $this->db->escape(json_encode($r['nodeAttribute']['value']));
        else $value = $this->db->escape($r['nodeAttribute']['value']);
        $query = "UPDATE node_content SET `".$r['nodeAttribute']['name']."` = '".$value."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$r['node_alternative_id']."'";
      }
      $this->db->execute($query);
      // if user changed type of node, drop nodes conditional probabilities
      if($r['nodeAttribute']['name'] == 'type'){
        $query = "UPDATE node_content SET `p` = '[]' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
        $this->db->execute($query);
      }

    }else if($r['type'] == 'updateEdgeAttribute'){
      $query = "UPDATE edge_content SET `".$r['edgeAttribute']['name']."` = '".$this->db->escape($r['edgeAttribute']['value'])."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
      $this->db->execute($query);

    }else if($r['type'] == 'addEdge'){
      $this->db->startTransaction();
      try{
        $query = "SELECT MAX(local_content_id) as max_id FROM edge_content WHERE `graph_id` = '".$this->db->escape($graph_id)."'";
        $rows = $this->db->execute($query);
        $local_content_id = (int)$rows[0]['max_id'] + 1;
        $query = "INSERT INTO edge_content SET `graph_id` = '".$this->db->escape($graph_id)."', `local_content_id` = '".$this->db->escape($local_content_id)."', `type` = '".$this->db->escape($r['edge']['type'])."', `label` = '".$this->db->escape($r['edge']['label'])."', created_at = NOW()";
        $this->db->execute($query);
      }catch (Exception $e) {
        $this->db->rollbackTransaction();
        $this->logger->log("Error during transaction: ".mysql_error().". Transaction rollbacked.");
      }
      $this->db->commitTransaction();
      return json_encode(array('edgeContentId'=>$this->contentIdConverter->createGlobalContentId($graph_id,$local_content_id)));

    }else if($r['type'] == 'addNode'){
      $this->db->startTransaction();
      try{
        $query = "SELECT MAX(local_content_id) as max_id FROM node_content WHERE `graph_id` = '".$this->db->escape($graph_id)."'";
        $rows = $this->db->execute($query);
        $local_content_id = $rows[0]['max_id'] + 1;
        foreach($r['node']['alternatives'] as $alternative_id => $alternative){

          // mysql_real_escape(0) gives '' so check this numeric fields here
          if(!is_numeric($alternative_id)) $this->logger->log('Error: alternative_id '.var_export($alternative_id, true).' is not numeric');
          if(!is_numeric($local_content_id)) $this->logger->log('Error: local_content_id '.var_export($local_content_id, true).' is not numeric');
          if(!is_numeric($r['node']['active_alternative_id'])) $this->logger->log('Error: active_alternative_id '.var_export($r['node']['active_alternative_id'], true).' is not numeric');

          $query = "INSERT INTO node_content SET `graph_id` = '".$this->db->escape($graph_id)
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

          $this->db->execute($query);
        }
      }catch (Exception $e) {
        $this->db->rollbackTransaction();
        $this->logger->log("Error during transaction: ".mysql_error().". Transaction rollbacked.");
      }
      $this->db->commitTransaction();
      return json_encode(array('nodeContentId'=>$this->contentIdConverter->createGlobalContentId($graph_id, $local_content_id)));

    }else if($r['type'] == 'addIcon'){
      // mark in db that now it has icon
      $query = "UPDATE node_content SET has_icon = 1 WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
      $this->db->execute($query);

    }
    return true;
  }

  public function addSource($auth_id, $item){
    $q = "INSERT INTO source SET "
        ."source_type='".$item['source_type']
        ."', `auth_id`='".$auth_id
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
    return $this->db->execute($q);
  }

  private function addNodeContentList($r){
    if($r['nodeType'] == $this->node_basic_types['fact']){
      // if it is a new source - add it to the main list
      if(empty($r['item']['source_id'])){
        // TODO: even though client thinks there is no correspondent source, it may be in fact - we need to check it here somehow
        $r['item']['source_id'] = $this->addSource($this->auth_id, $r['item']);
      }

      $graph_id = $r['graphId'];
      $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
      $q = "INSERT INTO node_content_source SET graph_id='".$graph_id
          ."', `auth_id`='".$this->auth_id
          ."', local_content_id='".$local_content_id
          ."', alternative_id='".$r['node_alternative_id']
          ."', comment='".$this->db->escape($r['item']['comment'])
          ."', source_id='".$this->db->escape($r['item']['source_id'])
          ."', `pages`='".$this->db->escape($r['item']['pages'])."' ";

      $this->logger->log($q);
      $item_id = $this->db->execute($q);
      // calculate fact reliability
      $reliability = $this->getFactReliability($graph_id,$local_content_id);
      return json_encode(array('result'=>'SUCCESS','id'=>$item_id,'reliability'=>$reliability));

    }elseif($r['nodeType'] == $this->node_basic_types['proposition']){
      $graph_id = $r['graphId'];
      $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
      $q = "INSERT INTO node_content_falsification SET graph_id='".$graph_id
          ."', local_content_id='".$local_content_id
          ."', alternative_id='".$r['node_alternative_id']
          ."', `name`='".$this->db->escape($r['item']['name'])
          ."', comment='".$this->db->escape($r['item']['comment'])."' ";

      $this->logger->log($q);
      $item_id = $this->db->execute($q);
      return json_encode(array('result'=>'SUCCESS','id'=>$item_id));
    }
  }

  private function updateNodeContentList($r){
    $graph_id = $r['graphId'];
    $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
    if($r['nodeType'] == $this->node_basic_types['fact']) {
      // Client sets $r['item']['source_id'] as empty if user modified fields of source
      // We treat it here as signal for new source creation
      if(empty($r['item']['source_id'])){
        $source_id = $this->addSource($this->getAuthId(), $r['item']);
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
      $this->db->execute($q);
      // calculate fact reliability
      $reliability = $this->getFactReliability($graph_id, $local_content_id);

      return json_encode(array('result' => 'SUCCESS', 'reliability' => $reliability));

    }elseif($r['nodeType'] == $this->node_basic_types['proposition']){
      $q = "UPDATE node_content_falsification SET "
          ."`name` = '" . $this->db->escape($r['item']['name'])
          . "', comment = '" . $this->db->escape($r['item']['comment'])
          . "' WHERE id = '" . $this->db->escape($r['item']['id']) . "'";
      $this->logger->log($q);
      $this->db->execute($q);

     return json_encode(array('result' => 'SUCCESS'));
    }
  }

  private function removeNodeContentList($r){
    $graph_id = $r['graphId'];
    $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
    if($r['nodeType'] == $this->node_basic_types['fact']) {
      $q = "DELETE FROM node_content_source WHERE graph_id='".$graph_id
          ."' AND local_content_id='".$local_content_id
          ."' AND alternative_id='".$r['node_alternative_id']
          ."' AND id='".$this->db->escape($r['itemId'])."'";
      $this->logger->log($q);
      $this->db->execute($q);
      // calculate fact reliability
      $reliability = $this->getFactReliability($graph_id,$local_content_id);
      return json_encode(array('result'=>'SUCCESS','reliability'=>$reliability));
    }else{
      $q = "DELETE FROM node_content_falsification WHERE graph_id='".$graph_id
          ."' AND local_content_id='".$local_content_id
          ."' AND alternative_id='".$r['node_alternative_id']
          ."' AND id='".$this->db->escape($r['itemId'])."'";
      $this->logger->log($q);
      $this->db->execute($q);
      return json_encode(array('result'=>'SUCCESS'));
    }
  }

  public function getFactReliability($graph_id,$local_content_id){
    $q = "SELECT source_id FROM node_content_source WHERE graph_id='".$graph_id."' AND local_content_id='".$local_content_id."'";
    $this->logger->log($q);
    $rows = $this->db->execute($q);

    $reliability_array = array();
    foreach($rows as $row){
      $q = "SELECT publisher_reliability FROM source WHERE id='".$row['source_id']."'";
      $this->logger->log($q);
      $rs = $this->db->execute($q);
      $reliability_array[] = $rs[0]['publisher_reliability'];
    }

    return min(array_sum($reliability_array)*10,100);
  }

  public function removeGraph($graph_id, $auth_id=null){
    $tables = array('graph_history','graph_settings','node_content','edge_content','node_content_source','node_content_falsification');
    $result = array();

    // check permission
    if($auth_id !== null){
      $q = "SELECT auth_id FROM graph WHERE id = '".$graph_id."'";
      if($this->db->execute($q)[0]['auth_id'] != $auth_id){
        foreach($tables as $table) $result[$table] = 'no permission';
        return $result;
      }
    }

    $q = "DELETE FROM graph WHERE id = '".$graph_id."'".($auth_id !== null ? " AND auth_id = '".$auth_id."'" : "");
    $r = $this->db->execute($q);
    if($r == true) $result['graph'] = 'success';
    else $result['graph'] = print_r($r, true);

    foreach($tables as $table){
      $q = "DELETE FROM ".$table." WHERE graph_id = '".$graph_id."'";
      $r = $this->db->execute($q);
      if($r == true) $result[$table] = 'success';
      else $result[$table] = print_r($r, true);
    }
    return $result;
  }

  public function createNewGraph($auth_id, $name){
    $graph = '{"name":"'.$name.'","isEditable":true, "attributes":{"isInTrash":false}, "edgeTypes":["link","causal","conditional"],"nodeTypes":["fact","proposition","illustration","question", "to_read", "best_known_practice"],"nodeDefaultType":"text","edgeDefaultType":"causal"}';
    $q = "INSERT INTO graph SET graph = '".$graph."', auth_id = '".$auth_id."', created_at = NOW()";
    $graph_id = $this->db->execute($q);

    $elements = '{"nodes":{},"edges":{}}';
    $q = "INSERT INTO graph_history SET graph_id = '".$graph_id."', step = '1', timestamp = unix_timestamp(NOW()), elements = '".$elements."'";
    $this->db->execute($q);

    $default_skin = '{"node":{"constr":{"withoutIcon":"GraphViewNode","withIcon":"GraphViewNodeImage"},"attr":{"typeColors":{"fact":"#00BFFF","proposition":"#3CB371","illustration":"#FF69B4","question":"#FFFFE0","to_read":"#FFFF00","best_known_practice":"#FFA500"},"stickers":{"bayes_error":"<svg xmlns=\'http://www.w3.org/2000/svg\'  width=\'25\' height=\'25\'><g id=\'alert\' fill=\'yellow\'><rect id=\'point\' x=\'11\' y=\'16\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' width=\'2\' height=\'2\'/><polygon id=\'stroke\' style=\'fill-rule:evenodd;clip-rule:evenodd;\' points=\'13.516,10 10.516,10 11,15 13,15\'/><g id=\'triangle\'><path d=\'M12.017,5.974L19.536,19H4.496L12.017,5.974 M12.017,3.5c-0.544,0-1.088,0.357-1.5,1.071L2.532,18.402C1.707,19.831,2.382,21,4.032,21H20c1.65,0,2.325-1.169,1.5-2.599L13.517,4.572C13.104,3.857,12.561,3.5,12.017,3.5L12.017,3.5z\'/></g></g></svg>"}}},"edge":{"constr":"GraphViewEdge","attr":{"typeColors":{"link":"#00BFFF","causal":"#87CEFA","conditional":"#3CB371"},"typeDirection":{"link":"bi","causal":"uni","conditional":"uni"}}},"nodeLabel":{"constr":"GraphViewNodeLabel","attr":{"font":"Calibri","fill":"#BBBBBB","maxSize":24}}}';
    $settings = '{"skin":'.$default_skin.',"layout":"basicLayout","position":"leftGraphView"}';
    $q = "INSERT INTO graph_settings SET graph_id = '".$graph_id."', settings = '".$this->db->escape($settings)."'";
    $this->logger->log($q);
    $this->db->execute($q);

    return true;
  }

  /**
   * Copy graph with all history
   * @param $auth_id
   * @param $name
   * @param $graph_id
   */
  public function copyGraph($auth_id, $name, $graph_id){
    $q = "SELECT graph FROM graph WHERE id = '".$graph_id."'";
    $rows = $this->db->execute($q);
    $graph = json_decode($rows[0]['graph'], true);
    $graph['name'] = $name;
    $graph = json_encode($graph, JSON_UNESCAPED_UNICODE);
    $q = "INSERT INTO graph SET graph = '".$graph."', auth_id = '".$auth_id."'";
    $new_graph_id = $this->db->execute($q);

    $q = "SELECT * FROM graph_history WHERE graph_id = '".$graph_id."'";
    $rows = $this->db->execute($q);
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
      $this->db->execute($q);
    }

    $q = "INSERT INTO graph_settings (graph_id, settings) SELECT '".$new_graph_id."', settings FROM graph_settings WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);

    $q = "INSERT INTO node_content (graph_id, local_content_id, 	type,	label, reliability, importance, text, has_icon, updated_at, created_at) SELECT '".$new_graph_id."', local_content_id,	type,	label, reliability, importance, text, has_icon, NOW(), NOW() FROM node_content WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);

    $q = "INSERT INTO edge_content (graph_id, local_content_id, 	type,	label, updated_at, created_at) SELECT '".$new_graph_id."', local_content_id,	type,	label, NOW(), NOW() FROM edge_content WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);
  }

  /**
   * Clone graph from specific step. All text and attributes are copied - this preserve text on clone from modification by clonee and
   * simplify process of cloning from clones
   * @param $graph_id - original graph id
   * @param $graph_history_step - step in history of original graph
   * @param $auth_id - user which clones graph
   * @return boolean
   */
  public function cloneGraph($graph_id, $graph_history_step, $auth_id){
    // copy row in graph table
    $q = "SELECT graph FROM graph WHERE id = '".$graph_id."'";
    $this->logger->log($q);
    $rows = $this->db->execute($q);
    if(!count($rows)) return false;

    $q = "INSERT INTO graph SET graph = '".$rows[0]['graph']."', auth_id = '".$auth_id."', cloned_from_graph_id = '".$graph_id."', cloned_from_graph_history_step = '".$graph_history_step."'";
    $new_graph_id = $this->db->execute($q);

    // change local_content_id and local_content_id to create history of clone
    $q = "SELECT elements, node_mapping FROM graph_history WHERE graph_id = '".$graph_id."' AND step = '".$graph_history_step."'";
    $rows = $this->db->execute($q);
    $nodes = array();
    $edges = array();
    $local_content_ids = array();
    $elements = json_decode($rows[0]['elements'], true);

    foreach($elements['nodes'] as $k => $node){
      $local_content_id = $this->contentIdConverter->getLocalContentId($node['nodeContentId']);
      $node['nodeContentId'] = $this->contentIdConverter->createGlobalContentId($new_graph_id, $local_content_id);
      $local_content_ids[] = $local_content_id;
      $nodes[$k] = $node;
    }
    foreach($elements['edges'] as $k => $edge){
      $local_content_id = $this->contentIdConverter->getLocalContentId($edge['edgeContentId']);
      $edge['edgeContentId'] = $this->contentIdConverter->createGlobalContentId($new_graph_id, $local_content_id);
      $edges[$k] = $edge;
    }
    $elements = json_encode(array("nodes"=>$nodes, "edges"=>$edges), JSON_FORCE_OBJECT);
    $q = "INSERT INTO graph_history SET graph_id = '".$new_graph_id."', step = '1', timestamp = '".time()."', elements = '".$elements."', node_mapping = '".$rows[0]['node_mapping']."'";
    $this->logger->log($q);
    $this->db->execute($q);

    // Copy node_contents
    $node_alternative_attr_names_without_time = $this->node_alternative_attribute_names;
    unset($node_alternative_attr_names_without_time[array_search('created_at', $this->node_alternative_attribute_names)]);
    unset($node_alternative_attr_names_without_time[array_search('updated_at', $this->node_alternative_attribute_names)]);
    $q = "INSERT INTO node_content (graph_id, local_content_id, alternative_id, ".implode(',', $this->node_attribute_names).", ".implode(',', $node_alternative_attr_names_without_time).",	text, cloned_from_graph_id, cloned_from_local_content_id, updated_at, created_at) SELECT '".$new_graph_id."', local_content_id, alternative_id,	".implode(',', $this->node_attribute_names).", ".implode(',', $node_alternative_attr_names_without_time).", text, '".$graph_id."', local_content_id, NOW(), NOW() FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $this->logger->log($q);
    $this->db->execute($q);

    // Copy node_content_sources
    $q = "INSERT INTO node_content_source (graph_id, local_content_id, alternative_id, pages,	comment,	source_id, created_at, updated_at) SELECT '".$new_graph_id."', local_content_id,	alternative_id, pages,comment,source_id, NOW(), NOW() FROM node_content_source WHERE graph_id = '".$graph_id."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $this->logger->log($q);
    $this->db->execute($q);

    // Copy node_content_falsification
    $q = "INSERT INTO node_content_falsification (graph_id, local_content_id, alternative_id, `name`, comment,	created_at, updated_at) SELECT '".$new_graph_id."', local_content_id,	alternative_id, `name`, comment, NOW(), NOW() FROM node_content_falsification WHERE graph_id = '".$graph_id."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $this->logger->log($q);
    $this->db->execute($q);

    // just copy edges as is
    $q = "INSERT INTO edge_content (graph_id, local_content_id,	".implode(',', $this->edge_attribute_names).", updated_at, created_at) SELECT '".$new_graph_id."', local_content_id, ".implode(',', $this->edge_attribute_names).", NOW(), NOW() FROM edge_content WHERE graph_id = '".$graph_id."'";
    $this->logger->log($q);
    $this->db->execute($q);

    $q = "INSERT INTO graph_settings (graph_id, settings) SELECT '".$new_graph_id."', settings FROM graph_settings WHERE graph_id = '".$graph_id."'";
    $this->logger->log($q);
    $this->db->execute($q);
  }
}