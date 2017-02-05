<?php
/**
 * Class App - general application class that must be inherited by concrete application located at web/apps/<appName>/server
 */
abstract class App
{
  protected $config;
  protected $session;
  protected $db;
  protected $logger;
  protected $i18n;
  protected $auth_id;
  protected $oauth;

  function __construct(Config $c, Session $s, DB $db, Logger $logger, I18N $i18n, OAuthUser $oauth=null) {
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

  protected function error($msg){
    $this->logger->error($msg);
  }

  protected function dbLog($type,$msg,$data=null){
    $this->logger->dbLog($type,$msg,$data);
  }

  protected function log(){
    call_user_func_array(array($this->logger, "log"), func_get_args());
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

  protected function getRoute(){
    $url=strtok($_SERVER["REQUEST_URI"],'?');
    return explode('/',substr($url, 1));
  }

  protected function getRequest(){
    if(substr(phpversion(), 0, 3) == '5.2') return json_decode(stripslashes(urldecode($_REQUEST['data'])), true); // ugly fix for old php
    return isset($_REQUEST['data']) ? json_decode($_REQUEST['data'], true) : null;
  }

  protected function showView(){
    // get auth_id
    $this->auth_id = $this->getUserId($this->session->getUsername());

    // get request params
    $vars = $this->getRoute();

    // log request to db
    if($this->config && $this->config->isDebugOn()) $this->dbLog('request', $_SERVER["REQUEST_URI"], var_export($_REQUEST, true));

    // logout action
    switch($vars[0]){
      case 'logout':
        $this->session->logout();
    }
  }

  protected function getUserId($username){
    $rows = $this->db->execute("SELECT id FROM auth WHERE username = '".$username."'");
    return count($rows)>0 ? $rows[0]['id'] : null;
  }

  protected function getAuthId(){
    return $this->auth_id;
  }

  protected function showRawData($data){
    echo $data;
    $this->postAccessLog();
    exit();
  }

  protected function showImage($file, $type="image/jpeg"){
    header('Content-Type: '.$type);
    header('Content-Length: ' . filesize($file));
    readfile($file);
    $this->postAccessLog();
    exit();
  }

  protected function createNewUser($login, $password){
    return $this->session->createNewUser($login, $password);
  }

  protected function updateUserPassword($login, $password){
    return $this->session->updateUserPassword($login, $password);
  }

  protected function updateUserInfo(array $info){
    $username = $this->session->getUsername();
    if(!$username) return false;

    $query = "UPDATE auth SET info = '".json_encode($info)."' WHERE username = '".$username."'";
    $this->db->execute($query);
  }

  protected function getUserInfo(){
    $username = $this->session->getUsername();
    if(!$username) return false;

    $query = "SELECT info FROM auth WHERE username = '".$username."'";
    $rows = $this->db->execute($query);
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

  protected function redirect($url, $permanent = false)
  {
    header('Location: ' . $url, true, $permanent ? 301 : 302);
    $this->postAccessLog();
    exit();
  }


}
