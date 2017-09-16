<?php

include("EmbGraph.php");
$p = dirname(__FILE__)."/../../../../scripts/graphImageGenerator/GraphImageGenerator.php";
include($p);

class AppFrontend extends App{
  private $contentIdConverter;
  private $graphIdConverter;
  function __construct(
      Config $c, Session $s, MultiTenantDB $db,
      Logger $logger, I18N $i18n, OAuthUser $oauth=null
  ) {
    parent::__construct($c, $s, $db, $logger, $i18n, $oauth);
    $this->contentIdConverter = new ContentIdConverter();
    $this->graphIdConverter = new GraphIdConverter($this->logger);
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
        $hash_source = var_export($_SERVER['REQUEST_URI'], true);
        $hash = md5($hash_source);
        $cachePath = $this->getAppDir('embed_cache', false)."/".$hash.".html";

        // comment this to turn cache off
        if(file_exists($cachePath)) {
          echo file_get_contents($cachePath);
          return;
        }

      /**
       * If there is no cache - make it and output
       */
        // sanity check
        if(strlen($vars[1])>255) exit('Too many snaps');

        $snaps = json_decode(urldecode($vars[1]),true);
        if(!is_array($snaps)) exit('Bad JSON');

        $options = isset($_REQUEST['p']) ? json_decode($_REQUEST['p'], true) : null;
        $withFbShare = isset($options['withFbShare']) ? $options['withFbShare'] : true;
        $editMapRibbon = isset($options['editMapRibbon']) ? $options['editMapRibbon'] : true;

        $graph_ids = [];
        foreach($snaps as $snap) {
          $this->graphIdConverter->throwIfNotGlobal($snap['graphId']);
          $graph_ids[] = $snap['graphId'];
        }

        $service = new Graphs($this->db, $this->contentIdConverter, $this->graphIdConverter, $this->getLogger());
        $emb_graph = new EmbGraph($this->db, $this->contentIdConverter, $this->graphIdConverter, $service);
        $graphsData = $emb_graph->getGraphsData($snaps);
        $url = 'http://www.grasp.how/show/'.$vars[1].'';

        // just want to save original request for future possible usage
        $pageInfo = [
            'hash_source'=>$hash_source
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
        $graphImageGenerator = new GraphImageGenerator($embGraph, $helper);
        $extensionFree = substr($vars[2],0, strrpos($vars[2], "."));

        $snap = $graphImageGenerator->filenameToSnap($extensionFree);
        $filepath = $graphImageGenerator->getImage($snap);
        $this->showImage($filepath);
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
