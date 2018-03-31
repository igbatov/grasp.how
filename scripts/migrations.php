#!/usr/bin/php
<?php
/**
 * If no args given to script, then
 * 1. check 'committed at' of current revision (=revision our working directory is on)
 * 2. check 'committed at' for every file in /migrations directory
 * 3. check what migrations are rolled up according to migration_status table
 * 4. roll up or down until migrations in migration_status table is in correspondence with current revision
 *
 * If -m=MigrationFileName -d=up is given then roll up only this file
 * If -m=MigrationFileName -d=down is given then roll down only this file
 *
 * Example:
 * php scripts/migrations.php -m=D20170423MultiTenant -d=up
 */
$rootpath = dirname(dirname(__FILE__));
include($rootpath."/web/lib/server/cli.bootstrap.php");
require_once ($rootpath."/web/lib/server/Migration.php");
$roller = new MigrationRoller($db, $rootpath.'/migrations', $c, $logger);

// include all migration classes
$files = array_slice(scandir($rootpath.'/migrations/'), 2);
foreach ($files as $file) {
   include_once ($rootpath.'/migrations/'.$file);
}

// parse cli args
parse_str(implode('&', array_slice($argv, 1)), $keys);

$authIds = [null];
$authIds = array_merge($authIds, getChannelAuthIds($c, $db, $c->get('channel')));

foreach ($authIds as $authId) {
  // check that migration_status table exists, if not - create it
  $roller->checkMigrationStatusTable($authId);

  if(isset($keys['-m']) && isset($keys['-d'])){
    // sanity check
    $classname = explode('.php',$keys['-m'])[0]; // remove '.php' if any
    if(!in_array($keys['-d'], ['up','down'])) {
      throw new Exception('-d can be only "up" or "down", but '.$keys['-d'].' given.');
    }
    // roll migration
    $roller->roll($authId, $classname, $keys['-d']);
  }else{
    if($roller->hasNullMigrations($authId)){
      $roller->mylog('Cannot autoroll until there are exist migration_status rows with null migration_timestamp column. authId='.$authId.' Exiting...');
      return;
    }

    $revdate = $roller->getRevisionDate();
    echo 'current revdate = '.$revdate."\n";
    $migrationDates = [];
    foreach ($files as $file){
      $timestamp = $roller->getFileRevisionDate($file);
      $classname = substr($file,0,-4);
      $migrationDates[$classname] = $timestamp;
    }

    $roller->rollDownTo($authId, $revdate);
    $roller->rollUpTo($authId, $revdate, $migrationDates);
  }
}

/**
 * Every user belongs to alpha, beta or gamma.
 * This method retrieves all users of specific channel.
 * @param Config $c
 * @param MultiTenantDB $db
 * @param string $channelName
 * @return array
 */
function getChannelAuthIds(Config $c, MultiTenantDB $db, $channelName="alpha")
{
  $ids = [];
  if($db->isColumnExists($c->getDbConf()->dbName,'auth','channel')) {
    $query = "SELECT id FROM auth WHERE channel = '".$channelName."'";
  } else {
    return [];
  }
  $rows = $db->exec(null, $query);
  foreach ($rows as $row) {
    $ids[] = $row['id'];
  }
  return $ids;
}
