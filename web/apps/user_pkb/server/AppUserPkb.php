<?php

include("TextDiff.php");
include("GRainQuerier.php");
include("GraphDiffCreator.php");
include("ContentIdConverter.php");

class AppUserPkb extends App
{
  const HISTORY_CHUNK = 3; // number of graph in history chunk
  private $node_basic_types;
  private $node_attribute_names;
  private $node_alternative_attribute_names;
  private $edge_attribute_names;
  private $contentIdConverter;

  public function showView(){
    parent::showView();
    $vars = $this->getRoute();
    // choose the mode of access level
    if($vars[0] === 'showGraph'){
      $access_level = 'read';
      $showGraphId = $vars[1];
      $action = $vars[2];

    // create new user: my.grasp.how/createNewUser/<login>/<password>/<admin secret>
    }elseif($vars[0] === 'signupSuccess'){
      // send email to me signalling that someone want to signup
      $this->sendMail("info@grasp.how", "igbatov@gmail.com", "someone want to signup", print_r($_REQUEST, true));

      // show signup success page
      include($this->getAppDir("template", false)."/signupSuccess.php");
      exit();

    }elseif($vars[0] === 'createNewUser'){
      if($vars[3] != $this->getAdminSecret()) exit('wrong secret!');
      $this->createNewUser($vars[1], $vars[2]);
      exit();

    }elseif($vars[0] === 'updateUserPassword'){
      if($vars[3] != $this->getAdminSecret()) exit('wrong secret!');
      $this->updateUserPassword($vars[1], $vars[2]);
      exit();

    }elseif($vars[0] === 'removeGraph'){
      if($vars[2] != $this->getAdminSecret()) exit('wrong secret!');
      var_dump($this->removeGraph($vars[1]));
      exit();

    }else{
      $access_level = 'read&write';
      $showGraphId = null;
      $action = $vars[0];
    }

    // if we are not authorized and want to go edit mode, just show login form
    if($access_level == 'read&write' && !$this->session->checkAuth()){
      header('HTTP/1.1 401 Unauthorized');
      $login_form_vars = $this->session->getLoginFormVars();
      $signup_form_vars = array(
        "method"=>"post",
        "action"=>"signupSuccess",
        "fields"=>array(
          "email"=>array("type"=>"text"),
          "profile url"=>array("type"=>"text"),
          /*
          "password"=>array("type"=>"password"),
          "password again"=>array("type"=>"password")
          */
        )
      );
      include($this->getAppDir("template", false)."/login.php");
      exit();
    }

    // check that user browsing from supported device/browser
    $mobile_checker = new Mobile_Detect();
    $deviceType = ($mobile_checker->isMobile() ? ($mobile_checker->isTablet() ? 'tablet' : 'phone') : 'computer');
    $browser_checker = new \Sinergi\BrowserDetector\Browser();
    $os_checker = new \Sinergi\BrowserDetector\Os();
    if(
      !in_array($browser_checker->getName(), array(Sinergi\BrowserDetector\Browser::CHROME, Sinergi\BrowserDetector\Browser::OPERA))
      || $deviceType != 'computer'
      || $os_checker->getName() != \Sinergi\BrowserDetector\Os::WINDOWS
    ){
     // include($this->getAppDir("template", false)."/browserUnsupported.php");
     // exit();
    }

    // define node and edge attributes (must be the same as db table column names)
    $this->node_basic_types = array('fact'=>'fact','proposition'=>'proposition');
    $this->node_attribute_names = array('type', 'importance', 'has_icon', 'active_alternative_id', 'stickers');
    $this->node_alternative_attribute_names = array('label', 'reliability','p','created_at','updated_at');
    $this->edge_attribute_names = array('type', 'label');
    $this->contentIdConverter = new ContentIdConverter();

    $this->log('var_export($this->getRoute(),true) '.var_export($this->getRoute(),true));
    $this->log('var_export($this->getRequest(),true) '.var_export($this->getRequest(),true));
    if(isset($this->getRequest()['graphId'])) $this->log("var_export(GraphDiffCreator::isDiffGraphId(this->getRequest()['graphId']) ".var_export(GraphDiffCreator::isDiffGraphId($this->getRequest()['graphId']),true));
    if(isset($this->getRequest()['graphId']) && GraphDiffCreator::isDiffGraphId($this->getRequest()['graphId'])) $access_level = 'read';

    $this->writeActions = array(
        'updateGraphName',
        'setGraphAttributes',
        'changeGraphPosition',
        'addGraphHistoryItem',
        'updateNodeMapping',
        'updateGraphElementContent',
        'createNewGraph',
        'copyGraph',
        'cloneGraph',
        'removeGraph',
        'addNodeContentList',
        'updateNodeContentList',
        'removeNodeContentList'
    );
    if(in_array($action, $this->writeActions) && $access_level == 'read') exit();

    // else process action defined by url
    switch($action){

      /* READ METHODS */
      case 'query_grain':
        // create text of R script for gRain
        $graph_id = $this->getRequest()['graphId'];

        // Note: GRain can han handle graph that in fact consists from several splittered subgraphs
        $graph = $this->getBayesGraph($graph_id);
        $probabilities = $this->getBayesProbabilities($graph_id, $graph);
        // check for errors
        $imperfect_nodes = $this->getImperfectNodes($graph_id, $graph, $probabilities);

        // if we have a non-empty class error, output all errors to client
        foreach($imperfect_nodes as $class) if(count($class) != 0){
          $this->log('query_grain: imperfect_nodes is not empty '
              .'$graph = '.print_r($graph, true)
              .'$probabilities = '.print_r($probabilities, true)
              .'$imperfect_nodes = '.print_r($imperfect_nodes, true
              ));
          $this->showRawData(json_encode(array('graphId'=>$graph_id, 'result'=>'error', 'data'=>$imperfect_nodes)));
          return false;
        }

        $grain_querier = new GRainQuerier($this->config->getRscriptPath(), $this->config->getDefaultPath('tmp'));
        $probabilities = $grain_querier->queryGrain($graph, $probabilities);
        // reformat local_node_ids to global ids
        $converter = new ContentIdConverter();
        $data = array();
        foreach($probabilities as $local_node_id => $probability){
          $data[$converter->createGlobalContentId($graph_id, $local_node_id)] = $probability;
        }
        $this->showRawData(json_encode(array('graphId'=>$graph_id, 'result'=>'success', 'data'=>$data)));
        break;

      case 'getGraphsModelSettings':
        if($access_level == 'read'){
          $graphs_settings = $this->getGraphs(array($showGraphId));
          $graphs_settings[$showGraphId]['isEditable'] = false;
        }else{
          if(isset($this->getRequest()['graphIds'])){
            $graph_ids= $this->getRequest()['graphIds'];
          }else{
            $graph_ids = $this->getGraphIds($this->getAuthId());
          }
          $graphs_settings = $this->getGraphs($graph_ids);
        }
        $this->showRawData(json_encode($graphs_settings));
        break;

      case 'getGraphNodeContent':
        $content_ids = $this->getRequest()['nodeContentIds'];
        $nodes = $this->getNodeAttributes($content_ids);

        // add text
        foreach($nodes as $content_id=>$node){
          $graph_id = $this->decodeContentId($content_id)['graph_id'];
          $local_content_id = $this->decodeContentId($content_id)['local_content_id'];

          $node_rows = $this->db->execute("SELECT * FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'");

          // alternatives
          foreach($node_rows as $node_row){
            // alternative text
            if(GraphDiffCreator::isDiffContentId($content_id)){
              $contentId = GraphDiffCreator::decodeContentId($content_id);
              $nodes[$content_id]['alternatives'][$node_row['alternative_id']]['text'] = GraphDiffCreator::getDiffText(
                  $this->db,
                  $contentId['graphId1'],
                  $contentId['localContentId1'],
                  $node_row['alternative_id'],
                  $contentId['graphId2'],
                  $contentId['localContentId2'],
                  $node_row['alternative_id']
              );
            }else{
              $nodes[$content_id]['alternatives'][$node_row['alternative_id']]['text'] = $node_row['text'];
            }

            // get alternative lists
            $q = "SELECT * FROM ".($node['type'] == $this->node_basic_types['fact'] ? 'node_content_source' : 'node_content_falsification').
                " WHERE graph_id='".$graph_id."' AND local_content_id='".$local_content_id."' AND alternative_id='".$node_row['alternative_id']."'";
            $this->log($q);
            $rows = $this->db->execute($q);
            $list_items = array();
            foreach($rows as $row){
              $list_items[$row['id']] = $row;
            }
            $nodes[$content_id]['alternatives'][$node_row['alternative_id']]['list'] = $list_items;
          }
        }
        $this->log('getGraphNodeContent', $nodes);
        $this->showRawData(json_encode($nodes));
        break;

      case 'getIcon':
        $r = $this->getRequest();
        // get auth_id of this content_id
        $graph_id = $this->contentIdConverter->getGraphId($r);
        $node_rows = $this->db->execute("SELECT auth_id FROM graph WHERE id = '".$graph_id."'");
        $auth_id = $node_rows[0]['auth_id'];
        $img_path = $this->getAppDir('uploads', false)."/".$auth_id."/".$r.".png";
        if(file_exists($img_path)) $this->showImage($img_path);
        else $this->showImage($this->getAppDir('img', false)."/default_icon.png");
        break;

      case 'getGraphElementsAttributes':
        $r = $this->getRequest();
        $nodes = $this->getNodeAttributes($r['nodes']);
        $edges = $this->getEdgeAttributes($r['edges']);
        $graphs_elements = array('nodes'=>$nodes, 'edges'=>$edges);
        $this->showRawData(json_encode($graphs_elements));
        break;

      case 'getGraphsHistoryTimeline':
        $r = $this->getRequest();
        $timeline = array();

        foreach($r['ids'] as $graph_id){
          if(GraphDiffCreator::isDiffGraphId($graph_id)){
            $timeline[$graph_id][0] = time();
          }else{
            $timeline[$graph_id] = array();
            $query = "SELECT step, timestamp FROM graph_history WHERE graph_id = '".$graph_id."'";
            foreach($this->db->execute($query) as $row){
              $timeline[$graph_id][$row['step']] = (int)$row['timestamp'];
            }
          }
        }
        $this->showRawData(json_encode($timeline));
        break;

      case 'getGraphsHistoryChunk':
        $chunk = $this->getGraphsHistoryChunk($this->getRequest());
        $this->showRawData(json_encode($chunk));
        break;

      case "getGraphSettings":
        $graph_ids = $this->getRequest();
        $s = $this->getGraphSettings($graph_ids);
        $this->showRawData(json_encode($s));
        break;

      /* MODIFY ACTIONS */
      case 'updateGraphName':
        $r = $this->getRequest();
        $query = "SELECT graph FROM `graph` WHERE id=".$r['graphId'];
        $row = $this->db->execute($query)[0];
        $settings = json_decode($row['graph'], true);
        $settings['name'] =$r['name'];
        $update_query = "UPDATE graph SET graph = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE id = ".$r['graphId'];
        $this->db->execute($update_query);
        $this->showRawData('success');
        break;

      case 'setGraphAttributes':
        $graphId = $this->getRequest()['graphId'];
        $attributes = array();
        foreach($this->getRequest() as $key => $value){
          if($key != 'graphId') $attributes[$key] = $value;
        }
        $query = "SELECT graph FROM `graph` WHERE id=".$graphId;
        $row = $this->db->execute($query)[0];
        $settings = json_decode($row['graph'], true);
        $settings['attributes'] = array_merge($settings['attributes'], $attributes);
        $update_query = "UPDATE graph SET graph = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE id = ".$graphId;
        $this->db->execute($update_query);
        $this->showRawData('success');
        break;

      case 'changeGraphPosition':
        $graphId = $this->getRequest()['graphId'];
        $position = $this->getRequest()['position'];
        $user_graph_ids = $this->getGraphIds($this->getAuthId());
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
        $this->showRawData('success');
        break;

      case 'addGraphHistoryItem':
        $r = $this->getRequest();
        $query = 'INSERT INTO graph_history SET graph_id = "'.$r['graphId'].'", step = "'.$r['step'].'", timestamp = "'.$r['timestamp'].'", elements = "'.$this->db->escape(json_encode($r['elements'], JSON_FORCE_OBJECT)).'", node_mapping = "'.$this->db->escape(json_encode($r['node_mapping'])).'"';
        if($this->db->execute($query)){
          $this->showRawData('success');
        }else{
          $this->showRawData('error');
        }
        break;

      case 'updateNodeMapping':
        $r = $this->getRequest();
        if(!isset($r['node_mapping'])) return 'no node_mapping';
        $query = 'UPDATE graph_history SET node_mapping = "'.$this->db->escape(json_encode($r['node_mapping'], JSON_FORCE_OBJECT)).'" WHERE graph_id = "'.$r['graphId'].'" AND step = "'.$r['step'].'"';
        if($this->db->execute($query)){
          $this->showRawData('success');
        }else{
          $this->showRawData('error');
        }
        break;

      case 'updateGraphElementContent':
        $r = $this->getRequest();

        if(in_array($r['type'], array(
        'updateNodeText',
        'node_list_add_request',
        'node_list_remove_request',
        'node_list_update_request',
        'updateNodeAlternativesP',
        'updateNodeAttribute',
        'addIcon',
        'addAlternative',
        'removeAlternative'
        ))){
          $graph_id = $this->contentIdConverter->getGraphId($r['nodeContentId']);
          $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
        }else if($r['type'] == 'updateEdgeAttribute'){
          $graph_id = $this->contentIdConverter->getGraphId($r['edgeContentId']);
          $local_content_id = $this->contentIdConverter->getLocalContentId($r['edgeContentId']);
        }else if($r['type'] == 'addEdge' || $r['type'] == 'addNode' || $r['type'] == 'updateNodesReliabilities' || $r['type'] == 'node_stickers_add_request' || $r['type'] == 'node_stickers_remove_request'){
          $graph_id = $r['graphId'];
        }

        if(!$this->isUserOwnGraph($graph_id)) return false;

        if($r['type'] == 'updateNodeText'){
          $query = "UPDATE node_content SET text = '".$this->db->escape($r['text'])."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$r['node_alternative_id']."'";
          $this->db->execute($query);
        }else if($r['type'] == 'node_list_add_request'){
          $this->addNodeContentList($r);
        }else if($r['type'] == 'node_list_remove_request'){
          $this->removeNodeContentList($r);
        }else if($r['type'] == 'node_list_update_request'){
          $this->updateNodeContentList($r);
        }else if($r['type'] == 'addAlternative'){
          // get type and importance of node
          $query = "SELECT type, importance FROM node_content WHERE `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."'";
          $rows = $this->db->execute($query);
          $type = $rows[0]['type'];
          $importance = $rows[0]['importance'];
          $alternative = $r['alternative'];
          $this->log('$r='.var_export($r, true));
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
          $this->log($query);
          $this->db->execute($query);

          // update all alternatives to have the same active_alternative_id
          $query = "UPDATE node_content SET active_alternative_id = '".$this->db->escape($r['new_alternative_id'])."' WHERE `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."'";
          $this->log($query);
          $this->db->execute($query);

        }else if($r['type'] == 'removeAlternative'){
          $query = "DELETE FROM node_content WHERE alternative_id = '".$this->db->escape($r['node_alternative_id'])."' AND `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."'";
          $this->log($query);
          $this->db->execute($query);

          $query = "SELECT alternative_id FROM node_content WHERE `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."' ORDER BY alternative_id ASC";
          $rows = $this->db->execute($query);


          $query = "UPDATE node_content SET active_alternative_id = '".$rows[0]['alternative_id']."' WHERE `graph_id` = '".$graph_id."' AND  local_content_id = '".$local_content_id."'";
          $this->log($query);
          $this->db->execute($query);

        }else if($r['type'] == 'updateNodesReliabilities'){
          foreach($r['data'] as $node_content_id => $node){
            $local_content_id = $this->contentIdConverter->getLocalContentId($node_content_id);
            foreach($node as $alternative_id => $reliability){
              $value = $this->db->escape($reliability);
              $query = "UPDATE node_content SET reliability = '".$value."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."' AND alternative_id = '".$alternative_id."'";
              $this->log($query);
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
              $this->error("Error during transaction: ".mysql_error().". Transaction rollbacked.");
            }
          $this->db->commitTransaction();
          $this->showRawData(json_encode(array('edgeContentId'=>$this->contentIdConverter->createGlobalContentId($graph_id,$local_content_id))));

        }else if($r['type'] == 'addNode'){
          $this->db->startTransaction();
          try{
            $query = "SELECT MAX(local_content_id) as max_id FROM node_content WHERE `graph_id` = '".$this->db->escape($graph_id)."'";
            $rows = $this->db->execute($query);
            $local_content_id = $rows[0]['max_id'] + 1;
            foreach($r['node']['alternatives'] as $alternative_id => $alternative){
              $query = "INSERT INTO node_content SET `graph_id` = '".$this->db->escape($graph_id)
              ."', `local_content_id` = '".$this->db->escape($local_content_id)
              ."', `alternative_id` = '".$this->db->escape($alternative_id)  
              ."', `p` = '".$this->db->escape(json_encode($alternative['p'])) 
              ."', `active_alternative_id` = '".$this->db->escape($r['node']['active_alternative_id'])          
              ."', `type` = '".$this->db->escape($r['node']['type'])
              ."', `label` = '".$this->db->escape($alternative['label'])
              ."', `text` = '".$this->db->escape($alternative['text'])
              ."', `reliability` = ".(is_numeric($alternative['reliability']) ? $alternative['reliability'] : 0)
              .", `importance` = ".(is_numeric($r['node']['importance']) ? $r['node']['importance'] : 0).", created_at = NOW()";
              $this->db->execute($query);
            }
          }catch (Exception $e) {
            $this->db->rollbackTransaction();
            $this->error("Error during transaction: ".mysql_error().". Transaction rollbacked.");
          }
          $this->db->commitTransaction();
          $this->showRawData(json_encode(array('nodeContentId'=>$this->contentIdConverter->createGlobalContentId($graph_id, $local_content_id))));

        }else if($r['type'] == 'addIcon'){
          $content_id = $r['nodeContentId'];
          $tmp_path = $_FILES['files']['tmp_name'];
          $file_path = $this->getAppDir('uploads', false)."/".$this->getAuthId()."/".$content_id.".png";
          if(exif_imagetype($tmp_path) == IMAGETYPE_PNG){
            move_uploaded_file($tmp_path, $file_path);
          }else{
            imagepng(imagecreatefromstring(file_get_contents($tmp_path)), $file_path);
          }

          // mark in db that now it has icon
          $query = "UPDATE node_content SET has_icon = 1 WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
          $this->db->execute($query);

        }
        break;

      case 'createNewGraph':
        $r = $this->getRequest();
        $this->createNewGraph($this->getAuthId(), $r['name']);
        break;

      case 'copyGraph':
        $r = $this->getRequest();
        $this->copyGraph($this->getAuthId(), $r['name'], $r['graph_id']);
        break;

      case 'cloneGraph':
        $r = $this->getRequest();
        $this->cloneGraph($r['graph_id'], $r['history_step'], $this->getAuthId());
        break;

      case 'getGraphDiff':
        $r = $this->getRequest();
        $this->showRawData(json_encode($this->getGraphDiff($r['graphId'], $r['cloneId'])));
        break;

      case 'removeGraph':
       // $r = $this->getRequest();
       // var_dump($this->removeGraph($r['graph_id'], $this->getAuthId()));
        break;

      case 'getGraphsCloneList':
        $clone_list = array();
        $graph_ids = $this->getGraphIds($this->getAuthId());
        $q = "SELECT * FROM graph WHERE cloned_from_graph_id IN ('".implode("','", $graph_ids)."')";
        $rows = $this->db->execute($q);
        foreach($rows as $row){
          $graph = json_decode($row['graph'], true);
          if(!isset($clone_list[$row['cloned_from_graph_id']])) $clone_list[$row['cloned_from_graph_id']] = array();
          $q = "SELECT username FROM auth WHERE id = '".$row['auth_id']."'";
          $users = $this->db->execute($q);
          $clone_list[$row['cloned_from_graph_id']][$row['id']] = $users[0]['username'].":".$graph['name'];
        }
        $this->showRawData(json_encode($clone_list));
        break;

      case 'findPublishers':
        $r = $this->getRequest();
        $substring = '%'.preg_replace('!\s+!', '% ', $r['substring']).'%';
        $q = "SELECT id, source_title, snip_2014 FROM scopus_title_list WHERE source_title LIKE '".$substring."'";
        $this->log($q);
        $rows = $this->db->execute($q);
        $items = array();
        foreach($rows as $k=>$row){
          $items[] = array(
            'id'=>$row['id'],
            'title'=>$row['source_title'],
            'reliability'=>$row['snip_2014'] < 1 ? 3 : 6,
            'order'=>levenshtein($row['source_title'], $r['substring']),
          );
        }
        function sortByOrder($a, $b) {
          return $a['order'] - $b['order'];
        }
        usort($items, 'sortByOrder');

        // limit search by first 10 items
        foreach($items as $k=>$item){
          if($k>10) unset($items[$k]);
        }

        $this->showRawData(json_encode($items));
        break;

      case 'findSources':
        $r = $this->getRequest();
        if(strlen($r['substring']) == 0) break;
        $substring = '%'.preg_replace('!\s+!', '% ', $r['substring']).'%';
        $q = "SELECT * FROM source WHERE name LIKE '".$substring."'".(isset($r['source_type']) && strlen($r['source_type']) ? " AND source_type = '".$r['source_type']."'" : '');
        $this->log($q);
        $rows = $this->db->execute($q);
        $items = array();
        if(count($rows) > 30) $this->showRawData(json_encode(false));
        foreach($rows as $k=>$row){
          $row['order'] = levenshtein($row['name'], $r['substring']);
          $row['title'] = $row['name'];
          $items[] = $row;
        }
        function sortByOrder($a, $b) {
          return $a['order'] - $b['order'];
        }
        usort($items, 'sortByOrder');

        // limit search by first 10 items
        foreach($items as $k=>$item){
          if($k>10) unset($items[$k]);
        }

        $this->showRawData(json_encode($items));
        break;

      default:
        if($access_level == 'read'){
          include($this->getAppDir("template", false)."/showGraph.php");
        }else{
          include($this->getAppDir("template", false)."/index.php");
        }
        break;
    }
  }

  private function addNodeContentList($r){
    if($r['nodeType'] == $this->node_basic_types['fact']){
        // if it is a new source - add it to the main list
      if(empty($r['item']['source_id'])){
         // TODO: even though client thinks there is no correspondent source, it may be in fact - we need to check it here somehow

        $q = "INSERT INTO source SET "
        ."source_type='".$r['item']['source_type']
        ."', `name`='".$this->db->escape($r['item']['name'])
        ."', url='".$this->db->escape($r['item']['url'])
        ."', author='".$this->db->escape($r['item']['author'])
        ."', editor='".$this->db->escape($r['item']['editor'])
        ."', publisher='".$this->db->escape($r['item']['publisher'])
        ."', publisher_reliability=".doubleval($r['item']['publisher_reliability'])
        .",  scopus_title_list_id=".(strlen($r['item']['scopus_title_list_id']) ? (int)($r['item']['scopus_title_list_id']) : "NULL")
        .",  publish_date='".$this->db->escape($r['item']['publish_date'])
        ."', comment='".$this->db->escape($r['item']['comment'])
        ."', `pages`='".$this->db->escape($r['item']['pages'])."' ";
        $this->log($q);
        $r['item']['source_id'] = $this->db->execute($q);
      }

      $graph_id = $r['graphId'];
      $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
      $q = "INSERT INTO node_content_source SET graph_id='".$graph_id
          ."', local_content_id='".$local_content_id
          ."', alternative_id='".$r['node_alternative_id']
          ."', source_type='".$r['item']['source_type']
          ."', `name`='".$this->db->escape($r['item']['name'])
          ."', url='".$this->db->escape($r['item']['url'])
          ."', author='".$this->db->escape($r['item']['author'])
          ."', editor='".$this->db->escape($r['item']['editor'])
          ."', publisher='".$this->db->escape($r['item']['publisher'])
          ."', publisher_reliability=".doubleval($r['item']['publisher_reliability'])
          .",  scopus_title_list_id=".(strlen($r['item']['scopus_title_list_id']) ? (int)($r['item']['scopus_title_list_id']) : "NULL")
          .",  publish_date='".$this->db->escape($r['item']['publish_date'])
          ."', comment='".$this->db->escape($r['item']['comment'])
          ."', source_id='".$this->db->escape($r['item']['source_id'])
          ."', `pages`='".$this->db->escape($r['item']['pages'])."' ";

      $this->log($q);
      $item_id = $this->db->execute($q);
      // calculate fact reliability
      $reliability = $this->getFactReliability($graph_id,$local_content_id);
      $this->showRawData(json_encode(array('result'=>'SUCCESS','id'=>$item_id,'reliability'=>$reliability)));
    }elseif($r['nodeType'] == $this->node_basic_types['proposition']){
      $graph_id = $r['graphId'];
      $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
      $q = "INSERT INTO node_content_falsification SET graph_id='".$graph_id
          ."', local_content_id='".$local_content_id
          ."', alternative_id='".$r['node_alternative_id']
          ."', `name`='".$this->db->escape($r['item']['name'])
          ."', comment='".$this->db->escape($r['item']['comment'])."' ";

      $this->log($q);
      $item_id = $this->db->execute($q);
      $this->showRawData(json_encode(array('result'=>'SUCCESS','id'=>$item_id)));
    }
  }


  private function updateNodeContentList($r){
    $graph_id = $r['graphId'];
    $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
    if($r['nodeType'] == $this->node_basic_types['fact']) {
      $q = "UPDATE node_content_source SET "
          . "local_content_id='" . $local_content_id
          . "', alternative_id='".$r['node_alternative_id']
          . "', source_type='" . $r['item']['source_type']
          . "', `name`='" . $this->db->escape($r['item']['name'])
          . "', url='" . $this->db->escape($r['item']['url'])
          . "', author='" . $this->db->escape($r['item']['author'])
          . "', editor='" . $this->db->escape($r['item']['editor'])
          . "', publisher='" . $this->db->escape($r['item']['publisher'])
          . "', publisher_reliability='" . $this->db->escape($r['item']['publisher_reliability'])
          . "', scopus_title_list_id=" . (strlen($r['item']['scopus_title_list_id']) ? (int)($r['item']['scopus_title_list_id']) : "NULL")
          . ", publish_date='" . $this->db->escape($r['item']['publish_date'])
          . "', comment='" . $this->db->escape($r['item']['comment'])
          . "', `pages`='" . $this->db->escape($r['item']['pages'])
          . "' WHERE id = '" . $this->db->escape($r['item']['id']) . "'";
      $this->log($q);
      $this->db->execute($q);
      // calculate fact reliability
      $reliability = $this->getFactReliability($graph_id, $local_content_id);
      $this->showRawData(json_encode(array('result' => 'SUCCESS', 'reliability' => $reliability)));
    }elseif($r['nodeType'] == $this->node_basic_types['proposition']){
      $q = "UPDATE node_content_falsification SET "
          ."`name` = '" . $this->db->escape($r['item']['name'])
          . "', comment = '" . $this->db->escape($r['item']['comment'])
          . "' WHERE id = '" . $this->db->escape($r['item']['id']) . "'";
      $this->log($q);
      $this->db->execute($q);
      $this->showRawData(json_encode(array('result' => 'SUCCESS')));
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
      $this->log($q);
      $this->db->execute($q);
      // calculate fact reliability
      $reliability = $this->getFactReliability($graph_id,$local_content_id);
      $this->showRawData(json_encode(array('result'=>'SUCCESS','reliability'=>$reliability)));
    }else{
      $q = "DELETE FROM node_content_falsification WHERE graph_id='".$graph_id
          ."' AND local_content_id='".$local_content_id
          ."' AND alternative_id='".$r['node_alternative_id']
          ."' AND id='".$this->db->escape($r['itemId'])."'";
      $this->log($q);
      $this->db->execute($q);
      $this->showRawData(json_encode(array('result'=>'SUCCESS')));
    }
  }

  protected function getFactReliability($graph_id,$local_content_id){
    $q = "SELECT publisher_reliability FROM node_content_source WHERE graph_id='".$graph_id."' AND local_content_id='".$local_content_id."'";
    $this->log($q);
    $rows = $this->db->execute($q);
    $reliability_array = array();
    foreach($rows as $row){
      $reliability_array[] = $row['publisher_reliability'];
    }
    return min(array_sum($reliability_array)*10,100);
  }

  protected function getGraphSettings($graph_ids){
    $s = array();
    foreach($graph_ids as $graph_id){
      if(GraphDiffCreator::isDiffGraphId($graph_id)){
        $t = GraphDiffCreator::decodeDiffGraphId($graph_id);
        $s[$graph_id] = GraphDiffCreator::getGraphSettings($this->db, $t['graphId1'], $t['graphId2']);
      }else{
        $query = "SELECT graph_id, settings FROM graph_settings WHERE graph_id = '".$graph_id."'";
        $rows = $this->db->execute($query);
        if(count($rows) == 0) return false;
        $row = $rows[0];
        $s[$graph_id] = json_decode($row['settings'], true);
      }
    }

    return $s;
  }

  /**
   * Convert structure {
   *   node_attr1: v1,
   *   node_attr1: v2,
   *   ...
   *   active_alternative_id: 0
   *   alternatives: [
   *    0: {
   *     alternative_attr1: a0v1,
   *     alternative_attr2: a0v1,
   *     ...
   *    },
   *    1: {
   *     alternative_attr1: a1v1,
   *     alternative_attr2: a1v1,
   *     ...
   *   },
   *    ...
   *   ]
   * }
   * to{
   *   node_attr1: v1,
   *   node_attr1: v2,
   *   ...
   *   active_alternative_id
   *   alternative_attr1: a0v1,
   *   alternative_attr2: a0v1,
   *   ...
   * }
   * @param $attrs
   * @return array
   */
  protected function flattenNodeAttrs($attrs){
    $graph1NodeAttributes = array();
    foreach($attrs as $id => $content){
      $graph1NodeAttributes[$id] = array();
      foreach($this->node_attribute_names as $attribute_name){
        $graph1NodeAttributes[$id][$attribute_name] = $content[$attribute_name];
      }
      foreach($this->node_alternative_attribute_names as $attribute_name){
        $graph1NodeAttributes[$id][$attribute_name] = $content['alternatives'][$content['active_alternative_id']][$attribute_name];
      }
    }
    return $graph1NodeAttributes;
  }

  protected function getGraphDiff($graphId1, $graphId2){
    $q = "SELECT cloned_from_graph_history_step FROM graph WHERE id = '".$graphId2."'";
    $rows = $this->db->execute($q);
    $graph1 = $this->getGraphsHistoryChunk(array($graphId1=>$rows[0]['cloned_from_graph_history_step']))[0];
    $graph2 = $this->getGraphsHistoryChunk(array($graphId2=>null))[0];

    $graph_diff_creator = new GraphDiffCreator(
      $graph1,
      $graph2,
      $this->contentIdConverter
    );
    $graphModel = $graph_diff_creator->getDiffGraph();

    // get graph model settings
    $graphModelSettings = GraphDiffCreator::getGraphModelSettings($this->db, $graphId1, $graphId2);

    // == create graphViewSettings ==
    $diffGraphId = GraphDiffCreator::encodeDiffGraphId($graphId1, $graphId2);

    return array(
      'graphId' => $diffGraphId,
      'graphSettings' => $graphModelSettings,
      'elements' => $graphModel
    );
  }

  protected function adjustMappingToArea($mapping, $area){
    if(empty($area)) return $mapping;

    $adjustedMappingCoordinates = array();
    $mappingCoordinates = $mapping['mapping'];
    $mappingArea = $mapping['area'];
    $xStretchRatio = $area['width']/$mappingArea['width'];
    $yStretchRatio = $area['height']/$mappingArea['height'];

    foreach($mappingCoordinates as $i => $n){
      $adjustedMappingCoordinates[$i] = $n;
      $adjustedMappingCoordinates[$i]['x'] = round(($n['x'] - $mappingArea['centerX'])*$xStretchRatio) + $area['centerX'];
      $adjustedMappingCoordinates[$i]['y'] = round(($n['y'] - $mappingArea['centerY'])*$yStretchRatio) + $area['centerY'];
    }

    $adjustedMapping = array(
      'area'=>$area,
      'mapping'=>$adjustedMappingCoordinates
     );

    return $adjustedMapping;
  }

  protected function findNodeIdByNodeContentId($globalContentId, $nodes){
    foreach($nodes as $id => $node){
      if($node['nodeContentId'] == $globalContentId) return $id;
    }
    return null;
  }

  protected function getGraphEdgeAttributes($graphId){
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

  protected function getGraphNodeAttributes($graphId){
    $attributes = array();
    $q = "SELECT local_content_id FROM node_content WHERE graph_id = '".$graphId."'";
    $rows = $this->db->execute($q);
    $contentIds = array();
    foreach($rows as $row) $contentIds[] = $this->contentIdConverter->createGlobalContentId($graphId, $row['local_content_id']);

    $attrs = $this->getNodeAttributes($contentIds);
    foreach($attrs as $global_content_id => $attr){
      $attributes[$this->contentIdConverter->getLocalContentId($global_content_id)] = $attr;
    }
    return $attributes;
  }

  /**
   * Check if $content_id if from diff graph or just ordinary one.
   * In either case appropriately decode it on $graph_id and $local_content_id
   * @param $content_id
   * @return array
   */
  protected function decodeContentId($content_id){
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
      $graph_id = $this->contentIdConverter->getGraphId($content_id);
      $local_content_id = $this->contentIdConverter->getLocalContentId($content_id);
    }
    return array('graph_id'=>$graph_id, 'local_content_id'=>$local_content_id);
  }

  protected function getNodeAttributes($content_ids){
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
        $graph_id = $this->decodeContentId($content_id)['graph_id'];
        $local_content_id = $this->decodeContentId($content_id)['local_content_id'];

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
  protected function getEdgeAttributes($contentIds){
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
        $graph_id = $this->decodeContentId($content_id)['graph_id'];
        $local_content_id = $this->decodeContentId($content_id)['local_content_id'];
        $query = "SELECT '".$content_id."' as edgeContentId, type, label, created_at, updated_at FROM edge_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
        $edge_rows = $this->db->execute($query);
        $edge_row = $edge_rows[0];
        $edges[$content_id] = $edge_row;
      }
    }
    return $edges;
  }

  protected function createNewUser($login, $password){
    if(!parent::createNewUser($login, $password)) return false;

    $q = "SELECT id FROM auth WHERE username = '".$login."'";
    $rows = $this->db->execute($q);
    $new_user_id = $rows[0]['id'];

    // create directory for the user
    $new_user_dir = $this->getAppDir('uploads/'.$new_user_id);
    if(!file_exists($new_user_dir)) mkdir($new_user_dir, 0777, true);

    return $this->createNewGraph($new_user_id, 'newGraph');
  }

  private function createNewGraph($auth_id, $name){
    $graph = '{"name":"'.$name.'","isEditable":true, "attributes":{"isInTrash":false}, "edgeTypes":["link","in_favour_of","contrary_to"],"nodeTypes":["fact","proposition","illustration","question", "to_read", "best_known_practice"],"nodeDefaultType":"text","edgeDefaultType":"link"}';
    $q = "INSERT INTO graph SET graph = '".$graph."', auth_id = '".$auth_id."', created_at = NOW()";
    $graph_id = $this->db->execute($q);

    $elements = '{"nodes":{},"edges":{}}';
    $q = "INSERT INTO graph_history SET graph_id = '".$graph_id."', step = '1', timestamp = unix_timestamp(NOW()), elements = '".$elements."'";
    $this->db->execute($q);

    $default_skin = '{"node":{"constr":{"withoutIcon":"GraphViewNode","withIcon":"GraphViewNodeImage"},"attr":{"typeColors":{"fact":"#00BFFF","proposition":"#3CB371","illustration":"#FF69B4","question":"#FFFFE0","to_read":"#FFFF00","best_known_practice":"#FFA500"}}},"edge":{"constr":"GraphViewEdge","attr":{"typeColors":{"link":"#00BFFF","in_favour_of":"#87CEFA","contrary_to":"#3CB371"}}},"nodeLabel":{"constr":"GraphViewNodeLabel","attr":{"font":"Calibri","fill":"#BBBBBB","maxSize":24}}}';
    $settings = '{"skin":'.$default_skin.',"layout":"basicLayout","position":"not to be shown"}';
    $q = "INSERT INTO graph_settings SET graph_id = '".$graph_id."', settings = '".$settings."'";
    $this->db->execute($q);

    return true;
  }

  /**
   * Clone graph from specific step. All text and attributes are copied - this preserve text on clone from modification by clonee and
   * simplify process of cloning from clones
   * @param $graph_id - original graph id
   * @param $graph_history_step - step in history of original graph
   * @param $auth_id - user which clones graph
   * @return boolean
   */
  private function cloneGraph($graph_id, $graph_history_step, $auth_id){
    // copy row in graph table
    $q = "SELECT graph FROM graph WHERE id = '".$graph_id."'";
    $this->log($q);
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
    $this->log($q);
    $this->db->execute($q);

    // Copy node_contents
    $q = "INSERT INTO node_content (graph_id, local_content_id, alternative_id, ".implode(',', $this->node_attribute_names).", ".implode(',', $this->node_alternative_attribute_names).",	text, cloned_from_graph_id, cloned_from_local_content_id, updated_at, created_at) SELECT '".$new_graph_id."', local_content_id, alternative_id,	".implode(',', $this->node_attribute_names).", ".implode(',', $this->node_alternative_attribute_names).", text, '".$graph_id."', local_content_id, NOW(), NOW() FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $this->log($q);
    $this->db->execute($q);

    // Copy node_content_sources
    $q = "INSERT INTO node_content_source (graph_id, local_content_id, alternative_id, source_type, field_type, `name`, url, author,	editor,	publisher, publisher_reliability, scopus_title_list_id, publish_date,	pages,	comment,	source_id, created_at, updated_at) SELECT '".$new_graph_id."', local_content_id,	alternative_id, source_type, field_type, `name`, url, author,	editor,	publisher, publisher_reliability, scopus_title_list_id, publish_date,	pages,comment,source_id, NOW(), NOW() FROM node_content_source WHERE graph_id = '".$graph_id."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $this->log($q);
    $this->db->execute($q);

    // Copy node_content_falsification
    $q = "INSERT INTO node_content_falsification (graph_id, local_content_id, alternative_id, `name`, comment,	created_at, updated_at) SELECT '".$new_graph_id."', local_content_id,	alternative_id, `name`, comment, NOW(), NOW() FROM node_content_falsification WHERE graph_id = '".$graph_id."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $this->log($q);
    $this->db->execute($q);

    // just copy edges as is
    $q = "INSERT INTO edge_content (graph_id, local_content_id,	".implode(',', $this->edge_attribute_names).", updated_at, created_at) SELECT '".$new_graph_id."', local_content_id, ".implode(',', $this->edge_attribute_names).", NOW(), NOW() FROM edge_content WHERE graph_id = '".$graph_id."'";
    $this->log($q);
    $this->db->execute($q);

    $q = "INSERT INTO graph_settings (graph_id, settings) SELECT '".$new_graph_id."', settings FROM graph_settings WHERE graph_id = '".$graph_id."'";
    $this->log($q);
    $this->db->execute($q);
  }

  /**
   * Copy graph with all history
   * @param $auth_id
   * @param $name
   * @param $graph_id
   */
  private function copyGraph($auth_id, $name, $graph_id){
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

  private function removeGraph($graph_id, $auth_id=null){
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

  private function isUserOwnGraph($graph_id){
    $q = "SELECT auth_id FROM graph WHERE id = '".$graph_id."'";
    $rows = $this->db->execute($q);
    return isset($rows[0]) ? $rows[0]['auth_id'] == $this->getAuthId() : false;
  }

  private function getGraphIds($auth_id){
    $graph_query = "SELECT id FROM graph WHERE auth_id = '".$auth_id."'";
    $rows = $this->db->execute($graph_query);
    $s = array();
    foreach($rows as $row){
      $s[] = $row['id'];
    }
    return $s;
  }

  private function getGraphs($graph_ids){
    $s = array();
    foreach($graph_ids as $graph_id){
      if(GraphDiffCreator::isDiffGraphId($graph_id)){
        $graphId = GraphDiffCreator::decodeDiffGraphId($graph_id);
        $s[$graph_id] = GraphDiffCreator::getGraphModelSettings($this->db, $graphId['graphId1'], $graphId['graphId2']);
      }else{
        $graph_query = "SELECT id, graph FROM graph WHERE id = '".$graph_id."'";
        $rows = $this->db->execute($graph_query);
        foreach($rows as $row){
          $s[$row['id']] = json_decode($row['graph'], true);
        }
      }
    }
    return $s;
  }

  private function getGraphsHistoryChunk($request){
    $graphs_history = array();
    foreach($request as $graph_id => $step){
      if(GraphDiffCreator::isDiffGraphId($graph_id)){
        $graphId1 = GraphDiffCreator::decodeDiffGraphId($graph_id)['graphId1'];
        $graphId2 = GraphDiffCreator::decodeDiffGraphId($graph_id)['graphId2'];
        $q = "SELECT cloned_from_graph_history_step FROM graph WHERE id = '".$graphId2."'";
        $rows = $this->db->execute($q);
        $graph1 = $this->getGraphsHistoryChunk(array($graphId1=>$rows[0]['cloned_from_graph_history_step']))[0];
        $graph2 = $this->getGraphsHistoryChunk(array($graphId2=>null))[0];
        $graph_diff_creator = new GraphDiffCreator(
            $graph1,
            $graph2,
            $this->contentIdConverter
        );
        $graphModel = $graph_diff_creator->getDiffGraph();
        /**
         * create mapping merging node_mapping of graphId1 and graphId2
         */
        // first of all adapt area of mappings to area of graph1
        $graph2['node_mapping'] = $this->adjustMappingToArea($graph2['node_mapping'], $graph1['node_mapping']['area']);

        // now merge two mappings
        // mapping of graph1 takes precedence
        $diff_node_mapping = array();
        foreach($graphModel['nodes'] as $id=>$node){
          $contentId = GraphDiffCreator::decodeContentId($node['nodeContentId']);
          if($contentId['graphId1']){
            $nodeId = $this->findNodeIdByNodeContentId(
                $this->contentIdConverter->createGlobalContentId($contentId['graphId1'], $contentId['localContentId1']),
                $graph1['elements']['nodes']
            );
            $diff_node_mapping[$id] = $graph1['node_mapping']['mapping'][$nodeId];
            $diff_node_mapping[$id]['id'] = $id;
          }else{
            $nodeId = $this->findNodeIdByNodeContentId(
                $this->contentIdConverter->createGlobalContentId($contentId['graphId2'], $contentId['localContentId2']),
                $graph2['elements']['nodes']
            );
            $diff_node_mapping[$id] = $graph2['node_mapping']['mapping'][$nodeId];
            $diff_node_mapping[$id]['id'] = $id;
          }
        }
        $graphs_history[] = array(
            'graphId'=>$graph_id,
            'step'=>0,
            'timestamp'=>time(),
            'elements'=>$graphModel,
            'node_mapping'=>array('area'=>$graph1['node_mapping']['area'], 'mapping'=>$diff_node_mapping)
        );
      }else{
        // if step is null we assume that they wanted the very last step
        if($step == null){
          $query = "SELECT step FROM `graph_history` WHERE graph_id = '".$graph_id."' ORDER BY step DESC LIMIT 1";
          $rows = $this->db->execute($query);
          if(!$rows) $this->error("returned no rows on query: ".$query);
          $step = $rows[0]['step'];
        }

        $query = "SELECT step, timestamp, elements, node_mapping FROM `graph_history` WHERE graph_id = '".$graph_id."' AND step = '".$step."' ORDER BY step ASC LIMIT ".self::HISTORY_CHUNK;
        $rows = $this->db->execute($query);
        foreach($rows as $row){
          $graphs_history[] = array(
              'graphId'=>$graph_id,
              'step'=>$step,
              'timestamp'=>time(),
              'elements'=>json_decode($row['elements'], true),
              'node_mapping'=>json_decode($row['node_mapping'], true)
          );
        }
      }
    }

    return $graphs_history;
  }

 /**
  * Extract Bayes Graphs from graph_id Graph.
  * The structure of every extracted Bayes Graph is in a form
  * {
  *   nodes:{'e1':['1','2'], 'e2':['1','2'], 'h1':['1','2']}, // every node contains array of its alternative_ids
  *   edges:[['h1','e1'],['e2','h1']] // first element is source, second is destination
  * };
  * where e1,e2,h1 are local_content_ids in our terminology
  * @param $graph_id
  * @return array|bool
  */
  private function getBayesGraph($graph_id){
    $history = $this->getGraphsHistoryChunk(array($graph_id=>null));
    if(!count($history)) return false;

    // form nodes
    $node_local_content_ids = array();
    foreach($history[0]['elements']['nodes'] as $node) $node_local_content_ids[] = $this->contentIdConverter->getLocalContentId($node['nodeContentId']);

    $query = "SELECT local_content_id, alternative_id, type FROM node_content WHERE graph_id = '".$graph_id
        ."' AND type IN ('fact','proposition')"
        ." AND local_content_id IN ('".implode("','",$node_local_content_ids)."') ORDER BY local_content_id, alternative_id";
    $this->log($query);
    $graph = array('nodes'=>array(), 'edges'=>array());
    $rows = $this->db->execute($query);
    foreach($rows as $row){
      if(!in_array($row['type'], array('fact','proposition'))) continue;
      if($row['type'] == 'fact') $graph['nodes'][$row['local_content_id']] = ['0','1']; // fact always has only two alternatives
      if($row['type'] == 'proposition') $graph['nodes'][$row['local_content_id']][] = $row['alternative_id'];
    }

    // form edges
    foreach($history[0]['elements']['edges'] as $edge){
      $src_node = $history[0]['elements']['nodes'][$edge['source']];
      $dst_node = $history[0]['elements']['nodes'][$edge['target']];
      $src = $this->contentIdConverter->getLocalContentId($src_node['nodeContentId']);
      $dst = $this->contentIdConverter->getLocalContentId($dst_node['nodeContentId']);
      // if both src and dst exists in $graph['nodes'], include in edges (thus we get only edges between facts and propositions)
      if(isset($graph['nodes'][$src]) && isset($graph['nodes'][$dst])) $graph['edges'][] = array($src,$dst);
    }

    return $graph;
  }

 /**
  * Return probability of graph in a form
  * {
  *  e1: {
  *    soft:{1:1, 2:0}, // soft evidence for e1 and ^e1, sum must be equal to 1
  *    '{"h1":"1"}':{1:0.01, 2:0.99}, // sum must be equal to 1
  *    '{"h1":"2"}':{1:0.99, 2:0.01}  // sum must be equal to 1
  *  },
  *  e2: {
  *    soft:{1:1, 2:0} // soft evidence for e2 and ^e2,  sum must be equal to 1
  *  },
  *  h1: {
  *    // prior probability of proposition alternative is 1/<number of alternatives>
  *    '{"e2":"1"}':{1:0.9999, 2:0.0001}, // sum must be equal to 1
  *    '{"e2":"2"}':{1:0.99, 2:0.01}  // sum must be equal to 1
  *   }
  * }
  * GRAPH
  *   e2 --> h1 --> e1
  * Interpretation
  * h1: 1 - I not have HIV, 2 - I have HIV
  * e1: 1 - HIV test is +, 2 - HIV test is -
  * e2: 1 - only 1 of 10000 has HIV, 2 - 1 is not true
  * @param $graph_id
  * @param $bayes_graph - graph returned by $this->getBayesGraph()
  * @return array|bool
  */
  private function getBayesProbabilities($graph_id, $bayes_graph){
    $conv = new ContentIdConverter();
    $probabilities = array();
    foreach(array_keys($bayes_graph['nodes']) as $local_content_id){
      $query = "SELECT alternative_id, p, type, reliability FROM node_content WHERE graph_id = '".$graph_id
          ."' AND local_content_id = '".$local_content_id."'";
      $alternatives = $this->db->execute($query);

      $probabilities[$local_content_id] = array();
      foreach($alternatives as $alternative){
        // if node is a fact use reliability as soft evidence
        if($alternative['type'] == 'fact'){
          $probabilities[$local_content_id]['soft'][$alternative['alternative_id']] = $alternative['reliability']/100;
        }

        $p = json_decode($alternative['p'], true);
        if(!is_array($p)) continue;

        foreach($p as $parents_key => $prob_value){
          // reformat $parents_key to contain only $local_content_id
          $parents_local_key = array();
          foreach(json_decode($parents_key, true) as $key=>$value){
            $parents_local_key[$conv->getLocalContentId($key)] = $value;
          }
          $parents_local_key = json_encode($parents_local_key);
          $probabilities[$local_content_id][$parents_local_key][$alternative['alternative_id']] = doubleval($prob_value);
        }
      }

      if(count($alternatives) == 1 && $alternatives[0]['type'] != 'fact'){
        $this->log('Error: only one alternative for graph = '.$graph_id.', node = '.$local_content_id.' and it\'s type is not "fact"');
      }

      if(count($alternatives) == 1 && $alternatives[0]['type'] == 'fact' && $alternatives[0]['alternative_id']!=0){
        $this->log('Error: fact for graph = '.$graph_id.', node = '.$local_content_id.' has only one alternative, but its alternative_id != 0');
      }

      // "fact" must have only two alternatives, probability of the second is calculated automatically as (1 - first alternative)
      if(count($alternatives) == 1 && $alternatives[0]['type'] == 'fact' && $alternatives[0]['alternative_id']==0){
        foreach($probabilities[$local_content_id] as $key => $value){
          $probabilities[$local_content_id][$key][1] = 1 - $probabilities[$local_content_id][$key][0];
        }
      }
    }

    return $probabilities;
  }

  /**
   * Get nodes that has incomplete or incorrect probability information (to calculate bayes graph)
   * - check number of rows in $probabilities[$node_local_id] equal to
   *   number of parent alternative combinations (+1 for fact because of 'soft' key)
   * - check number of cells in $probabilities[$node_local_id][parents_alternatives_comb] equal to node alternatives
   * - check that each cell in a $probabilities[$node_local_id] is from [0,1]
   * - check that "sum of cells in a row" == 1
   * - check that every fact has 'soft' key in a $probabilities[$node_local_id]
   * @param $graph_id
   * @param $probabilities
   * @param $bayes_graph
   * @return array
   */
  private function getImperfectNodes($graph_id, $bayes_graph, $probabilities){
    $converter = new ContentIdConverter();
    $imperfect_nodes = array(
        'wrong_number_of_rows'=>array(),
        'wrong_number_of_cells_in_a_row'=>array(),
        'cell_out_of_range'=>array(),
        'wrong_row_sum'=>array(),
        'fact_without_soft'=>array()
    );
    $pnum = array(); // $pnum[$node_local_id] is the number of elements that must be in a $probabilities[$node_local_id]
    foreach($bayes_graph['nodes'] as $node_local_id => $alternatives){
      // for each combination of parents alternatives and alternative it must have probability in [0,1]
      $parents_alternatives = array();
      foreach($bayes_graph['edges'] as $edge) if($edge[1] == $node_local_id) $parents_alternatives[] = $bayes_graph['nodes'][$edge[0]];
      $pnum[$node_local_id] = count($parents_alternatives) ? 1 : 0;
      foreach($parents_alternatives as $parent_alternatives) $pnum[$node_local_id] *= count($parent_alternatives);
      if(isset($probabilities[$node_local_id]['soft'])) $pnum[$node_local_id]++;
      //echo '$pnum['.$node_local_id.'] = '.$pnum[$node_local_id]."\n";

      // check that number of rows in a $probabilities[$node_local_id] equals $pnum[$node_local_id]
      if(count($probabilities[$node_local_id]) != $pnum[$node_local_id])
        $imperfect_nodes['wrong_number_of_rows'][] = $converter->createGlobalContentId($graph_id, $node_local_id);

      // check that number of cells in every row equals to count($alternatives)
      foreach($probabilities[$node_local_id] as $row) if(count($row) != count($alternatives))
        $imperfect_nodes['wrong_number_of_cells_in_a_row'][] = $converter->createGlobalContentId($graph_id, $node_local_id);

      // check that every cells has a number from 0 to 1
      foreach($probabilities[$node_local_id] as $row){
        foreach($row as $cell) if(!is_numeric($cell) || $cell<0 || $cell>1) $imperfect_nodes['cell_out_of_range'][] = $converter->createGlobalContentId($graph_id, $node_local_id);
      }

      // sum of all alternatives under given parent combination must be equal to 1
      foreach($probabilities[$node_local_id] as $row) if(array_sum($row) != 1) $imperfect_nodes['wrong_row_sum'][] = $converter->createGlobalContentId($graph_id, $node_local_id);
    }

    foreach(array_keys($bayes_graph['nodes']) as $node_local_id){
      // if node is a fact it must has soft evidence with two alternatives in it
      $query = "SELECT type FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$node_local_id."' LIMIT 1";
      $alternatives = $this->db->execute($query);
      if($alternatives[0]['type'] == 'fact' && !isset($probabilities[$node_local_id]['soft'])) $imperfect_nodes['fact_without_soft'][] = $converter->createGlobalContentId($graph_id, $node_local_id);
    }

    $imperfect_nodes = array(
      'wrong_number_of_rows'=>array_unique($imperfect_nodes['wrong_number_of_rows']),
      'wrong_number_of_cells_in_a_row'=>array_unique($imperfect_nodes['wrong_number_of_cells_in_a_row']),
      'cell_out_of_range'=>array_unique($imperfect_nodes['cell_out_of_range']),
      'wrong_row_sum'=>array_unique($imperfect_nodes['wrong_row_sum']),
      'fact_without_soft'=>array_unique($imperfect_nodes['fact_without_soft'])
    );

    return $imperfect_nodes;
  }

  public function getJsIncludeList(){
    return array(
      'Helpers.js',

      'Mediator/iListener.js',
      'Mediator/Event.js',
      'Mediator/Mediator.js',
      'Mediator/Publisher.js',
      'Mediator/Subscriber.js',

      'Ajax.js',
      'Repository.js',
      'GraphHistory.js',
      'KeyManager.js',
      'StatusString.js',

      'GraphElementsContent/interfaces.js',
      'GraphElementsContent/GraphElementsContent.js',

      'GraphModel/interfaces.js',
      'GraphModel/GraphModel.js',
      'GraphModel/GraphModelFactory.js',
      'GraphModel/GraphModelsPubSub.js',

      'ViewManager.js',
      'UIElements.js',

      'Drawer/kinetic-v4.7.0.js',
      'Drawer/CanvasDrawer.js',
      'Drawer/CanvasDrawerFactory.js',

      'Drawer/SVGDrawer.js',
      'Drawer/SVGDrawerFactory.js',

      'GraphViewElement/GraphViewElement.js',
      'GraphViewElement/iGraphViewNode.js',
      'GraphViewElement/iGraphViewNodeLabel.js',
      'GraphViewElement/iGraphViewEdge.js',
      'GraphViewElement/GraphViewNode.js',
      'GraphViewElement/GraphViewNodeImage.js',
      'GraphViewElement/GraphViewNodeLabel.js',
      'GraphViewElement/GraphViewEdge.js',

      'GraphMenu.js',
      'SelectGraphLayoutModel.js',
      'SelectGraphSkinModel.js',

      'GraphView/iGraphViewModel.js',
      'GraphView/iGraphView.js',
      'GraphView/GraphView.js',
      'GraphView/GraphViewFactory.js',
      'GraphView/GraphViewsPubSub.js',
      'GraphView/iGraphViewSettingsStructOne.js',
      'GraphView/iGraphViewSettingsStructTwo.js',

      'GraphController/AddRemoveElementController.js',
      'GraphController/HistoryController.js',
      'GraphController/SelectElementController.js',
      'GraphController/ModelChangeController.js',
      'GraphController/MappingChangeController.js',
      'GraphController/ShowEditorController.js',
      'GraphController/DragModeChangeController.js',
      'GraphController/GraphControllerPubSub.js',

      'GraphNodeMappings/GraphNodeMappingsPubSub.js',
      'GraphNodeMappings/GraphNodeMappingForceDirected.js',
      'GraphNodeMappings/iGraphNodeMappingForceDirectedModel.js',
      //'GraphNodeMappings/iMapping.js',

      'GraphNodeLabelMappings/GraphNodeLabelMappingsPubSub.js',
      'GraphNodeLabelMappings/GraphNodeLabelMappingRadial.js',
      'GraphNodeLabelMappings/GraphNodeLabelMappingHorizontal.js',

      'GraphDecorations/GraphDecorationsPubSub.js',
      'GraphDecorations/GraphDecorationByType.js',
      //'GraphDecorations/iDecoration.js',

      'GraphElementEditor.js',

      'Bayes/BayesPubSub.js',
      'Bayes/BayesCalculatorGRain.js',
    );
  }
}
