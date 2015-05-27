<?php
class dbConf{
  public $host;
  public $dbName;
  public $login;
  public $password;
}

class Config{
  public function getDbConf(){
    $string = file_get_contents($this->getWebRootPath()."/../Config.json");
    $config_json = json_decode($string, true);

    $c = new dbConf();
    // if we are on a public server
    if((bool)preg_match("/^((.*\.)||^)mindsplot\.com$/i", $this->getWebDomainName())){
      $c->host = $config_json["public"]["host"];
      $c->dbName = $config_json["public"]["dbName"];
      $c->login = $config_json["public"]["login"];
      $c->password = $config_json["public"]["password"];
    }
    // if we are in local/development environment
    else{
      $c->host = $config_json["local"]["host"];
      $c->dbName = $config_json["local"]["dbName"];
      $c->login = $config_json["local"]["login"];
      $c->password = $config_json["local"]["password"];
    }

    return $c;
  }

  public function getWebDomainURL(){
    return (isset($_SERVER['HTTPS']) ? 'https://' : 'http://' ) . $this->getWebDomainName() .'/';
  }

  public function getWebDomainName(){
    return isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost';
  }

  public function getDefaultPath($type){
    switch ($type) {
      case "js":
        return $this->getWebDomainURL()."lib/client/";
        break;
      case "css":
        return $this->getWebDomainURL()."css/";
        break;
      case "log":
        return $this->getWebRootPath()."/../logs";
        break;
      default:
        return false;
    }
  }

  public function getWebRootPath(){
    return $_SERVER['DOCUMENT_ROOT'];
  }
}
