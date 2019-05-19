<?php
/**
 * Class App - general application class that must be inherited by concrete application located at web/apps/<appName>/server
 */
abstract class App
{
  protected $config;
  public $session;
  protected $db;
  protected $logger;
  protected $i18n;
  protected $auth_id;
  protected $oauth;

  function __construct(Config $c, Session $s, MultiTenantDB $db, Logger $logger, I18N $i18n, OAuthUser $oauth=null) {
    $this->config = $c;
    $this->session = $s;
    $this->db = $db;
    $this->logger = $logger;
    $this->i18n = $i18n;
    $this->i18n->setI18NDir($this->getAppDir('i18n', false));
    $this->auth_id = null;
    $this->oauth = $oauth;
  }

  /**
   * Save value in session
   * @param $key
   * @param $value
   */
  public function set($key, $value){
    $this->session->set($key, $value);
  }

  /**
   * Get value from session (previously saved with ->set())
   * @param $key
   * @return mixed
   */
  public function get($key){
    return $this->session->get($key);
  }

  public function getLogger(){
    return $this->logger;
  }

  public function postAccessLog(){
    $this->logger->postAccessLog();
  }

  public function preAccessLog(){
    $this->logger->preAccessLog();
  }

  public function getAppRoot($isWeb){
    $reflector = new ReflectionClass($this);
    $fn = str_replace("\\", "/", $reflector->getFileName());

    $app_root = dirname(dirname($fn));
    if($isWeb) $app_root = $this->config->getWebDomainURL() .'/'. substr ($app_root, strlen($_SERVER['DOCUMENT_ROOT'])+1);
    return $app_root;
  }

  public function getAppDir($type="app_root", $isWeb = true){
    // In convention that application class (= implementation of this abstract class) is always located in web/apps/<appName>/server/
    $app_root = $this->getAppRoot($isWeb);
    switch ($type) {
      case "app_root":
          return $app_root;
          break;
      case "js":
          return $app_root."/client/js";
          break;
      case "css":
          return $app_root."/client/css";
          break;
      case "template":
          return $app_root."/client/template";
          break;
      case "uploads":
          return $app_root."/../../../uploads";
          break;
      case "embed_cache":
          return $app_root."/../../embed";
          break;
      case "img":
          return $app_root."/client/img";
          break;
      case "i18n":
        return $app_root."/client/i18n";
        break;
      case "log":
        return $app_root."/../../../logs";
        break;
      case "lib":
          return $this->config->getWebRootPath()."/lib/server";
          break;
      default:
        return false;
    }
  }

  public function getDefaultDir($type){
    return $this->config->getDefaultPath($type);
  }

  public function getRoute(){
    $url=strtok($_SERVER["REQUEST_URI"],'?');
    return explode('/',substr($url, 1));
  }

  public function getRequest(){
    if(substr(phpversion(), 0, 3) == '5.2') return json_decode(stripslashes(urldecode($_REQUEST['data'])), true); // ugly fix for old php
    return isset($_REQUEST['data']) ? json_decode($_REQUEST['data'], true) : null;
  }

  public function showView(){
    // get auth_id
    $this->auth_id = $this->getUserId($this->session->getUsername());

    // get request params
    $vars = $this->getRoute();

    switch($vars[0]){
      case 'logout':
        $this->session->logout();
        break;
      case 'logger':
        $this->logger->warning(var_export($_GET, true));
        exit();
        break;
    }

    if ($this->session->isAuthRequest() && isset($_REQUEST['fromUrl'])) {
      $this->redirect($_REQUEST['fromUrl']);
    }
  }

  public function getUserId($username){
    $rows = $this->db->exec(null, "SELECT id FROM auth WHERE username = '".$username."'");
    return count($rows)>0 ? $rows[0]['id'] : null;
  }

  public function getAuthId(){
    if ($this->auth_id) {
      return $this->auth_id;
    } else {
      $this->auth_id = $this->getUserId($this->session->getUsername());
      return $this->auth_id;
    }
  }

  public function showRawData($data=""){
    $this->logger->infoKV('response', $data);
    echo $data;
    return true;
  }

  protected function showImage($file, $type="image/jpeg"){
    header('Content-Type: '.$type);
    header('Content-Length: ' . filesize($file));
    readfile($file);
    $this->postAccessLog();
    return;
  }

  public function removeUser($login){
    $user_id = $this->getUserId($login);
    if(!$user_id){
      throw new Exception("User with login ".$login." not found");
    }
    $this->session->removeUser($login);
    $this->db->exec(null, 'DROP database '.$this->db->getDBName($user_id));
  }

  protected function createNewUser($login, $password){
    // if user already exists, return false;
    if($this->getUserId($login) !== null){
      throw new Exception('User with login '.$login.' already exist! Do nothing...');
    }
    if(true !== $this->session->createNewUser($login, $password)){
      throw new Exception('Cannot create user with login '.$login.'.');
    }

    $auth_id = $this->getUserId($login);
    $dbname = $this->db->getDBName($auth_id);

    $this->db->copyDB($this->config->get('db_template'), $dbname);

    // fill in migrations table with all current migrations
    $this->db->copyTableContents($this->config->get('db')['dbName'], $dbname, "migration_status");
    return $auth_id;
  }

  protected function updateUserPassword($login, $password){
    $s = $this->session->updateUserPassword($login, $password);
    $this->logger->log('User id = '.$this->getAuthId().', login = '.$this->getUsername(),' updated password');
    return $s;
  }

  protected function updateUserInfo(array $info){
    $username = $this->session->getUsername();
    if(!$username) return false;

    $query = "UPDATE auth SET info = '".json_encode($info)."' WHERE username = '".$username."'";
    $this->db->exec(null, $query);
  }

  public function getUsername(){
    return $this->session->getUsername();
  }

  protected function getUserInfo(){
    $username = $this->session->getUsername();
    if(!$username) return false;

    $query = "SELECT info FROM auth WHERE username = '".$username."'";
    $rows = $this->db->exec(null, $query);
    return count($rows) ? json_decode($rows[0], true) : false;
  }

  protected function getAdminSecret(){
    return $this->config->getAdminSecret();
  }

  //example from http://phpclub.ru/detail/article/mail#part_7
  public static function sendMail( $from, $to, $subj, $text, $files = array())
  {
    $un        = strtoupper(uniqid(time()));
    $head      = "From: ".$from."\n";
    $head     .= "To: ".$to."\n";
    //  $head     .= "Subject: ".$subj."\n";
    $head     .= "X-Mailer: PHPMail Tool\n";
    $head     .= "Reply-To: ".$from."\n";
    $head     .= "Mime-Version: 1.0\n";
    $head     .= "Content-Type:multipart/mixed;";
    $head     .= "boundary=\"----------".$un."\"\n\n";
    $zag       = "------------".$un."\nContent-Type:text/html; charset=utf-8\n";
    $zag      .= "Content-Transfer-Encoding: 8bit\n\n".$text."\n\n";
    foreach($files as $file_key=>$file)
    {
      $filename = is_int($file_key) ? basename($file) : $file_key;
      $f         = fopen($file,"rb");
      $zag      .= "------------".$un."\n";
      $zag      .= "Content-Type: application/octet-stream;";
      $zag      .= "name=\"".$filename."\"\n";
      $zag      .= "Content-Transfer-Encoding:base64\n";
      $zag      .= "Content-Disposition:attachment;";
      $zag      .= "filename=\"".$filename."\"\n\n";
      $zag      .= chunk_split(base64_encode(fread($f,filesize($file))))."\n";
    }

    return mail("$to", '=?UTF-8?B?'.base64_encode($subj).'?=', $zag, $head);
  }

  protected function getUrl()
  {
    return (isset($_SERVER['HTTPS']) ? "https" : "http") . "://$_SERVER[HTTP_HOST]$_SERVER[REQUEST_URI]";
  }

  protected function redirect($url, $permanent = false)
  {
    header('Location: ' . $url, true, $permanent ? 301 : 302);
    $this->postAccessLog();
    return true;
  }

  public function getDB(){
    return $this->db;
  }

  public function switchDB($dbname){
    $this->getDB()->switchDB($dbname);
    $this->session->switchDB(
        $this->config->getDbConf()->login,
        $this->config->getDbConf()->password,
        $this->config->getDbConf()->host,
        $dbname
    );
  }
}
