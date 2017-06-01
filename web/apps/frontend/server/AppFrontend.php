<?php

include("EmbGraph.php");

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
        //var_dump($r);
        $graphIds = $r['graphIds'];
        $uniqId = $r['uniqId'];

        $withFbShare = $r['withFbShare'];
        if($withFbShare === NULL) $withFbShare = true;

        $editMapRibbon = $r['editMapRibbon'];
        if($editMapRibbon === NULL) $editMapRibbon = true;

        // sanity check
        if(count($graphIds)>50 || strlen($uniqId)>255) throw new Exception('Too long params');

        include($this->getAppDir("template", false)."/embedjs.php");
        break;

      case 'show':
      case 'embed':
        // sanity check
        if(strlen($vars[1])>255) exit('Too many graph_ids');

        $graph_ids = json_decode($vars[1],true);
        if(!is_array($graph_ids)) exit('Bad JSON');

        $options = json_decode($_REQUEST['p'], true);
        $withFbShare = $options['withFbShare'] === NULL ? true : $options['withFbShare'];
        $editMapRibbon = $options['editMapRibbon'] === NULL ? true : $options['editMapRibbon'];

        foreach($graph_ids as $graph_id) $this->graphIdConverter->throwIfNowGlobal($graph_id);

        $graphs = new Graphs($this->db, $this->contentIdConverter, $this->graphIdConverter, $this->getLogger());
        $emb_graph = new EmbGraph($this->db, $this->contentIdConverter, $this->graphIdConverter, $graphs);
        $graph = $emb_graph->getGraphsData($graph_ids);
        //var_dump($graph); exit();
        $url = 'http://www.grasp.how/show/['.$graph_ids[0].']';
        include($this->getAppDir("template", false)."/embed.php");
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
