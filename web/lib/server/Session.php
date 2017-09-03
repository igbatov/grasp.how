<?php
class Session{
  private $auth;
  function __construct(Auth $auth) {
    $this->auth = $auth;
  }

  /**
   * This function tries to start authorized session.
   * If authorized session for this browser does not exist (e.g. user was logged out)
   * it tries to get auth credentials from $_POST and signin based on $_POST['username'] and $_POST['password']
   * If signin was successful then start new authorized session.
   * Else $this->auth->checkAuth() return false
   */
  public function start(){
    $this->auth->start();
  }

  /**
   * Check if we are in request for authorization
   * @return bool
   */
  public function isAuthRequest(){
    return isset($_POST['username']) && isset($_POST['password']);
  }

  /**
   * Set session variable
   * @param $key
   * @param $value
   */
  public function set($key, $value){
    $_SESSION[$key] = $value;
  }

  public function destroy($key){
    unset($_SESSION[$key]);
  }

  /**
   * Retrieve session variable
   * @param $key
   * @return mixed
   */
  public function get($key){
    return isset($_SESSION[$key]) ? $_SESSION[$key] : null;
  }

  /**
   * Return true if session is authorized, else otherwise
   * @return bool
   */
  public function checkAuth(){
    return $this->auth->checkAuth();
  }

  /**
   * Set a specific user to be marked as logged in
   * @param $username
   */
  public function setAuth($username){
    return $this->auth->setAuth($username);
  }

  public function logout(){
    $this->auth->logout();
  }

  /**
   * If session is authorized return username
   * Else return null
   * @return string
   */
  public function getUsername(){
    return $this->auth->checkAuth() ? $this->auth->getUsername() : null;
  }

  public function getLoginFormVars(){
    return array(
      "method"=>"post",
      "action"=>"index.php",
      "fields"=>array(
        "username"=>array("type"=>"text"),
        "password"=>array("type"=>"password")
      )
    );
  }

  public function createNewUser($login, $password){
    return $this->auth->addUser($login, $password);
  }

  public function removeUser($login){
    return $this->auth->removeUser($login);
  }

  public function updateUserPassword($login, $password){
    return $this->auth->changePassword($login, $password);
  }

  public function switchDB($login, $password, $host, $dbname){
    $this->auth->storage_options['dsn'] = 'mysql://'.$login.':'.$password.'@'.$host.'/'.$dbname;
    if(is_object($this->auth->storage)){
      $this->auth->storage->_connect($this->auth->storage_options['dsn']);
    }
  }
}