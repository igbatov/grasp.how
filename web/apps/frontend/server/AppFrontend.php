<?php

include_once("EmbGraph.php");
include_once(dirname(__FILE__)."/../../../../scripts/graphImageGenerator/GraphImageGenerator.php");
include_once(dirname(__FILE__)."/../../../../web/lib/server/NodeContentSnapBuilder.php");
include_once(dirname(__FILE__)."/../../../../web/lib/server/Snap.php");

class AppFrontend extends App{
  private $contentIdConverter;
  private $graphIdConverter;
  private $snapBuilder;

  function __construct(
      Config $c, Session $s, MultiTenantDB $db,
      Logger $logger, I18N $i18n, OAuthUser $oauth=null
  ) {
    parent::__construct($c, $s, $db, $logger, $i18n, $oauth);
    $this->contentIdConverter = new ContentIdConverter();
    $this->graphIdConverter = new GraphIdConverter($this->logger);
    $this->snapBuilder = new NodeContentSnapBuilder($db);
  }

  public function showView(){
    $vars = $this->getRoute();
    $action = $vars[0];

    // process action defined by url
    switch($action){
      case 'share_track':
        $urlArr=parse_url($_SERVER['REQUEST_URI']);
        parse_str($urlArr['query'], $output);
        $this->logger->log(var_export($output, true));
        $from = $this->db->escape($output['from']);
        $type = $this->db->escape($output['type']);
        $graph_id = $this->db->escape($output['graph_id']);
        $q = "INSERT INTO share_track SET `from` = '".$from."', `type` = '".$type."', `graph_id` = '".$graph_id."'";
        $this->db->exec(null, $q);
        break;

      case 'subscribe':
        $urlArr=parse_url($_SERVER['REQUEST_URI']);
        parse_str($urlArr['query'], $output);
        $this->logger->log(var_export($output, true));

        $email = $output['email'];
        $query = "INSERT INTO subscribe_email SET email = '".$this->db->escape($email)."', data = '".$this->db->escape(var_export($output, true))."'";
        $this->db->exec(null, $query);
        $msg = 'Email '.$email.' send form '.var_export($output, true);
        $this->sendMail("info@grasp.how", "igbatov@gmail.com", $msg, $msg);
        break;

      // generates javascript to insert /embed iframe
      case 'embed.js':
        $r = $this->getRequest();
        $snaps = $r['snaps'];

        $withFbShare = isset($r['withFbShare']) ? $r['withFbShare'] : null;
        if($withFbShare === NULL) $withFbShare = true;

        $editMapRibbon = isset($r['editMapRibbon']) ? $r['editMapRibbon'] : null;
        if($editMapRibbon === NULL) $editMapRibbon = true;

        // sanity check
        if(count($snaps)>50) throw new Exception('Too long params');

        include($this->getAppDir("template", false)."/embedjs.php");
        break;

      case 'show':
      case 'embed':
        // sanity check
        if(strlen($vars[1])>255) {
          exit('Too long snaps');
        }

        if (substr($_SERVER['REQUEST_URI'], -5) == '.html') {
          $authId = $vars[1];
          $hash = substr($vars[2], 0, -5);
          $rows = $this->getDB()->exec($authId, "SELECT * FROM snap_hash WHERE hash = :hash", ['hash'=>$hash]);
          if (empty($rows)) {
            exit('hash '.$hash.' not found');
          }
          $options = empty($rows[0]['settings']) ? [] : json_decode($rows[0]['settings'], true);
          if (!is_array($options)) {
            exit('Bad json in settings');
          }
          $local_graph_id = $rows[0]['local_graph_id'];
          $snapVars = [
            'graphId'=>$this->graphIdConverter->createGlobalGraphId($authId, $local_graph_id),
            'step'=>$rows[0]['step'],
            'ts'=>$rows[0]['ts'],
          ];
          $snap = new Snap($snapVars, $this->graphIdConverter, $this->db, $this->logger);

        } else {
          // assume we got vars in json
          $snapVars = json_decode(urldecode($vars[1]),true);
          if(!is_array($snapVars)) {
            exit('Bad JSON');
          }
          $options = isset($_REQUEST['p']) ? json_decode($_REQUEST['p'], true) : null;
          $snap = new Snap($snapVars, $this->graphIdConverter, $this->db, $this->logger);
          $hash = $snap->createHashBySnap($options);
          $authId = $snap->getAuthId();
        }

      /**
       * Cache to file and output, on next request nginx will find cache file and we will not be here
       */
        $service = new Graphs($this->db, $this->contentIdConverter, $this->graphIdConverter, $this->getLogger());
        $emb_graph = new EmbGraph($this->db, $this->contentIdConverter, $this->graphIdConverter, $service);

        $cacheDir = $this->getAppDir('embed_cache', false).'/'.$authId;
        if (!file_exists($cacheDir)) {
          mkdir($cacheDir, 0777, true);
        }
        $cachePath = $cacheDir."/".$hash.".html";

        $this->graphIdConverter->throwIfNotGlobal($snap->getGraphId());

        // create snapshot of node_contents
        $this->snapBuilder->createSnapshots($authId, null, $snap->getLocalGraphId(), $snap->getTs());

        // all variables that is used in template
        $template = [
          'withFbShare' => isset($options['withFbShare']) ? $options['withFbShare'] : true,
          'editMapRibbon' => isset($options['editMapRibbon']) ? $options['editMapRibbon'] : true,
          'url' => 'http://www.grasp.how/embed/'.$authId."/".$hash.".html",
          'graphsData' => $emb_graph->getGraphsData([$snapVars]),
          // just want to save original request for future possible usage
          'pageInfo' => ['hash_source'=>var_export($_SERVER['REQUEST_URI'], true)],
          'snap' => ['graphId'=>$snap->getGraphId(), 'step'=>$snap->getStep(), 'ts'=>$snap->getTs()]
        ];
        // Turn on output buffering
        ob_start();
        include($this->getAppDir("template", false)."/embed.php");
        //  Return the contents of the output buffer
        $htmlStr = ob_get_contents();
        // Clean (erase) the output buffer and turn off output buffering
        ob_end_clean();
        // Write final string to file
        file_put_contents($cachePath, $htmlStr);
        echo $htmlStr;
        return;
      break;

      case 'img':
        // if image exists, nginx will show it

        // if not - create it and show
        $graphHelper = new Graphs($this->db, $this->contentIdConverter, $this->graphIdConverter, $this->getLogger());
        $embGraph = new EmbGraph($this->db, $this->contentIdConverter, $this->graphIdConverter, $graphHelper);

        $helper = new Helper();
        $graphImageGenerator = new GraphImageGenerator($embGraph, $helper, $this->getLogger(), $this->config->getNodeJSBinary());
        $extensionFree = substr($vars[2],0, strrpos($vars[2], "."));
        $extension = substr($vars[2],strrpos($vars[2], ".")+1);

        if (!in_array($extension, ["svg","jpg"])) {
          exit ("only .svg or .jpg allowed got ".$extension);
        }

        $snap = $graphImageGenerator->filenameToSnap($extensionFree);
        $filepath = $graphImageGenerator->getImage($snap, $extension);
        if ($extension == 'svg') {
          $contentType = "image/svg+xml";
        } else {
          $contentType = "image/jpeg";
        }
        $this->showImage($filepath, $contentType);
        return;
        break;

      // input: svg text, output: jpeg
      case 'svg2jpeg':
        $image = new Imagick();
        $svg = $this->getRequest()['svg'];
        $svg = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'.$svg;
        $this->logger->log($svg);
        $image->readImageBlob($svg);
        $image->setImageFormat('jpeg');
        $image->setImageCompressionQuality(90);
        header( "Content-Type: image/jpeg" );
        echo $image;
      break;

      case 'setLang':
        $this->i18n->setLang($vars[1]);
        $referrer = isset($_SERVER['HTTP_REFERER']) ? $_SERVER['HTTP_REFERER'] : "/";
        $this->redirect($referrer);
        break;

      case 'slack':
        $thankYou = false;
        include($this->getAppDir("template", false)."/slack.php");
        break;

      case 'joinSlack':
        $url = 'https://grasphow.slack.com/api/users.admin.invite'.
        '?email=' . urlencode($_POST['email']).
        '&token=' . urlencode($this->config->get('slackToken'));
        $r = file_get_contents($url);
        $this->logger->log("slack registration answer", $r);
        $resp = json_decode($r, true);
        if ($resp && isset($resp["ok"]) && $resp["ok"]) {
          $thankYou = true;
          include($this->getAppDir("template", false)."/slack.php");
        } else if ($resp && isset($resp["ok"]) && !$resp["ok"] && $resp["error"] == "invalid_email") {
          $thankYou = false;
          $badEmail = true;
          include($this->getAppDir("template", false)."/slack.php");
        } else {
          exit("OOPS! Something go wrong :(");
        }
        break;

      default:
        include($this->getAppDir("template", false)."/index.php");
      break;
    }
  }

  public function requestToFilename($r)
  {

  }

  public function getAppDir($type="app_root", $isWeb = true){
    switch ($type) {
      case "img":
        return $this->getAppRoot($isWeb)."/client/img";
        break;
      default:
        return parent::getAppDir($type, $isWeb);
    }
  }
}
