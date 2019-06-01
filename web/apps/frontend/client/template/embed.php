<?php
  $cloneUrl = 'http://my.grasp.how/cloneGraph/'.$template['snap']['graphId'].'/'.$template['snap']['step'].'/'.$template['snap']['ts'];
?>
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!--  Customize snippet with https://developers.facebook.com/tools/debug/sharing  -->
    <meta property="og:url"           content="<?php echo $template['url'] ?>" />
    <meta property="og:type"          content="website" />
    <meta property="og:title"         content="<?php echo $template['graphsData'][$template['snap']['graphId']]['name']; ?>" />
    <meta property="og:description"   content="Look at rationale behind '<?php echo $template['graphsData'][$template['snap']['graphId']]['name']; ?>'" />
    <meta property="og:image"         content="http://www.grasp.how/img/graph_shots/<?php echo $template['snap']['graphId'].'_'.$template['snap']['step'].'_'.$template['snap']['ts']; ?>.jpg" />
    <meta property="og:image:width"   content="1280" />
    <meta property="og:image:height"  content="960" />

    <title><?php echo $template['graphsData'][$template['snap']['graphId']]['name']; ?></title>

    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/embed.css?v=<?php echo $this->getRevision(); ?>">

    <!-- fork ribbon -->
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/gh-fork-ribbon.css?v=<?php echo $this->getRevision(); ?>">
    <!--[if lt IE 9]>
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/gh-fork-ribbon.ie.css?v=<?php echo $this->getRevision(); ?>">
    <![endif]-->
    <!-- end fork ribbon -->

    <!-- general js -->
    <script src="<?php echo $this->getDefaultDir('js'); ?>md5.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Chart.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>xor4096.min.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Helpers.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Ajax.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>UIElements.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/iListener.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Event.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Mediator.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Publisher.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Subscriber.js?v=<?php echo $this->getRevision(); ?>"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>I18n.js?v=<?php echo $this->getRevision(); ?>"></script>

    <!-- app specific js -->
    <script>
      <?php
        /** @var I18N $i18n */
        echo 'GRASP.TRANSLATIONS = '.json_encode($this->i18n->showAllTranslations()).';';
        echo 'GRASP.LANGUAGE = "'.$this->i18n->getLang().'";';
        /** show fbShareButton or not */
        echo 'withFbShare = '.($template['withFbShare'] ? 'true' : 'false');
      ?>
    </script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."googleanalytics.js" ?>?v=<?php echo $this->getRevision(); ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."d3.v3.min.js" ?>?v=<?php echo $this->getRevision(); ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."node-content-view.js" ?>?v=<?php echo $this->getRevision(); ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."graph.js" ?>?v=<?php echo $this->getRevision(); ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."graph-actions.js" ?>?v=<?php echo $this->getRevision(); ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."main.js" ?>?v=<?php echo $this->getRevision(); ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."share_track.js" ?>?v=<?php echo $this->getRevision(); ?>"></script>
  </head>
  <body>
  <?php if($template['withFbShare']) include($this->getAppDir('template', false).'/_facebook_sdk.php'); ?>

  <?php if ($template['editMapRibbon']) : ?>
  <a id="clone-ribbon" class="github-fork-ribbon right-top" target="_blank" href='<?php echo $cloneUrl; ?>' title="edit map on grasp.how" data-graph_id="<?php echo $template['snap']['graphId']; ?>">Edit me on grasp.how</a>
  <?php endif ?>
  <div id="graphMenuContainer"><ul id="graphMenu"></ul></div>

  <div id="graphContainer"></div>

  <div class="footer">
      <div class="p1"></div>
      <div class="p2"></div>
      <div class="p3">
        <?php if (!$template['editMapRibbon']) : ?>
          <a target="_blank" href='<?php echo $cloneUrl; ?>' class="btn editMapButton">Edit map</a>
          <?php endif ?>
      </div>
      <div class="p4">
        <?php if (!!$template['graphsData'][$template['snap']['graphId']]['attributes']['discussionChannel']) : ?>
            <div class="discussionChannel">
              <?php
              $ch = $template['graphsData'][$template['snap']['graphId']]['attributes']['discussionChannel'];
              if(substr($ch, 0, 4) !== 'http'){
                $ch = 'http://'.$ch;
              }
              $parsedCh = parse_url($ch);
              ?>
                Discuss at <a href="<?php echo $ch ?>" target="_blank"><?php echo $parsedCh['host']; ?></a>
            </div>
        <?php endif ?>
      </div>
      <div class="p5">
        <?php if($template['withFbShare']): ?>
            <div
                    id="fb-share-btn"
                    class="fb-share-button"
                    data-href="<?php echo $template['url']; ?>"
                    data-graph_id="<?php echo $template['snap']['graphId']; ?>"
                    data-layout="button_count" data-size="small" data-mobile-iframe="true">
                <a
                        class="fb-xfbml-parse-ignore"
                        target="_blank"
                        href="https://www.facebook.com/sharer/sharer.php?u=<?php echo urlencode($template['url']) ?>">
                    Share
                </a>
            </div>
        <?php endif ?>
      </div>
  </div>

  <script>
    GRASP.GRAPHS_DATA = <?php echo $template['graphsData'] ? json_encode($template['graphsData']) : ""; ?>
  </script>

  <div id="pageInfo" style="display: none;">
    <?php echo json_encode($template['pageInfo']); ?>
  </div>

  </body>
</html>
