<?php
if (!function_exists('http_response_code'))
{
  function http_response_code($newcode = NULL)
  {
    static $code = 200;
    if($newcode !== NULL)
    {
      header('X-PHP-Response-Code: '.$newcode, true, $newcode);
      if(!headers_sent())
        $code = $newcode;
    }
    return $code;
  }
}

// do not show errors
ini_set('display_errors', 0);

// path to this file
$path = dirname(__FILE__);

// init config
require_once ($path.'/'.'Config.php');
$c = new Config();

// set default log file
ini_set('error_log', $c->getDefaultPath('log')."/error_log.log");

error_reporting(E_ALL & ~E_DEPRECATED & ~E_STRICT);

//set cookies for all subdomains
$t = explode(".", $c->getWebDomainName());
$second_level_domain = count($t) > 1 ? $t[count($t)-2].".".$t[count($t)-1] : $t[0];
//ini_set('session.cookie_domain', ".".$second_level_domain);
//session_set_cookie_params(0, '/', $second_level_domain, false, false);

// after script finished, send html error 500 if some error happened (except parse errors)
function shutdown() {
  $er = error_get_last();

  // do not react on E_STRICT && E_DEPRECATED errors
  if($er['type'] == E_STRICT || $er['type'] == E_DEPRECATED) return;

  // if there is other errors, send http 500 error code
  if (!is_null($er)) http_response_code(500);

  // and log error to file
  error_log(print_r($er, true));
}
register_shutdown_function('shutdown');

/**
 * We use standard pear authentication package
 * http://pear.php.net/manual/en/package.authentication.auth.intro.php
 * http://www.peachpit.com/articles/article.aspx?p=711187&seqNum=4
 */
set_include_path(get_include_path() . PATH_SEPARATOR . $path.'/pear/pear/php');
require_once ('Log.php');
require_once ('Log/observer.php');
require_once ('Auth.php');

/**
 * Include all our classes
 */
require_once ($path.'/'.'I18N.php');
require_once ($path.'/'.'DB.php');
require_once ($path.'/'.'NestedDB.php');
require_once ($path.'/'.'ErrorHandler.php');
require_once ($path.'/'.'Logger.php');
require_once ($path.'/'.'Session.php');
require_once ($path.'/'.'App.php');
require_once ($path.'/'.'TestableApp.php');
require_once ($path.'/'.'ContentIdConverter.php');
require_once ($path.'/'.'GraphDiffCreator.php');
require_once ($path.'/'.'Graphs.php');
require_once ($path.'/'.'OAuthUser.php');
require_once ($path.'/'.'../../apps/frontend/server/AppFrontend.php');
require_once ($path.'/'.'../../apps/user_pkb/server/AppUserPkb.php');

// init pear auth module
class Auth_Log_Observer extends Log_observer {
  var $messages = array();
  function notify($event) {
    error_log(print_r($event, true));
  }
}

$options = array(
  'enableLogging' => false,
  'dsn' => 'mysql://'.$c->getDbConf()->login.':'.$c->getDbConf()->password.'@'.$c->getDbConf()->host.'/'.$c->getDbConf()->dbName
);

$a = new Auth('MDB2', $options, null, false);
$debugObserver = new Auth_Log_Observer(PEAR_LOG_INFO);
$a->attachLogObserver($debugObserver);

// set auth timeout
$timeout = 604800;
$a->setExpire($timeout);
$a->setIdle($timeout);
session_set_cookie_params($timeout);

// init session
$s = new Session($a);
// authorize user and start new session or start unauthorized session
$s->start();

// init helper modules
$db = new NestedDB($c->getDbConf());
$eh = new ErrorHandler();
$logger = new Logger($db, $eh, dirname(__FILE__)."/../../../logs", $s->getUsername());
$i18n = new I18N($s, $logger);

// include browser detector classes
include_once($c->getWebRootPath()."/lib/server/vendor/Sinergi/BrowserDetector/DetectorInterface.php");
foreach (glob($c->getWebRootPath()."/lib/server/vendor/Sinergi/BrowserDetector/*.php") as $filename) include_once($filename);
// include mobile detection
require_once($c->getWebRootPath()."/lib/server/vendor/Mobile_Detect.php");

$oauth = new OAuthUser($c, $logger);
