<?php

include("class.Diff.php");
include("GraphDiffCreator.php");
include("ContentIdConverter.php");

class AppUserPkb extends App
{
  const HISTORY_CHUNK = 3; // number of graph in history chunk
  private $node_basic_types;
  private $node_attribute_names;
  private $alternative_attribute_names;
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
    $this->node_attribute_names = array('type', 'importance', 'has_icon', 'active_alternative_id');
    $this->alternative_attribute_names = array('label', 'reliability','p');
    $this->edge_attribute_names = array('type', 'label');
    $this->contentIdConverter = new ContentIdConverter();

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
        'getGraphDiff',
        'removeGraph',
        'addNodeContentList',
        'updateNodeContentList',
        'removeNodeContentList'
    );
    if(in_array($action, $this->writeActions) && $access_level == 'read') exit();
   // if(in_array($action, $this->writeActions)) exit('ssssssssssssss');

    // else process action defined by url
    switch($action){

      /* READ METHODS */
      case 'getGraphsModelSettings':
        if($access_level == 'read'){
          $graphs_settings = $this->getGraphs(array($showGraphId));
          $graphs_settings[$showGraphId]['isEditable'] = false;
        }else{
          $graphs_settings = $this->getGraphs($this->getGraphIds($this->getAuthId()));
        }
        $this->showRawData(json_encode($graphs_settings));
        break;

      case 'getGraphsHistoryChunk':
        $chunk = $this->getGraphsHistoryChunk($this->getRequest());
        $this->showRawData(json_encode($chunk));
        break;

      case 'getGraphNodeContent':
        $content_ids = $this->getRequest()['nodeContentIds'];
        $node_contents = array();
        foreach($content_ids as $content_id){
          if(GraphDiffCreator::isDiffContentId($content_id)){
            $contentId = GraphDiffCreator::decodeContentId($content_id);
            $text1 = "";
            $text2 = "";
            if($contentId['graphId1']) $text1 = $this->db->execute("SELECT text FROM node_content WHERE graph_id = '".$contentId['graphId1']."' AND local_content_id = '".$contentId['localContentId1']."'")[0]['text'];
            if($contentId['graphId2']) $text2 = $this->db->execute("SELECT text FROM node_content WHERE graph_id = '".$contentId['graphId2']."' AND local_content_id = '".$contentId['localContentId2']."'")[0]['text'];
            if($contentId['graphId1'] && $contentId['graphId2']){
              $text1 = mb_convert_encoding($text1, 'HTML-ENTITIES', 'UTF-8');
              $text2 = mb_convert_encoding($text2, 'HTML-ENTITIES', 'UTF-8');
              $node_texts[$content_id] = mb_convert_encoding(Diff::toString(Diff::compare($text1, $text2)), 'UTF-8', 'HTML-ENTITIES');
            }
            else $node_texts[$content_id] = $text1.$text2;
          }else{
            // we MUST use $graph_id decoded from $content_id because node content can belong not to $this->getRequest()['graphId']
            // but to other graph (i.e. when node is shared between two different graphs (node of one graph linked to another) or in case of "difference graph")
            $graph_id = $this->contentIdConverter->getGraphId($content_id);
            $local_content_id = $this->contentIdConverter->getLocalContentId($content_id);
            $node_rows = $this->db->execute("SELECT * FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'");

            $content = array();
            // general node attributes
            foreach($this->node_attribute_names as $name){
              $content[$name] = $node_rows[0][$name];
            }

            // alternatives
            $content['alternatives'] = array();
            foreach($node_rows as $node_row){
              $alternative = array();

              // alternative attributes
              foreach($this->alternative_attribute_names as $name){
                $alternative[$name] = $node_row[$name];
              }

              // alternative text
              $alternative['text'] = $node_row['text'];

              // get alternative lists
              $q = "SELECT * FROM ".($content['type'] == $this->node_basic_types['fact'] ? 'node_content_source' : 'node_content_falsification').
                  " WHERE graph_id='".$graph_id."' AND local_content_id='".$local_content_id."' AND alternative_id='".$node_row['alternative_id']."'";
              $this->log($q);
              $rows = $this->db->execute($q);
              $list_items = array();
              foreach($rows as $row){
                $list_items[$row['id']] = $row;
              }
              $alternative['list'] = $list_items;

              $content['alternatives'][$node_row['alternative_id']] = $alternative;
            }

            $node_contents[$content_id] = $content;
          }
        }
        $this->showRawData(json_encode($node_contents));
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
        $nodes = array();
        $edges = array();
        foreach($r['nodes'] as $content_id){
          $graph_id = $this->contentIdConverter->getGraphId($content_id);
          $local_content_id = $this->contentIdConverter->getLocalContentId($content_id);
          $node_rows = $this->db->execute("SELECT '".$content_id."' as nodeContentId, alternative_id, ".implode(',',$this->alternative_attribute_names).", ".implode(',',$this->node_attribute_names).", cloned_from_graph_id, cloned_from_local_content_id FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'");

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
            if($row['is_active_alternative']) $node_attributes['active_alternative_id'] = $row['alternative_id'];
          }

          //  == fill in attributes for every alternative ==
          $node_attributes['alternatives'] = array();
          foreach($node_rows as $row){
            if(!isset($node_attributes['alternatives'][$row['alternative_id']])) $node_attributes['alternatives'][$row['alternative_id']] = array();
            foreach($this->alternative_attribute_names as $name) $node_attributes['alternatives'][$row['alternative_id']][$name] = $row[$name];
          }
          $nodes[$content_id] = $node_attributes;
        }

        foreach($r['edges'] as $content_id){
          $graph_id = $this->contentIdConverter->getGraphId($content_id);
          $local_content_id = $this->contentIdConverter->getLocalContentId($content_id);
          $query = "SELECT '".$content_id."' as edgeContentId, type, label FROM edge_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
          $edge_rows = $this->db->execute($query);
          $edge_row = $edge_rows[0];
          $edges[$content_id] = $edge_row;
        }

        $graphs_elements = array('nodes'=>$nodes, 'edges'=>$edges);
        $this->showRawData(json_encode($graphs_elements));
        break;

      case 'getGraphsHistoryTimeline':
        $r = $this->getRequest();
        $timeline = array();

        foreach($r['ids'] as $graph_id){
          $timeline[$graph_id] = array();
          $query = "SELECT step, timestamp FROM graph_history WHERE graph_id = '".$graph_id."'";
          foreach($this->db->execute($query) as $row){
            $timeline[$graph_id][$row['step']] = (int)$row['timestamp'];
          }
        }
        $this->showRawData(json_encode($timeline));
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
        $query = "SELECT graph_id, settings FROM graph_settings";
        $rows = $this->db->execute($query);
        foreach($rows as $row){
          $settings = json_decode($row['settings'], true);
          if($settings['position'] == $position){
            $settings['position'] = 'not to be shown';
            $update_query = "UPDATE graph_settings SET settings = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE graph_id = '".$row['graph_id']."'";
            $this->db->execute($update_query);
          }
          if($row['graph_id'] == $graphId){
            $settings['position'] = $position;
            $update_query = "UPDATE graph_settings SET settings = '".json_encode($settings, JSON_UNESCAPED_UNICODE)."' WHERE graph_id = '".$row['graph_id']."'";
            $this->db->execute($update_query);
          }
        }
        $this->showRawData('success');
        break;

      case 'addGraphHistoryItem':
        $r = $this->getRequest();
        $query = 'INSERT INTO graph_history SET graph_id = "'.$r['graphId'].'", step = "'.$r['step'].'", timestamp = "'.$r['timestamp'].'", elements = "'.$this->db->escape(json_encode($r['elements'], JSON_FORCE_OBJECT)).'", node_mapping = "'.$this->db->escape(json_encode($r['node_mapping'])).'"';
        error_log($query);
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

        if($r['type'] == 'updateNodeText' || $r['type'] == 'updateNodeAttribute' || $r['type'] == 'addIcon'){
          $graph_id = $this->contentIdConverter->getGraphId($r['nodeContentId']);
          $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
        }else if($r['type'] == 'updateEdgeAttribute'){
          $graph_id = $this->contentIdConverter->getGraphId($r['edgeContentId']);
          $local_content_id = $this->contentIdConverter->getLocalContentId($r['edgeContentId']);
        }else if($r['type'] == 'addEdge' || $r['type'] == 'addNode'){
          $graph_id = $r['graphId'];
        }

        $this->isUserOwnGraph($graph_id);

        if($r['type'] == 'updateNodeText'){
          $query = "UPDATE node_content SET text = '".$this->db->escape($r['text'])."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
          $this->db->execute($query);
        }else if($r['type'] == 'updateNodeAttribute'){
          $query = "UPDATE node_content SET `".$r['nodeAttribute']['name']."` = '".$this->db->escape($r['nodeAttribute']['value'])."' WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'";
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
          $this->showRawData($this->contentIdConverter->createGlobalContentId($graph_id,$local_content_id));

        }else if($r['type'] == 'addNode'){
          $this->db->startTransaction();
          try{
            $query = "SELECT MAX(local_content_id) as max_id FROM node_content WHERE `graph_id` = '".$this->db->escape($graph_id)."'";
            $rows = $this->db->execute($query);
            $local_content_id = $rows[0]['max_id'] + 1;
            $query = "INSERT INTO node_content SET `graph_id` = '".$this->db->escape($graph_id)."', `local_content_id` = '".$this->db->escape($local_content_id)."', `type` = '".$this->db->escape($r['node']['type'])."', `label` = '".$this->db->escape($r['node']['label'])."', `text` = '".$this->db->escape($r['node']['text'])."', `reliability` = '".(is_numeric($r['node']['reliability']) ? $r['node']['reliability'] : 0)."', `importance` = '".(is_numeric($r['node']['importance']) ? $r['node']['importance'] : 0)."', created_at = NOW()";
            $this->db->execute($query);
          }catch (Exception $e) {
            $this->db->rollbackTransaction();
            $this->error("Error during transaction: ".mysql_error().". Transaction rollbacked.");
          }
          $this->db->commitTransaction();
          $this->showRawData($this->contentIdConverter->createGlobalContentId($graph_id, $local_content_id));

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

      case 'addNodeContentList':
        $r = $this->getRequest();

        if($r['nodeType'] == $this->node_basic_types['fact']){
          // if it is a new source - add it to the main list
          if(empty($r['source']['source_id'])){
            // TODO: even though client thinks there is no correspondent source, it may be in fact - we need to check it here somehow

            $q = "INSERT INTO source SET "
              ."source_type='".$r['item']['source_type']
              ."', `name`='".$this->db->escape($r['item']['name'])
              ."', url='".$this->db->escape($r['item']['url'])
              ."', author='".$this->db->escape($r['item']['author'])
              ."', editor='".$this->db->escape($r['item']['editor'])
              ."', publisher='".$this->db->escape($r['item']['publisher'])
              ."', publisher_reliability='".$this->db->escape($r['item']['publisher_reliability'])
              ."', scopus_title_list_id='".$this->db->escape($r['item']['scopus_title_list_id'])
              ."', publish_date='".$this->db->escape($r['item']['publish_date'])
              ."', comment='".$this->db->escape($r['item']['comment'])
              ."', `pages`='".$this->db->escape($r['item']['pages'])."' ";
            $this->log($q);
            $r['item']['source_id'] = $this->db->execute($q);
          }

          $graph_id = $r['graphId'];
          $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
          $q = "INSERT INTO node_content_source SET graph_id='".$graph_id
            ."', local_content_id='".$local_content_id
            ."', alternative_id='".$r['alternativeId']
            ."', source_type='".$r['item']['source_type']
            ."', `name`='".$this->db->escape($r['item']['name'])
            ."', url='".$this->db->escape($r['item']['url'])
            ."', author='".$this->db->escape($r['item']['author'])
            ."', editor='".$this->db->escape($r['item']['editor'])
            ."', publisher='".$this->db->escape($r['item']['publisher'])
            ."', publisher_reliability='".$this->db->escape($r['item']['publisher_reliability'])
            ."', scopus_title_list_id='".$this->db->escape($r['item']['scopus_title_list_id'])
            ."', publish_date='".$this->db->escape($r['item']['publish_date'])
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
            ."', alternative_id='".$r['alternativeId']
            ."', `name`='".$this->db->escape($r['item']['name'])
            ."', comment='".$this->db->escape($r['item']['comment'])."' ";

          $this->log($q);
          $item_id = $this->db->execute($q);
          $this->showRawData(json_encode(array('result'=>'SUCCESS','id'=>$item_id)));
        }

        break;

      case 'updateNodeContentList':
        $r = $this->getRequest();
        $graph_id = $r['graphId'];
        $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
        if($r['nodeType'] == $this->node_basic_types['fact']) {
          $q = "UPDATE node_content_source SET "
            . "local_content_id='" . $local_content_id
            . "', alternative_id='".$r['alternativeId']
            . "', source_type='" . $r['item']['source_type']
            . "', `name`='" . $this->db->escape($r['item']['name'])
            . "', url='" . $this->db->escape($r['item']['url'])
            . "', author='" . $this->db->escape($r['item']['author'])
            . "', editor='" . $this->db->escape($r['item']['editor'])
            . "', publisher='" . $this->db->escape($r['item']['publisher'])
            . "', publisher_reliability='" . $this->db->escape($r['item']['publisher_reliability'])
            . "', scopus_title_list_id='" . $this->db->escape($r['item']['scopus_title_list_id'])
            . "', publish_date='" . $this->db->escape($r['item']['publish_date'])
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
        break;

      case 'removeNodeContentList':
        $r = $this->getRequest();
        $graph_id = $r['graphId'];
        $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
        if($r['nodeType'] == $this->node_basic_types['fact']) {
          $q = "DELETE FROM node_content_source WHERE graph_id='".$graph_id
            ."' AND local_content_id='".$local_content_id
            ."' AND alternative_id='".$r['alternativeId']
            ."' AND source_type='".$this->db->escape($r['item']['source_type'])
            ."' AND url='".$this->db->escape($r['item']['url'])
            ."' AND author='".$this->db->escape($r['item']['author'])
            ."' AND editor='".$this->db->escape($r['item']['editor'])
            ."' AND publisher='".$this->db->escape($r['item']['publisher'])
            ."' AND publish_date='".$this->db->escape($r['item']['publish_date'])."' ";
          $this->log($q);
          $this->db->execute($q);
          // calculate fact reliability
          $reliability = $this->getFactReliability($graph_id,$local_content_id);
          $this->showRawData(json_encode(array('result'=>'SUCCESS','reliability'=>$reliability)));
        }else{
          $q = "DELETE FROM node_content_falsification WHERE graph_id='".$graph_id
            ."' AND local_content_id='".$local_content_id
            ."' AND alternative_id='".$r['alternativeId']
            ."' AND name='".$this->db->escape($r['item']['name'])
            ."' AND comment='".$this->db->escape($r['item']['comment'])."' ";
          $this->log($q);
          $this->db->execute($q);
          $this->showRawData(json_encode(array('result'=>'SUCCESS')));
        }
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
        $substring = '%'.preg_replace('!\s+!', '% ', $r['substring']).'%';
        $q = "SELECT * FROM source WHERE name LIKE '".$substring."'";
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

  protected function getFactReliability($graph_id,$local_content_id){
    $q = "SELECT publisher_reliability FROM node_content_source WHERE graph_id='".$graph_id."' AND local_content_id='".$local_content_id."'";
    $this->log($q);
    $rows = $this->db->execute($q);
    $reliability_array = array();
    foreach($rows as $row) $reliability_array[] = $row['publisher_reliability'];
    return min(array_sum($reliability_array)*10,99);
  }

  protected function getGraphSettings($graph_ids){
    $s = array();
    $query = "SELECT graph_id, settings FROM graph_settings WHERE graph_id IN ('".implode("','",$graph_ids)."')";
    foreach($this->db->execute($query) as $row){
      $s[$row['graph_id']] = json_decode($row['settings'], true);
    }
    return $s;
  }

  protected function getGraphDiff($graphId1, $graphId2){
    $q = "SELECT cloned_from_graph_history_step FROM graph WHERE id = '".$graphId2."'";
    $rows = $this->db->execute($q);
    $graph1 = $this->getGraphsHistoryChunk(array($graphId1=>$rows[0]['cloned_from_graph_history_step']))[0];
    $graph2 = $this->getGraphsHistoryChunk(array($graphId2=>null))[0];

    $graph1NodeContent = $this->getNodeAttributes($graphId1);
    $graph2NodeContent = $this->getNodeAttributes($graphId2);

    $graph1EdgeContent = $this->getEdgeAttributes($graphId1);
    $graph2EdgeContent = $this->getEdgeAttributes($graphId2);
//var_dump($graph1EdgeContent);
//var_dump($graph2EdgeContent);
    $graph_diff_creator = new GraphDiffCreator(
      $graph1,
      $graph2,
      $graph1NodeContent,
      $graph2NodeContent,
      $graph1EdgeContent,
      $graph2EdgeContent,
      $this->contentIdConverter
    );
    $graphModel = $graph_diff_creator->getDiffGraph();

    // create array of diff node attributes
    $diffNodeAttributes = array();
    foreach($graphModel['nodes'] as $node){
      $contentId = GraphDiffCreator::decodeContentId($node['nodeContentId']);
      if($contentId['graphId1']) $diffNodeAttributes[$node['nodeContentId']] = $graph1NodeContent[$contentId['localContentId1']];
      // if we have graph2 attributes for this node, use it
      if($contentId['graphId2']){
        foreach($this->node_attribute_names as $attribute_name){
          if($graph2NodeContent[$contentId['localContentId2']][$attribute_name] != null)
            $diffNodeAttributes[$node['nodeContentId']][$attribute_name] = $graph2NodeContent[$contentId['localContentId2']][$attribute_name];
        }
      }

      $diffNodeAttributes[$node['nodeContentId']]['nodeContentId'] = $node['nodeContentId'];
      unset($diffNodeAttributes[$node['nodeContentId']]['local_content_id']);
    }

    // create array of diff edge attributes
    $diffEdgeAttributes = array();
    foreach($graphModel['edges'] as $edge){
      $contentId = GraphDiffCreator::decodeContentId($edge['edgeContentId']);
      if($contentId['graphId2']) $diffEdgeAttributes[$edge['edgeContentId']] = $graph2EdgeContent[$contentId['localContentId2']];
      else $diffEdgeAttributes[$edge['edgeContentId']] = $graph1EdgeContent[$contentId['localContentId1']];

      $diffEdgeAttributes[$edge['edgeContentId']]['edgeContentId'] = $edge['edgeContentId'];
      unset($diffEdgeAttributes[$edge['edgeContentId']]['local_content_id']);
    }

    $s = $this->getGraphSettings(array($graphId1, $graphId2));
    // check that settings for $graphId1 is the sane as for $graphId2
    if($s[$graphId1]['skin'] != $s[$graphId2]['skin']) exit('Skins are different');

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

    // get graph model settings
    $diffGraphId = 'diff_'.$graphId1.'_'.$graphId2;
    $q = "SELECT graph FROM graph WHERE id = '".$graphId1."'";
    $graphModelSettings = json_decode($this->db->execute($q)[0]['graph'], true);
    $graphModelSettings['name'] = $diffGraphId;
    $graphModelSettings['isEditable'] = false;

    // == create graphViewSettings ==
    $graphViewSettings = array(
      'graphId' => $diffGraphId,
      'graphModel' => $graphModel,
      'graphNodeAttributes' => $diffNodeAttributes,
      'graphEdgeAttributes' => $diffEdgeAttributes,
     // 'graphArea'=> $graph1['node_mapping']['area'],
      'nodeMapping' => array('area'=>$graph1['node_mapping']['area'], 'mapping'=>$diff_node_mapping),
      'skin' => $s[$graphId1]['skin'],
      'graphModelSettings' => $graphModelSettings
    );
//var_dump($graphViewSettings); exit();
    return $graphViewSettings;
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

  protected function getNodeAttributes($graphId){
    $q = "SELECT local_content_id, ".implode(',',$this->node_attribute_names).", updated_at, created_at FROM node_content WHERE graph_id = '".$graphId."'";
    $rows = $this->db->execute($q);
    $attrs = array();
    foreach($rows as $row) $attrs[$row['local_content_id']] = $row;
    return $attrs;
  }

  protected function getEdgeAttributes($graphId){
    $q = "SELECT local_content_id, ".implode(',',$this->edge_attribute_names).", updated_at, created_at FROM edge_content WHERE graph_id = '".$graphId."'";
    $rows = $this->db->execute($q);
    $attrs = array();
    foreach($rows as $row) $attrs[$row['local_content_id']] = $row;
    return $attrs;
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
   */
  private function cloneGraph($graph_id, $graph_history_step, $auth_id){
    // copy row in graph table
    $q = "SELECT graph FROM graph WHERE id = '".$graph_id."'";
    $rows = $this->db->execute($q);
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
    $this->db->execute($q);

    // Copy local_content_id, created_at, updated_at
    $q = "INSERT INTO node_content (graph_id, local_content_id, ".implode(',', $this->node_attribute_names).",	text, cloned_from_graph_id, cloned_from_local_content_id, updated_at, created_at) SELECT '".$new_graph_id."', local_content_id,	".implode(',', $this->node_attribute_names).", text, '".$graph_id."', local_content_id, NOW(), NOW() FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $this->db->execute($q);

    // just copy edges as is
    $q = "INSERT INTO edge_content (graph_id, local_content_id,	".implode(',', $this->edge_attribute_names).", updated_at, created_at) SELECT '".$new_graph_id."', local_content_id, ".implode(',', $this->edge_attribute_names).", NOW(), NOW() FROM edge_content WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);

    $q = "INSERT INTO graph_settings (graph_id, settings) SELECT '".$new_graph_id."', settings FROM graph_settings WHERE graph_id = '".$graph_id."'";
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
    $tables = array('graph_history','graph_settings','node_content','edge_content');
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
      $graph_query = "SELECT id, graph FROM graph WHERE id = '".$graph_id."'";
      $rows = $this->db->execute($graph_query);
      foreach($rows as $row){
        $s[$row['id']] = json_decode($row['graph'], true);
      }
    }
    return $s;
  }

  private function getGraphsHistoryChunk($request){
    $graphs_history = array();
    foreach($request as $graph_id => $step){

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
          'step'=>$row['step'],
          'timestamp'=>$row['timestamp'],
          'elements'=>json_decode($row['elements'], true),
          'node_mapping'=>json_decode($row['node_mapping'], true)
        );
      }
    }

    return $graphs_history;
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
      'NodeListCache.js',

      'Bayes/BayesPubSub.js',
      'Bayes/BayesCalculator.js',
    );
  }
}
