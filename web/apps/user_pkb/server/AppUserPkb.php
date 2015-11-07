<?php
include("GraphDiffCreator.php");
include("ContentIdConverter.php");

class AppUserPkb extends App
{
  const HISTORY_CHUNK = 3; // number of graph in history chunk
  private $node_attributes;
  private $edge_attributes;
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
          "password"=>array("type"=>"password"),
          "password again"=>array("type"=>"password")
        )
      );
      include($this->getAppDir("template", false)."/login.php");
      exit();
    }

    $this->node_attributes = array('type', 'label', 'reliability', 'importance', 'has_icon');
    $this->edge_attributes = array('type', 'label');
    $this->contentIdConverter = new ContentIdConverter();

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

      case 'getGraphNodeText':
        $content_ids = $this->getRequest()['nodeContentIds'];
        $node_texts = array();
        foreach($content_ids as $content_id){
          // we MUST use this $graph_id decoded from $content_id because node content can belong not to $this->getRequest()['graphId']
          // but to other graph (i.e. when node is shared between two different graphs (node of one graph linked to another) or in case of "difference graph")
          $graph_id = $this->contentIdConverter->getGraphId($content_id);
          $local_content_id = $this->contentIdConverter->getLocalContentId($content_id);
          $node_rows = $this->db->execute("SELECT text, cloned_from_graph_id,	cloned_from_local_content_id FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'");
          // if $this->getRequest()['graphId'] is clone of another graph and $local_content_id was not modified (= NULL)
          // return text of original graph
          if(
            $node_rows[0]['text'] == null &&
            $node_rows[0]['cloned_from_graph_id'] != null &&
            $node_rows[0]['cloned_from_local_content_id'] != null
          ){
            $node_rows = $this->db->execute("SELECT text FROM node_content WHERE graph_id = '".$node_rows[0]['cloned_from_graph_id']."' AND local_content_id = '".$node_rows[0]['cloned_from_local_content_id']."'");
          }
          $node_texts[$content_id] = $node_rows[0]['text'];
        }
        $this->showRawData(json_encode($node_texts));
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
          $node_rows = $this->db->execute("SELECT '".$content_id."' as nodeContentId, ".implode(',',$this->node_attributes).", cloned_from_graph_id, cloned_from_local_content_id FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id = '".$local_content_id."'");
          $node_row = $node_rows[0];

          // if node was cloned and some its attributes is null this simply means it was just not modified -  so take it from original node
          if($node_row['cloned_from_graph_id'] != null){
            $attributes_to_borrow = array();
            foreach($this->node_attributes as $attribute){
              if($node_row[$attribute] == null) $attributes_to_borrow[] = $attribute;
            }
            // some is null
            if(count($attributes_to_borrow)>0){
              $original_node_rows = $this->db->execute("SELECT ".implode(',',$attributes_to_borrow)." FROM node_content WHERE graph_id = '".$node_row['cloned_from_graph_id']."' AND local_content_id = '".$node_row['cloned_from_local_content_id']."'");
              $original_node_row = $original_node_rows[0];
              foreach($attributes_to_borrow as $attribute){
                $node_row[$attribute] = $original_node_row[$attribute];
              }
            }
          }

          $node_row['iconSrc'] = $node_row['has_icon'] == 1 ? 'getIcon/?data="'.$content_id.'"' : null;
          unset($node_row['has_icon']);
          $nodes[$content_id] = $node_row;
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
        $s = array();
        $graph_ids = $this->getRequest();
        $query = "SELECT graph_id, settings FROM graph_settings WHERE graph_id IN ('".implode("','",$graph_ids)."')";
        foreach($this->db->execute($query) as $row){
          $s[$row['graph_id']] = json_decode($row['settings'], true);
        }
        $this->showRawData(json_encode($s));
        break;

      /* MODIFY METHODS */
      case 'updateGraphName':
        if($access_level == 'read') exit();

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
        if($access_level == 'read') exit();

        $r = $this->getRequest();
        $query = 'INSERT INTO graph_history SET graph_id = "'.$r['graphId'].'", step = "'.$r['step'].'", timestamp = "'.$r['timestamp'].'", elements = "'.$this->db->escape(json_encode($r['elements'], JSON_FORCE_OBJECT)).'", node_mapping = "'.$this->db->escape(json_encode($r['node_mapping'])).'"';
        if($this->db->execute($query)){
          $this->showRawData('success');
        }else{
          $this->showRawData('error');
        }
        break;

      case 'updateNodeMapping':
        if($access_level == 'read') exit();

        $r = $this->getRequest();
        $query = 'UPDATE graph_history SET node_mapping = "'.$this->db->escape(json_encode($r['node_mapping'], JSON_FORCE_OBJECT)).'" WHERE graph_id = "'.$r['graphId'].'" AND step = "'.$r['step'].'"';
        if($this->db->execute($query)){
          $this->showRawData('success');
        }else{
          $this->showRawData('error');
        }
        break;

      case 'updateGraphElementContent':
        if($access_level == 'read') exit();

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
        $r = $this->getRequest();
        $this->removeGraph($this->getAuthId(), $r['graph_id']);
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

      default:
        if($access_level == 'read'){
          include($this->getAppDir("template", false)."/showGraph.php");
        }else{
          include($this->getAppDir("template", false)."/index.php");
        }
        break;
    }
  }

  protected function getGraphDiff($graphId, $cloneId){
    $q = "SELECT cloned_from_graph_history_step FROM graph WHERE id = '".$cloneId."'";
    $rows = $this->db->execute($q);
    $original = $this->getGraphsHistoryChunk(array($graphId=>$rows[0]['cloned_from_graph_history_step']))[0];
    $clone = $this->getGraphsHistoryChunk(array($cloneId=>null))[0];

    $graph1NodeContentUpdatedAt = $this->getNodeAttributes($graphId);
    $graph2NodeContentUpdatedAt = $this->getNodeAttributes($cloneId);

    $graph_diff_creator = new GraphDiffCreator(
      $original,
      $clone,
      $graph1NodeContentUpdatedAt,
      $graph2NodeContentUpdatedAt,
      $this->node_attributes,
      $this->edge_attributes,
      $this->contentIdConverter
    );
    $graphModel = $graph_diff_creator->getDiffGraph();
    var_dump($graphModel);
    // == create graphViewSettings ==
    $graphViewSettings = array(
      'graphId' => 'diff_'.$graphId.'_'.$cloneId,
      'graphModel' => $graphModel
    );

    // create nodes with types of form diff_originalContentId_clonedContentId

    // create skin with stickers of types 'new', 'modified', 'removed' (defined in  node.attr.typeStickers)

    // decoration with colors of original scheme and sticker names that shows if node is new, modified or removed
  }

  protected function getNodeAttributes($graphId){
    $q = "SELECT local_content_id, ".implode(',',$this->node_attributes).", updated_at FROM node_content WHERE graph_id = '".$graphId."'";
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
    $graph = '{"name":"'.$name.'","isEditable":true, "attributes":{"isInTrash":false}, "edgeTypes":["link","in_favour_of","contrary_to"],"nodeTypes":["fact","research","theory","hypothesis","illustration","theory_problem", "question", "to_read", "best_known_practice"],"nodeDefaultType":"text","edgeDefaultType":"link"}';
    $q = "INSERT INTO graph SET graph = '".$graph."', auth_id = '".$auth_id."', created_at = NOW()";
    $graph_id = $this->db->execute($q);

    $elements = '{"nodes":{},"edges":{}}';
    $q = "INSERT INTO graph_history SET graph_id = '".$graph_id."', step = '1', timestamp = unix_timestamp(NOW()), elements = '".$elements."'";
    $this->db->execute($q);

    $default_skin = '{"node":{"constr":{"withoutIcon":"GraphViewNode","withIcon":"GraphViewNodeImage"},"attr":{"typeColors":{"fact":"#00BFFF","research":"#87CEFA","theory":"#3CB371","hypothesis":"#8FBC8F","illustration":"#FF69B4","theory_problem":"#FF0000","question":"#FFFFE0","to_read":"#FFFF00","best_known_practice":"#FFA500"}}},"edge":{"constr":"GraphViewEdge","attr":{"typeColors":{"link":"#00BFFF","in_favour_of":"#87CEFA","contrary_to":"#3CB371"}}},"nodeLabel":{"constr":"GraphViewNodeLabel","attr":{"font":"Calibri","fill":"#BBBBBB","maxSize":24}}}';
    $settings = '{"skin":'.$default_skin.',"layout":"basicLayout","position":"not to be shown"}';
    $q = "INSERT INTO graph_settings SET graph_id = '".$graph_id."', settings = '".$settings."'";
    $this->db->execute($q);

    return true;
  }

  /**
   * Clone graph from specific step in a lazy manner (node contents are copied only after editing)
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

    // copy local_content_id, created_at, updated_at
    $q = "INSERT INTO node_content (graph_id, local_content_id, ".implode(',', $this->node_attributes).",	text, cloned_from_graph_id, cloned_from_local_content_id, updated_at, created_at) SELECT '".$new_graph_id."', local_content_id,	NULL,	NULL, NULL, NULL, NULL, NULL, '".$graph_id."', local_content_id, updated_at, created_at FROM node_content WHERE graph_id = '".$graph_id."' AND local_content_id IN ('".implode("','",$local_content_ids)."')";
    $this->db->execute($q);

    // just copy edges as is
    $q = "INSERT INTO edge_content (graph_id, local_content_id, 	type,	label, updated_at, created_at) SELECT '".$new_graph_id."', local_content_id,	type,	label, updated_at, created_at FROM edge_content WHERE graph_id = '".$graph_id."'";
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

  private function removeGraph($auth_id, $graph_id){
    $q = "DELETE FROM graph WHERE id = '".$graph_id."' AND auth_id = '".$auth_id."'";
    $this->db->execute($q);

    $q = "DELETE FROM graph_history WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);

    $q = "DELETE FROM graph_settings WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);

    $q = "DELETE FROM node_content WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);

    $q = "DELETE FROM edge_content WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);
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
      'ServerStatus.js',

      'GraphElementsContent/interfaces.js',
      'GraphElementsContent/GraphElementsContent.js',

      'GraphModel/interfaces.js',
      'GraphModel/GraphModel.js',
      'GraphModel/GraphModelFactory.js',
      'GraphModel/GraphModelsPubSub.js',

      'ViewManager.js',
      'UIElements.js',

//      'CanvasDrawer/kinetic-v5.0.0.js',
      'CanvasDrawer/kinetic-v4.7.0.js',
      'CanvasDrawer/CanvasDrawer.js',
      'CanvasDrawer/CanvasDrawerFactory.js',

      'GraphViewElement/GraphViewElement.js',
      'GraphViewElement/iGraphViewNode.js',
      'GraphViewElement/iGraphViewNodeLabel.js',
      'GraphViewElement/iGraphViewEdge.js',
      'GraphViewElement/GraphViewNode.js',
      'GraphViewElement/GraphViewNodeImage.js',
      'GraphViewElement/GraphViewNodeLabel.js',
      'GraphViewElement/GraphViewEdge.js',

      'GraphMenu.js',
      'SelectGraphLayout/SelectGraphLayoutModel.js',
      'SelectGraphSkin/SelectGraphSkinModel.js',

      'GraphView/GraphViewEdgeFactory.js',
      'GraphView/GraphViewNodeFactory.js',
      'GraphView/GraphViewNodeLabelFactory.js',
      'GraphView/iGraphViewModel.js',
      'GraphView/iGraphView.js',
      'GraphView/GraphView.js',
      'GraphView/GraphViewFactory.js',
      'GraphView/GraphViewsPubSub.js',

      'GraphController/AddRemoveElementController.js',
      'GraphController/HistoryController.js',
      'GraphController/SelectElementController.js',
      'GraphController/ModelChangeController.js',
      'GraphController/MappingChangeController.js',
      'GraphController/ShowEditorController.js',
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

      'GraphElementEditor/GraphElementEditor.js'
    );
  }
}
