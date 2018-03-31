<?php
include_once(__DIR__."/../../../lib/server/NodeContentSnapBuilder.php");
/**
 * This file is running by script/cron.php
 *
 * we can use here (all defined in cli.bootstrap.php)
 * - $db to access DB
 * - $eh to throwError
 */

/**
 * This script adds to node_content_history nodes that was updated the day before
 */
$snapBuilder = new NodeContentSnapBuilder($db);
$q = "SELECT id FROM auth";
$auths = $db->exec(null, $q);

foreach ($auths as $auth) {
  try {
    $snapBuilder->createSnapshots($auth['id'], ' -1 day');
  } catch (Throwable $e) {
    $logger->log($e->getMessage()." ".$e->getTraceAsString());
  }
}
