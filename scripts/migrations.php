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
 */
$rootpath = dirname(dirname(__FILE__));
include($rootpath."/web/lib/server/cli.bootstrap.php");
require_once ($rootpath."/web/lib/server/Migration.php");
$roller = new MigrationRoller($db, $rootpath.'/migrations');

// check that migration_status table exists, if not - create it
$roller->checkMigrationStatusTable();

// include all migration classes
$files = array_slice(scandir($rootpath.'/migrations/'), 2);
foreach ($files as $file) {
   include_once ($rootpath.'/migrations/'.$file);
}

// parse cli args
parse_str(implode('&', array_slice($argv, 1)), $keys);


if(isset($keys['-m']) && isset($keys['-d'])){
  $roller->roll($keys['-m'], $keys['-d']);
}else{
  if($roller->hasNullMigrations()){
    $roller->mylog('Cannot autoroll until there are exist migration_status rows with null migration_timestamp column. Exiting...');
    return;
  }

  $revdate = $roller->getRevisionDate();
  $migrationDates = [];
  foreach ($files as $file){
    $timestamp = $roller->getFileRevisionDate($file);
    if(isset($migrationDates[$timestamp])){
      $roller->mylog($file.' and '.$migrationDates[$timestamp].' has the same commit timestamp! exiting...');
      exit();
    }
    $migrationDates[$timestamp] = $file;
  }
  $roller->rollDownTo($revdate);
  $roller->rollUpTo($revdate, $migrationDates);
}

