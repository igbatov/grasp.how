#!/usr/bin/php
<?php
/**
 * Backup DB in /backups
 */
echo date('Y-m-d H:i:s').' ';
$rootpath = dirname(dirname(__FILE__));
include($rootpath."/web/lib/server/cli.bootstrap.php");

$c = new Config();
$dbconf = $c->getDbConf();

// array of databases to dump
$dbnames = [$dbconf->dbName];
$q = "SELECT id FROM auth";
$auths = $db->exec(null, $q);
foreach ($auths as $auth) {
  $dbnames[] = $c->get('userDBPrefix').$row['id'];
}

foreach ($dbnames as $dbname) {
  $command = 'mysqldump -u '.$dbconf->login.' -p'.$dbconf->password.' '.$dbname.' > '.$rootpath.'/backups/'.$dbname.'.sql';
  echo $command."\n";
  var_dump(shell_exec($command));
}

$command = '/usr/sbin/logrotate -f '.$rootpath.'/scripts/logrotate.conf';
echo $command."\n";
var_dump(shell_exec($command));

// external script to copy backup file somewhere
foreach ($dbnames as $dbname) {
  $command = '/root/google/upload.php '.$rootpath.'/backups/'.$dbname.'.sql-'.date('Y-m-d').'.gz';
  echo $command."\n";
  var_dump(shell_exec($command));
}