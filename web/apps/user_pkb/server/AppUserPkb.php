<?php
class AppUserPkb extends App
{
  const HISTORY_CHUNK = 3; // number of graph in history chunk

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
      $this->sendMail("info@mindsplot.com", "igbatov@gmail.com", "someone want to signup", print_r($_REQUEST, true));

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
        $content_ids = $this->getRequest();
        $node_texts = array();
        foreach($content_ids as $content_id){
          $tmp = explode("-", $content_id);
          $graph_id = $tmp[0];
          $node_content_id = $tmp[1];
          $node_rows = $this->db->execute("SELECT text FROM node_content WHERE graph_id = '".$graph_id."' AND node_content_id = '".$node_content_id."'");
          $node_texts[$content_id] = $node_rows[0]['text'];
        }
        $this->showRawData(json_encode($node_texts));
        break;

      case 'getIcon':
        $r = $this->getRequest();
        // get auth_id of this content_id
        $tmp = explode("-", $r);
        $graph_id = $tmp[0];
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
          $tmp = explode("-", $content_id);
          $graph_id = $tmp[0];
          $node_content_id = $tmp[1];
          $node_rows = $this->db->execute("SELECT '".$content_id."' as nodeContentId, type, label, reliability, importance, has_icon FROM node_content WHERE graph_id = '".$graph_id."' AND node_content_id = '".$node_content_id."'");
          $node_row = $node_rows[0];
          $node_row['iconSrc'] = $node_row['has_icon'] == 1 ? 'getIcon/?data="'.$content_id.'"' : null;
          unset($node_row['has_icon']);
          $nodes[$content_id] = $node_row;
        }

        foreach($r['edges'] as $content_id){
          $tmp = explode("-", $content_id);
          $graph_id = $tmp[0];
          $edge_content_id = $tmp[1];
          $query = "SELECT '".$content_id."' as edgeContentId, type, label FROM edge_content WHERE graph_id = '".$graph_id."' AND edge_content_id = '".$edge_content_id."'";
          $edge_rows = $this->db->execute($query);
          $edge_row = $edge_rows[0];
          $edges[$content_id] = $edge_row;
        }

        $graphs_elements = array('nodes'=>$nodes, 'edges'=>$edges);
        $this->showRawData(json_encode($graphs_elements));
        break;

      case 'getGraphsHistoryTimeline':
        $timeline = array();
        $rows = $this->getGraphs($this->getGraphIds($this->getAuthId()));
        foreach($rows as $graph_id => $settings){
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
      case 'addGraphHistoryItem':
        if($access_level == 'read') exit();

        $r = $this->getRequest();
        $query = 'INSERT INTO graph_history SET graph_id = "'.$r['graphId'].'", step = "'.$r['step'].'", timestamp = "'.$r['timestamp'].'", elements = "'.$this->db->escape(json_encode($r['elements'])).'", node_mapping = "'.$this->db->escape(json_encode($r['node_mapping'])).'"';
        if($this->db->execute($query)){
          $this->showRawData('success');
        }else{
          $this->showRawData('error');
        }
        break;

      case 'updateNodeMapping':
        if($access_level == 'read') exit();

        $r = $this->getRequest();
        $query = 'UPDATE graph_history SET node_mapping = "'.$this->db->escape(json_encode($r['node_mapping'])).'" WHERE graph_id = "'.$r['graphId'].'" AND step = "'.$r['step'].'"';
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
          $tmp = explode("-", $r['nodeContentId']);
          $graph_id = $tmp[0];
          $node_content_id = $tmp[1];
        }else if($r['type'] == 'updateEdgeAttribute'){
          $tmp = explode("-", $r['edgeContentId']);
          $graph_id = $tmp[0];
          $edge_content_id = $tmp[1];
        }else if($r['type'] == 'addEdge' || $r['type'] == 'addNode'){
          $graph_id = $r['graphId'];
        }

        $this->isUserOwnGraph($graph_id);

        if($r['type'] == 'updateNodeText'){
          $query = "UPDATE node_content SET text = '".$this->db->escape($r['text'])."' WHERE graph_id = '".$graph_id."' AND node_content_id = '".$node_content_id."'";
          $this->db->execute($query);
        }else if($r['type'] == 'updateNodeAttribute'){
          $query = "UPDATE node_content SET `".$r['nodeAttribute']['name']."` = '".$this->db->escape($r['nodeAttribute']['value'])."' WHERE graph_id = '".$graph_id."' AND node_content_id = '".$node_content_id."'";
          $this->db->execute($query);
        }else if($r['type'] == 'updateEdgeAttribute'){
          $query = "UPDATE edge_content SET `".$r['edgeAttribute']['name']."` = '".$this->db->escape($r['edgeAttribute']['value'])."' WHERE graph_id = '".$graph_id."' AND edge_content_id = '".$edge_content_id."'";
          $this->db->execute($query);
        }else if($r['type'] == 'addEdge'){
          $this->db->startTransaction();
            try{
              $query = "SELECT MAX(edge_content_id) as max_id FROM edge_content WHERE `graph_id` = '".$this->db->escape($graph_id)."'";
              $rows = $this->db->execute($query);
              $edge_content_id = (int)$rows[0]['max_id'] + 1;
              $query = "INSERT INTO edge_content SET `graph_id` = '".$this->db->escape($graph_id)."', `edge_content_id` = '".$this->db->escape($edge_content_id)."', `type` = '".$this->db->escape($r['edge']['type'])."', `label` = '".$this->db->escape($r['edge']['label'])."', created_at = NOW()";
              $this->db->execute($query);
            }catch (Exception $e) {
              $this->db->rollbackTransaction();
              $this->error("Error during transaction: ".mysql_error().". Transaction rollbacked.");
            }
          $this->db->commitTransaction();
          $this->showRawData($graph_id."-".$edge_content_id);

        }else if($r['type'] == 'addNode'){
          $this->db->startTransaction();
          try{
            $query = "SELECT MAX(node_content_id) as max_id FROM node_content WHERE `graph_id` = '".$this->db->escape($graph_id)."'";
            $rows = $this->db->execute($query);
            $node_content_id = $rows[0]['max_id'] + 1;
            $query = "INSERT INTO node_content SET `graph_id` = '".$this->db->escape($graph_id)."', `node_content_id` = '".$this->db->escape($node_content_id)."', `type` = '".$this->db->escape($r['node']['type'])."', `label` = '".$this->db->escape($r['node']['label'])."', `text` = '".$this->db->escape($r['node']['text'])."', `reliability` = '".(is_numeric($r['node']['reliability']) ? $r['node']['reliability'] : 0)."', `importance` = '".(is_numeric($r['node']['importance']) ? $r['node']['importance'] : 0)."', created_at = NOW()";
            $this->db->execute($query);
          }catch (Exception $e) {
            $this->db->rollbackTransaction();
            $this->error("Error during transaction: ".mysql_error().". Transaction rollbacked.");
          }
          $this->db->commitTransaction();
          $this->showRawData($graph_id."-".$node_content_id);

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
          $query = "UPDATE node_content SET has_icon = 1 WHERE graph_id = '".$graph_id."' AND node_content_id = '".$node_content_id."'";
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

      case 'removeGraph':
        $r = $this->getRequest();
        $this->removeGraph($this->getAuthId(), $r['graph_id']);
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

  protected function createNewUser($login, $password){
    if(!parent::createNewUser($login, $password)) return false;

    $q = "SELECT id FROM auth WHERE username = '".$login."'";
    $rows = $this->db->execute($q);
    $new_user_id = $rows[0]['id'];

    return $this->createNewGraph($new_user_id, 'newGraph');
  }

  private function createNewGraph($auth_id, $name){
    $graph = '{"name":"'.$name.'","isEditable":true,"edgeTypes":["link","in_favour_of","contrary_to"],"nodeTypes":["fact","research","theory","hypothesis","illustration","theory_problem", "question", "to_read", "best_known_practice"],"nodeDefaultType":"text","edgeDefaultType":"link"}';
    $q = "INSERT INTO graph SET graph = '".$graph."', auth_id = '".$auth_id."'";
    $graph_id = $this->db->execute($q);

    $elements = '{"nodes":{"1":{"id":1,"nodeContentId":"'.$graph_id.'-1","isRoot":true}},"edges":{}}';
    $q = "INSERT INTO graph_history SET graph_id = '".$graph_id."', step = '1', timestamp = unix_timestamp(NOW()), elements = '".$elements."'";
    $this->db->execute($q);

    $settings = '{"skin":"basicSkin","layout":"basicLayout","position":"not to be shown"}';
    $q = "INSERT INTO graph_settings SET graph_id = '".$graph_id."', settings = '".$settings."'";
    $this->db->execute($q);

    $q = "INSERT INTO node_content SET graph_id = '".$graph_id."', node_content_id = 1, 	type = 'text',	label = 'root', `reliability` = 0, `importance` = 0, text = '', has_icon = 0, created_at = NOW()";
    $this->db->execute($q);

    return true;
  }

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
        $content_id = explode("-", $node['nodeContentId']);
        $node['nodeContentId'] = $new_graph_id."-".$content_id[1];
        $nodes[$k] = $node;
      }
      foreach($elements['edges'] as $k => $edge){
        $content_id = explode("-", $edge['edgeContentId']);
        $edge['edgeContentId'] = $new_graph_id."-".$content_id[1];
        $edges[$k] = $edge;
      }
      $elements = json_encode(array("nodes"=>$nodes, "edges"=>$edges), JSON_FORCE_OBJECT);
      $q = "INSERT INTO graph_history SET graph_id = '".$new_graph_id."', step = '".$row['step']."', timestamp = '".$row['timestamp']."', elements = '".$elements."'";
      $this->db->execute($q);
    }

    $q = "INSERT INTO graph_settings (graph_id, settings) SELECT '".$new_graph_id."', settings FROM graph_settings WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);

    $q = "INSERT INTO node_content (graph_id, node_content_id, 	type,	label, reliability, importance, text, has_icon, updated_at, created_at) SELECT '".$new_graph_id."', node_content_id,	type,	label, reliability, importance, text, has_icon, NOW(), NOW() FROM node_content WHERE graph_id = '".$graph_id."'";
    $this->db->execute($q);

    $q = "INSERT INTO edge_content (graph_id, edge_content_id, 	type,	label, updated_at, created_at) SELECT '".$new_graph_id."', edge_content_id,	type,	label, NOW(), NOW() FROM edge_content WHERE graph_id = '".$graph_id."'";
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
        $graphs_history[] = array('graphId'=>$graph_id, 'step'=>$row['step'], 'timestamp'=>$row['timestamp'], 'elements'=>json_decode($row['elements'], true), 'node_mapping'=>json_decode($row['node_mapping'], true));
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
      'GraphModel/GraphModelTree.js',
      'GraphModel/GraphModelTreeFactory.js',
      'GraphModel/GraphModelsPubSub.js',

      'ViewManager.js',

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

      'SelectGraphPosition.js',
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
      'GraphController/FishEyeController.js',
      'GraphController/GraphControllerPubSub.js',

      'GraphNodeMappings/GraphNodeMappingsPubSub.js',
      'GraphNodeMappings/GraphNodeMappingTreeNode.js',
      'GraphNodeMappings/iGraphNodeMappingTreeModel.js',
      'GraphNodeMappings/GraphNodeMappingForceDirected.js',
      'GraphNodeMappings/iGraphNodeMappingForceDirectedModel.js',
      'GraphNodeMappings/GraphNodeMappingTree.js',
      //'GraphNodeMappings/iMapping.js',
      'GraphNodeMappings/GraphFishEye.js',

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
