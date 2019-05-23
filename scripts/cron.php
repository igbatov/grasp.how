#!/usr/bin/php
<?php
/**
 * Run all apps/<appname>/server/cron.[minute,hourly,daily,monthly].php
 */

$rootpath = dirname(dirname(__FILE__));
include($rootpath."/web/lib/server/cli.bootstrap.php");
include($rootpath."/web/lib/server/App.php");

if(!in_array($argv[1], array('minute','hourly','daily','monthly'))) {
  exit('wrong args');
}
$type = $argv[1];

/**
 * Include cron.* script from every app
 */
foreach(scandir($rootpath."/web/apps") as $app_dir){
  if($app_dir == '.' || $app_dir == '..') continue;
  foreach(scandir($rootpath."/web/apps/".$app_dir.'/server/') as $script){
    if(substr($script,0,strlen('cron.'.$type)) == 'cron.'.$type) {
      include($rootpath."/web/apps/".$app_dir.'/server/'.$script);
    }
  }
}

/**
 * Run general tasks here
 */

if($type == 'daily'){
  // clear old rows from request_log
  $q = 'DELETE FROM request_log WHERE created_at < "'.date('Y-m-d H:i:s', strtotime(' -7 day')).'" ';
  $db->exec(null, $q);

  // clear old files from /tmp
  cleanTmp($rootpath);

  // send daily stat report
  sendStat($db);
}

function sendStat($db) {
  $text = "";
  $q = "SELECT * FROM auth";
  $auths = $db->exec(null, $q);
  $yesterday = date( 'Y-m-d', time() - 60 * 60 * 24);

  // Shares
  $text .= "Yesterday shares:<BR>";
  foreach ($auths as $auth) {
      $names = getUserSharedGraphNames($db, $auth['id'], $yesterday);
      if ($names) {
        $text .= $auth['username'].":<BR>".implode("<BR>", $names)."<BR><BR>";
      }
  }

  // Activity
  $text .= "<BR>Yesterday activity:<BR>";
  $rows = $db->exec(null, "SELECT * FROM activity_stat WHERE `date`='".$yesterday."'");
  foreach ($rows as $row) {
    $text .= $row['username'].' - '.$row['cnt']."<BR>";
  }

  // send mail
  App::sendMail("igbatov@grasp.how", 'igbatov@gmail.com', 'Activity stat', $text);
}

function getUserSharedGraphNames($db, $authId, $day) {
    $names = [];

    $q = 'SELECT * FROM snap_hash WHERE created_at LIKE "'.$day.'%"';
    $rows = $db->exec($authId, $q);
    $ids = [];
    foreach ($rows as $row) {
      $ids[] = $row['local_graph_id'];
    }
    if (empty($ids)) {
      return [];
    }
    $rows = $db->exec($authId, 'SELECT id, graph FROM graph WHERE id IN ('.implode(',', $ids).')');
    foreach ($rows as $row) {
      $set = json_decode($row['graph'], true);
      $names[] = $row['id']." - ".$set['name'];
    }

    return $names;
}

function cleanRequestLog($db) {
  $q = 'DELETE FROM request_log WHERE created_at < "'.date('Y-m-d H:i:s', strtotime(' -7 day')).'" ';
  $db->exec(null, $q);
}

function cleanTmp($rootpath) {
  /*** cycle through all files in the directory ***/
  foreach (glob($rootpath."/tmp/*") as $file) {
    /*** if file is 24 hours (86400 seconds) old then delete it ***/
    if(time() - filectime($file) > 86400){
      unlink($file);
    }
  }
}
