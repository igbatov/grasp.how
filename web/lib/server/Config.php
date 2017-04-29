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

    if(!$config_json){
      error_log(__FILE__."\n"."Cannot parse Config.json");
      return false;
    }

    $c = new dbConf();
    $c->host = $config_json["db"]["host"];
    $c->dbName = $config_json["db"]["dbName"];
    $c->login = $config_json["db"]["login"];
    $c->password = $config_json["db"]["password"];

    return $c;
  }

  public function get($key){
    $string = file_get_contents($this->getWebRootPath()."/../Config.json");
    $config_json = json_decode($string, true);
    if(!isset($config_json[$key])) throw new Exception("Cannot find key ".$key." in Config.json");
    return $config_json[$key];
  }

  public function getAdminSecret(){
    $string = file_get_contents($this->getWebRootPath()."/../Config.json");
    $config_json = json_decode($string, true);
    return $config_json['admin_secret'];
  }

  public function getRscriptPath(){
    $string = file_get_contents($this->getWebRootPath()."/../Config.json");
    $config_json = json_decode($string, true);
    return $config_json['RscriptPath'];
  }

  public function getWebDomainURL(){
    return (isset($_SERVER['HTTPS']) ? 'https://' : 'http://' ) . $this->getWebDomainName();
  }

  public function getWebDomainName(){
    return isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
  }

  public function getWebProtocol(){
    return isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
  }

  public function getDefaultPath($type){
    switch ($type) {
      case "js":
        return $this->getWebDomainURL()."/lib/client/";
        break;
      case "css":
        return $this->getWebDomainURL()."/css/";
        break;
      case "log":
        return $this->getWebRootPath()."/../logs";
        break;
      case "tmp":
        return $this->getWebRootPath()."/../tmp";
        break;
      default:
        return false;
    }
  }

  public function getWebRootPath(){
    return dirname(__FILE__)."/../../../web";
  }

  public function isDebugOn(){
    $string = file_get_contents($this->getWebRootPath()."/../Config.json");
    $config_json = json_decode($string, true);
    return isset($config_json['is_debug_on']) ? $config_json['is_debug_on'] : false;
  }
}
