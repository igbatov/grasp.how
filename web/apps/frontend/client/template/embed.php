<?php
  $cloneUrl = 'http://my.grasp.how/cloneGraph/'.$snaps[0]['graphId'].'/'.$snaps[0]['step'].'/'.$snaps[0]['ts'];
?>
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!--  Customize snippet with https://developers.facebook.com/tools/debug/sharing  -->
    <meta property="og:url"           content="<?php echo $url ?>" />
    <meta property="og:type"          content="website" />
    <meta property="og:title"         content="<?php echo $graphsData[$graph_ids[0]]['name']; ?>" />
    <meta property="og:description"   content="Look at rationale behind '<?php echo $graphsData[$graph_ids[0]]['name']; ?>'" />
    <meta property="og:image"         content="http://www.grasp.how/img/graph_shots/<?php echo $snaps[0]['graphId'].'_'.$snaps[0]['step'].'_'.$snaps[0]['ts']; ?>.jpg" />
    <meta property="og:image:width"   content="1280" />
    <meta property="og:image:height"  content="960" />

    <title><?php echo $graphsData[$graph_ids[0]]['name']; ?></title>

    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/embed.css">

    <!-- fork ribbon -->
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/gh-fork-ribbon.css">
    <!--[if lt IE 9]>
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/gh-fork-ribbon.ie.css">
    <![endif]-->
    <!-- end fork ribbon -->

    <!-- general js -->
    <script src="<?php echo $this->getDefaultDir('js'); ?>md5.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Chart.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>xor4096.min.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Helpers.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Ajax.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>UIElements.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/iListener.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Event.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Mediator.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Publisher.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>Mediator/Subscriber.js"></script>
    <script src="<?php echo $this->getDefaultDir('js'); ?>I18n.js"></script>

    <!-- app specific js -->
    <script>
      <?php
        /** @var I18N $i18n */
        echo 'GRASP.TRANSLATIONS = '.json_encode($this->i18n->showAllTranslations()).';';
        echo 'GRASP.LANGUAGE = "'.$this->i18n->getLang().'";';
        /** show fbShareButton or not */
        echo 'withFbShare = '.($withFbShare ? 'true' : 'false');
      ?>
    </script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."googleanalytics.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."d3.v3.min.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."node-content-view.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."graph.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."graph-actions.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."main.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/embed/"."share_track.js" ?>"></script>
  </head>
  <body>
  <?php if($withFbShare) include($this->getAppDir('template', false).'/_facebook_sdk.php'); ?>

  <?php if ($editMapRibbon) : ?>
  <a id="clone-ribbon" class="github-fork-ribbon right-top" target="_blank" href='<?php echo $cloneUrl; ?>' title="edit map on grasp.how" data-graph_id="<?php echo $graph_ids[0]; ?>">Edit me on grasp.how</a>
  <?php endif ?>
  <div id="graphMenuContainer"><ul id="graphMenu"></ul></div>

  <div id="graphContainer"></div>

  <?php if($withFbShare): ?>
  <div style="float: right; margin-right: 7%;"  id="fb-share-btn-wrap" data-graph_id="<?php echo $graph_ids[0]; ?>">
    <div id="fb-share-btn" class="fb-share-button" data-href="<?php echo $url; ?>" data-layout="button_count" data-size="small" data-mobile-iframe="true"><a class="fb-xfbml-parse-ignore" target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=<?php echo urlencode($url) ?>">Share</a></div>
  </div>
  <?php endif ?>
  <script>
    GRASP.GRAPHS_DATA = <?php echo $graphsData ? json_encode($graphsData) : ""; ?>
  </script>
  <?php if (!$editMapRibbon) : ?>
    <div class="editMapButton"><a target="_blank" href='<?php echo $cloneUrl; ?>' class="btn">Edit map</a></div>
  <?php endif ?>
  <div id="pageInfo" style="display: none;">
    <?php echo json_encode($pageInfo); ?>
  </div>
  </body>
</html>
