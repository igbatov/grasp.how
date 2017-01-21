<?php

include("TextDiff.php");
include("GRainQuerier.php");

/**
 * Controller - entry point for all requests
 * Class AppUserPkb
 */
class AppUserPkb extends App
{
  const HISTORY_CHUNK = 3; // number of graph in history chunk
  private $contentIdConverter;
  private $graphs;

  public function showView(){
    parent::showView();

    $this->contentIdConverter = new ContentIdConverter();
    $this->graphs = new Graphs($this->db, $this->contentIdConverter, $this->getLogger(), $this->getAuthId());

    $vars = $this->getRoute();
    $this->log('REQUEST ', $this->getRoute(), $this->getRequest());

    /**** SPECIAL ACTIONS ***/
    // send email to admin on signup
    if($vars[0] === 'signupSuccess'){
      // send email to me signalling that someone want to signup
      $this->sendMail("info@grasp.how", "igbatov@gmail.com", "someone want to signup", print_r($_REQUEST, true));

      // show signup success page
      include($this->getAppDir("template", false)."/signupSuccess.php");
      exit();

    // create new user: my.grasp.how/createNewUser/<login>/<password>/<admin secret>
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
      var_dump($this->graphs->removeGraph($vars[1]));
      exit();

    }elseif($vars[0] === 'cloneGraph'){
      if(!$this->getAuthId()) $this->redirect('/');

      $graph_id = $vars[1];
      $history_step = isset($vars[2]) ? $vars[2] : null;
      if(!$history_step) $history_step = $this->getGraphLastStep($graph_id);
      $new_graph_id = $this->graphs->cloneGraph($graph_id, $history_step, $this->getAuthId());
      $user_graph_ids = $this->getGraphIds($this->getAuthId());
      $this->graphs->changeGraphPosition($new_graph_id, 'leftGraphView', $user_graph_ids);
      $this->redirect('/');
    }

    /************** SET READ-ONLY MODE FOR SPECIAL CASES **********************/
    // choose the mode of access level based on URL
    if($vars[0] === 'showGraph'){
      $access_level = 'read';
      $showGraphId = $vars[1];
      $action = $vars[2];

    }else{
      $access_level = 'read&write';
      $showGraphId = null;
      $action = $vars[0];

    }

    $this->writeActions = array(
        'updateGraphName',
        'setGraphAttributes',
        'changeGraphPosition',
        'addGraphHistoryItem',
        'updateNodeMapping',
        'updateGraphElementContent'
    );

    // if user tries to update graph that not belongs to him, skip it
    if(in_array($action, $this->writeActions)){
      $r = $this->getRequest();
      if($action == 'updateGraphName') $graphId = $r['graphId'];
      if($action == 'setGraphAttributes') $graphId = $r['graphId'];
      if($action == 'changeGraphPosition') $graphId = $r['graphId'];
      if($action == 'addGraphHistoryItem') $graphId = $r['graphId'];
      if($action == 'updateNodeMapping') $graphId = $r['graphId'];
      if($action == 'updateGraphElementContent'){
        if(isset($r['nodeContentId'])) $graphId = $this->contentIdConverter->getGraphId($r['nodeContentId']);
        else if(isset($r['edgeContentId'])) $graphId = $this->contentIdConverter->getGraphId($r['edgeContentId']);
        else if(isset($r['graphId'])) $graphId = $r['graphId'];
      }
      if($action == 'removeGraph') $graphId = $r['graphId'];

      if(!$this->isUserOwnGraph($graphId))  $access_level = 'read';
    }

    if(isset($this->getRequest()['graphId']) && GraphDiffCreator::isDiffGraphId($this->getRequest()['graphId'])) $access_level = 'read';

    if(in_array($action, $this->writeActions) && $access_level == 'read') exit();

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
    /*************   END OF SET READ-ONLY MODE STAFF    ****************/

    // check that user browsing from supported device/browser
    /*
    $mobile_checker = new Mobile_Detect();
    $deviceType = ($mobile_checker->isMobile() ? ($mobile_checker->isTablet() ? 'tablet' : 'phone') : 'computer');
    $browser_checker = new \Sinergi\BrowserDetector\Browser();
    $os_checker = new \Sinergi\BrowserDetector\Os();
    if(
      !in_array($browser_checker->getName(), array(Sinergi\BrowserDetector\Browser::CHROME, Sinergi\BrowserDetector\Browser::OPERA))
      || $deviceType != 'computer'
      || $os_checker->getName() != \Sinergi\BrowserDetector\Os::WINDOWS
    ){
      include($this->getAppDir("template", false)."/browserUnsupported.php");
      exit();
    }
*/

    // process action defined by url
    switch($action){

      /* READ METHODS */
      case 'query_grain':
        // create text of R script for gRain
        $graph_id = $this->getRequest()['graphId'];

        // Note: GRain can han handle graph that actually consists from several independent, splittered subgraphs
        $graph = $this->getBayesGraph($graph_id);
        $probabilities = $this->getBayesProbabilities($graph_id, $graph);

        // check for errors
        $imperfect_nodes = $this->getImperfectNodes($graph_id, $graph, $probabilities);

        // if we have a non-empty class error, output all errors to client
        foreach($imperfect_nodes as $class) if(count($class) != 0){
          $this->log('query_grain: imperfect_nodes is not empty '
              .'graph = {"nodes":{localContentId:[alternative_id1, alternative_id2, ...], ...}, "edges":{edgeLocalContentId:[nodelocalContentId1, nodelocalContentId2], ..}} '.print_r($graph, true)
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

      /**
       * returns name, node types, edge types and graph attributes from table 'graph'
       */
      case 'getGraphsModelSettings':
        if($vars[0] === 'showGraph'){
          $graphs_settings = $this->getGraphs(array($showGraphId));
          $graphs_settings[$showGraphId]['isEditable'] = false;
        }else{
          if(isset($this->getRequest()['graphIds'])){
            $graph_ids = $this->getRequest()['graphIds'];
          }else{
            $graph_ids = $this->getGraphIds($this->getAuthId());
          }
          $graphs_settings = $this->getGraphs($graph_ids);
        }

        foreach($graphs_settings as $id=>$settings){
          if(!$this->isUserOwnGraph($id)) $graphs_settings[$id]['isEditable'] = false;
        }

        $this->showRawData(json_encode($graphs_settings));
        break;

      case 'getGraphNodeContent':
        $content_ids = $this->getRequest()['nodeContentIds'];
        $nodes = $this->graphs->getGraphNodeContent($content_ids);

        // for node from diff-graph substitute node text with diff text
        foreach($nodes as $content_id=>$node){
          // alternative text
          if(GraphDiffCreator::isDiffContentId($content_id)){
            $contentId = GraphDiffCreator::decodeContentId($content_id);
            foreach($node['alternatives'] as $alternative_id => $alternative){
              $nodes[$content_id]['alternatives'][$alternative_id]['text'] = GraphDiffCreator::getDiffText(
                  $this->db,
                  $contentId['graphId1'],
                  $contentId['localContentId1'],
                  $alternative_id,
                  $contentId['graphId2'],
                  $contentId['localContentId2'],
                  $alternative_id
              );
            }
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
        $nodes = $this->graphs->getNodeAttributes($r['nodes']);
        $edges = $this->graphs->getEdgeAttributes($r['edges']);
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
        $this->graphs->updateGraphName($r['graphId'], $r['name']);
        $this->showRawData('success');
        break;

      case 'setGraphAttributes':
        $graphId = $this->getRequest()['graphId'];
        $attributes = array();
        foreach($this->getRequest() as $key => $value){
          if($key != 'graphId') $attributes[$key] = $value;
        }
        $this->graphs->setGraphAttributes($graphId, $attributes);
        $this->showRawData('success');
        break;

      case 'changeGraphPosition':
        $graphId = $this->getRequest()['graphId'];
        $position = $this->getRequest()['position'];
        $user_graph_ids = $this->getGraphIds($this->getAuthId());
        $this->graphs->changeGraphPosition($graphId, $position, $user_graph_ids);
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

        // determine graph_id and local_content_id
        if(in_array($r['type'], array(
            'updateNodeText',
            'node_list_add_request',
            'node_list_remove_request',
            'node_list_update_request',
            'updateNodeAlternativesP',
            'updateNodeAttribute',
            'addIcon',
            'addAlternative',
            'removeAlternative',
            'clear_node_conditionalPs'
        ))){
          $graph_id = $this->contentIdConverter->getGraphId($r['nodeContentId']);
          $local_content_id = $this->contentIdConverter->getLocalContentId($r['nodeContentId']);
        }else if($r['type'] == 'updateEdgeAttribute'){
          $graph_id = $this->contentIdConverter->getGraphId($r['edgeContentId']);
          $local_content_id = $this->contentIdConverter->getLocalContentId($r['edgeContentId']);
        }else if($r['type'] == 'addEdge' || $r['type'] == 'addNode' || $r['type'] == 'updateNodesReliabilities' || $r['type'] == 'node_stickers_add_request' || $r['type'] == 'node_stickers_remove_request'){
          $graph_id = $r['graphId'];
          $local_content_id = null;
        }

        // check that graph_id owned by user
        if(!$this->isUserOwnGraph($graph_id)) return false;

        // if icon added copy it to users folder
        if($r['type'] == 'addIcon'){
          $content_id = $r['nodeContentId'];
          $tmp_path = $_FILES['files']['tmp_name'];
          $file_path = $this->getAppDir('uploads', false)."/".$this->getAuthId()."/".$content_id.".png";
          if(exif_imagetype($tmp_path) == IMAGETYPE_PNG){
            move_uploaded_file($tmp_path, $file_path);
          }else{
            imagepng(imagecreatefromstring(file_get_contents($tmp_path)), $file_path);
          }
        }

        $result = $this->graphs->updateGraphElementContent($graph_id, $local_content_id, $r);
        $this->showRawData($result);
        break;

      case 'createNewGraph':
        $r = $this->getRequest();
        $this->graphs->createNewGraph($this->getAuthId(), $r['name']);
        break;

      case 'copyGraph':
        $r = $this->getRequest();
        $this->graphs->copyGraph($this->getAuthId(), $r['name'], $r['graph_id']);
        break;

      case 'getGraphDiff':
        $r = $this->getRequest();
        $this->showRawData(json_encode($this->getGraphDiff($r['graphId'], $r['cloneId'])));
        break;

      case 'getGraphsCloneList':
        $clone_list = array();
        $graph_ids = $this->getGraphIds($this->getAuthId());

        foreach($graph_ids as $graph_id){
          $clone_list[$graph_id] = array('cloned_from'=>array(), 'cloned_to'=>array());

          // get cloned from graph name and username
          $q = "SELECT cloned_from_graph_id FROM graph WHERE id = '".$graph_id."'";
          $rows = $this->db->execute($q);
          if(!count($rows)) continue;

          $cloned_from_graph_id = $rows[0]['cloned_from_graph_id'];
          if(is_numeric($cloned_from_graph_id)){
            $q = "SELECT auth_id, graph FROM graph WHERE id = '".$cloned_from_graph_id."'";
            $cloned_from_graphname = json_decode($this->db->execute($q)[0]['graph'], true)['name'];
            $cloned_from_auth_id = $this->db->execute($q)[0]['auth_id'];
            $q = "SELECT username FROM auth WHERE id = '".$cloned_from_auth_id."'";
            $cloned_from_username = $this->db->execute($q)[0]['username'];
            $clone_list[$graph_id]['cloned_from'][$cloned_from_graph_id] = $cloned_from_username.": ".$cloned_from_graphname;
          }

          // now get list of cloned to graph name and username
          $q = "SELECT id, auth_id, graph FROM graph WHERE cloned_from_graph_id = '".$graph_id."'";
          $rows = $this->db->execute($q);
          foreach($rows as $row){
            $q = "SELECT username FROM auth WHERE id = '".$row['auth_id']."'";
            $username = $this->db->execute($q)[0]['username'];
            $clone_list[$graph_id]['cloned_to'][$row['id']] = $username.": ".json_decode($row['graph'], true)['name'];
          }
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
        $q = "SELECT * FROM source WHERE auth_id = '".$this->getAuthId()."' AND name LIKE '".$substring."'".(isset($r['source_type']) && strlen($r['source_type']) ? " AND source_type = '".$r['source_type']."'" : '');
        $this->log($q);
        $rows = $this->db->execute($q);
        $items = array();
        if(count($rows) > 30) $this->showRawData(json_encode(false));
        foreach($rows as $k=>$row){
          $row['order'] = levenshtein($row['name'], $r['substring']);
          $row['title'] = $row['name'];
          $row['source_id'] = $row['id'];
          unset($row['id']);
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

  protected function getGraphSettings($graph_ids){
    $s = array();
    foreach($graph_ids as $graph_id){
      if(GraphDiffCreator::isDiffGraphId($graph_id)){
        $t = GraphDiffCreator::decodeDiffGraphId($graph_id);
        $s[$graph_id] = GraphDiffCreator::getGraphSettings($this->db, $t['graphId1'], $t['graphId2']);
      }else{
        $s[$graph_id] = $this->graphs->getGraphSettings($graph_id);
      }
    }

    return $s;
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

  protected function createNewUser($login, $password){
    if(!parent::createNewUser($login, $password)) return false;

    $q = "SELECT id FROM auth WHERE username = '".$login."'";
    $rows = $this->db->execute($q);
    $new_user_id = $rows[0]['id'];

    // create directory for the user
    $new_user_dir = $this->getAppDir('uploads', false).'/'.$new_user_id;
    if(!file_exists($new_user_dir)){
      $success = mkdir($new_user_dir, 0777, true);
      if(!$success){
       $this->log('Cannot create directory '.$new_user_dir);
       return false;
      }
    }

    return $this->graphs->createNewGraph($new_user_id, 'newGraph');
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

  public function getGraphs($graph_ids){
    $s = array();
    foreach($graph_ids as $graph_id){
      if(GraphDiffCreator::isDiffGraphId($graph_id)){
        $graphId = GraphDiffCreator::decodeDiffGraphId($graph_id);
        $s[$graph_id] = GraphDiffCreator::getGraphModelSettings($this->db, $graphId['graphId1'], $graphId['graphId2']);
      }else{
        $s[$graph_id] = $this->graphs->getGraphProps($graph_id);
      }
    }
    return $s;
  }

  private function getGraphLastStep($graph_id){
    $query = "SELECT step FROM `graph_history` WHERE graph_id = '".$graph_id."' ORDER BY step DESC LIMIT 1";
    $rows = $this->db->execute($query);
    if(!$rows) $this->error("returned no rows on query: ".$query);
    return $rows[0]['step'];
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
          $step = $this->getGraphLastStep($graph_id);
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
     // 'Helpers.js',

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
      //'UIElements.js',

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
