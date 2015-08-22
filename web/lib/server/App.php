<?php
/**
 * Class App - general application class that must be inherited by concrete application located at web/apps/<appName>/server
 */
abstract class App
{
  protected $config;
  protected $session;
  protected $db;
  protected $eh;
  protected $logger;
  protected $auth_id;

  function __construct(Config $c, Session $s, DB $db, ErrorHandler $eh) {
    $this->config = $c;
    $this->session = $s;
    $this->db = $db;
    $this->eh = $eh;
    $this->auth_id = null;
  }

  protected function error($msg){
    $this->eh->throwError($msg);
    exit();
  }

  protected function log($msg){
    error_log($msg);
  }

  public function getAppRoot($isWeb){
    $reflector = new ReflectionClass($this);
    $fn = str_replace("\\", "/", $reflector->getFileName());

    $app_root = dirname(dirname($fn));
    if($isWeb) $app_root = $this->config->getWebDomainURL() . substr ($app_root, strlen($_SERVER['DOCUMENT_ROOT'])+1);
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
    return json_decode($_REQUEST['data'], true);
  }

  protected function showView(){
    // get auth_id
    $rows = $this->db->execute("SELECT id FROM auth WHERE username = '".$this->session->getUsername()."'");
    if(count($rows)>0) $this->auth_id = $rows[0]['id'];

    // get request params
    $vars = $this->getRoute();

    // logout action
    switch($vars[0]){
      case 'logout':
        $this->session->logout();
    }
  }

  protected function getAuthId(){
    return $this->auth_id;
  }

  protected function showRawData($data){
    echo $data;
    exit();
  }

  protected function showImage($file){
    header('Content-Type: image/jpeg');
    header('Content-Length: ' . filesize($file));
    readfile($file);
    exit();
  }

  protected function createNewUser($login, $password){
    return $this->session->createNewUser($login, $password);
  }

  protected function updateUserPassword($login, $password){
    return $this->session->updateUserPassword($login, $password);
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
}
