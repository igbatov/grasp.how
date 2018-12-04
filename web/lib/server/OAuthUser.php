<?php

/**
 * Class OAuth
 * Get user info by oauth provider type ($type) and code it is generated for us ($code)
 * Based on http://ruseller.com/lessons.php?rub=37&id=1668
 *
 * Integration and usage in your code is simple:
 * 0. Get client_id and secret from every auth provider
 *            https://developers.google.com/identity/protocols/OAuth2WebServer
 *            https://vk.com/apps?act=manage
 *            https://developers.facebook.com/docs/facebook-login/manually-build-a-login-flow
 * 0. put it in Config.json:
 *   "OAuthUser":{
        "vk":{
          "client_id": "xxx",
          "client_secret": "xxx",
          "response_type": "code",
          "scope": "email",
          "fields": "uid,first_name,last_name,screen_name,sex,bdate,photo_big,domain",
          "auth_url":"http://oauth.vk.com/authorize",
          "token_url":"https://oauth.vk.com/access_token",
          "info_url":"https://api.vk.com/method/users.get"
        },
          "facebook":{
          "client_id": "xxx",
          "client_secret": "xxx",
          "response_type": "code",
          "scope": "email,public_profile",
          "fields": "id,email,name,first_name,last_name,gender,middle_name,name_format,link",
          "auth_url":"https://www.facebook.com/v2.8/dialog/oauth",
          "token_url":"https://graph.facebook.com/v2.8/oauth/access_token",
          "info_url":"https://graph.facebook.com/v2.8/me"
        },
        "google":{
          "client_id": "xxx",
          "client_secret": "xxx",
          "response_type": "code",
          "scope": "email,public_profile",
          "fields": "id,email,name,first_name,last_name,gender,middle_name,name_format,link",
          "auth_url":"https://www.facebook.com/v2.8/dialog/oauth",
          "token_url":"https://graph.facebook.com/v2.8/oauth/access_token",
          "info_url":"https://graph.facebook.com/v2.8/me"
        }
      }

 * 0. $auth = new OAuthUser($config, $logger);
 * 1. put $oauth->getOauthProviders() links in a login page
 * 2. add controller for <your domain>/oauth/<oauth provider type>?code=xxx
 * 3. and in this controller put
 *           $info = $this->oauth->oauth($type, $code);
 *           // search user with this email, if not found create him
 *           if($this->getUserId($info['email']) === null){
 *             $this->createNewUser($info['email'], bin2hex(openssl_random_pseudo_bytes(10)));
 *           }
 *           // authorize him
 *           $this->session->setAuth($info['email']);
 *           // update his info
 *           $this->updateUserInfo(array('type'=>$type, 'info'=>$info));
 *           // redirect to homepage
 *           $this->redirect("/");
 */
class OAuthUser{
  protected $config;
  protected $logger;

  public function __construct(Config $c, Logger $logger) {
    $this->config = $c;
    $this->logger = $logger;
  }

  public function oauth($type, $code){
    $token = $this->getOauthToken($type, $code);
    $info = $this->getUserInfo($type, $token);
    $this->logger->log('got user info',$info);
    return $info;
  }

  public function getOauthProviders($state){
    $providers = array();
    foreach($this->config->get('OAuthUser') as $type => $o){
      $url = $o['auth_url'];
      $params = array(
          "client_id"=>$o['client_id'],
          "redirect_uri"=>$this->config->getWebDomainURL()."/oauth/".$type,
          "response_type"=>$o['response_type'],
          'scope'=>$o['scope'],
          'state'=>$state
      );
      $uri = $url . '?' . urldecode(http_build_query($params));
      $providers[$type] = array(
        'uri'=>$uri,
        'name'=>$type.'.com'
      );
    }
    return $providers;
  }

  protected function getUserInfo($type, $token){
    $config = $this->config->get('OAuthUser')[$type];
    if($token){
      switch ($type){
        case 'vk':
          $params = array(
              'uids'         => $token['user_id'],
              'fields'       => $config['fields'],
              'access_token' => $token['access_token'],
              'v' => $config['v'],
          );
          break;

        case 'facebook':
          $params = array(
              'fields'       => $config['fields'],
              'access_token' => $token['access_token']
          );
          break;

        case 'google':
          $params = array(
              'access_token' => $token['access_token']
          );
          break;
      }
      $uri = $config['info_url'] . '?' . urldecode(http_build_query($params));
      $this->logger->log($uri);
      $r = file_get_contents($uri);
      $this->logger->log('response: ',$r);
      $userInfo = json_decode($r, true);

      $email = null;
      switch ($type){
        case 'vk':
          $userInfo = $userInfo['response'] && $userInfo['response'][0] ? $userInfo['response'][0] : $userInfo;
          $email = $token && isset($token['email']) ? $token['email'] : null;
          $userInfo['email'] = $email;
          if (!isset($userInfo['domain'])) {
            $userInfo['link'] = 'http://vk.com/'.$userInfo['domain'];
          } else {
            $userInfo['link'] = "";
            $this->logger->log("Error in Auth::getUserInfo, cannot get vk domain send ",$uri, 'got', $r);
          }
          break;

        case 'facebook':
          $email = $userInfo['email'];
          break;

        case 'google':
          foreach($userInfo['emails'] as $email){
            if($email['type'] == 'account'){
              $email = $email['value'];
              break;
            }
          }
          $userInfo['link'] =  $userInfo['url'];

          break;
      }

      if(!$email){
        $this->logger->log("Error in Auth::getUserInfo, send ",$uri, 'got', $r);
        exit('cannot get user email');
      }

      return array('email'=>$email, 'token'=>$token, 'userInfo'=>$userInfo);
    }
    return false;
  }

  protected function getOauthToken($type, $code){

    $oc = $this->config->get('OAuthUser')[$type];

    $params = array(
        'client_id' => $oc['client_id'],
        'client_secret' => $oc['client_secret'],
        'code' => $code,
        'redirect_uri' => $this->config->getWebDomainURL()."/oauth/".$type,
        'grant_type' => 'authorization_code'
    );
    $uri = $oc['token_url'] . '?' . urldecode(http_build_query($params));
    $this->logger->log(__FILE__."\n".$uri);
    if($type == 'google'){
      $curl = curl_init();
      curl_setopt($curl, CURLOPT_URL, $oc['token_url']);
      curl_setopt($curl, CURLOPT_POST, 1);
      curl_setopt($curl, CURLOPT_POSTFIELDS, urldecode(http_build_query($params)));
      curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
      curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, false);
      $r = curl_exec($curl);
      curl_close($curl);
    }else{
      $r = file_get_contents($uri);
    }

    $this->logger->log(__FILE__."\n got ".$r);
    $token = null;
    if($type == 'vk'){
      $token = json_decode($r, true);
    }elseif($type == 'facebook'){
      parse_str($r, $token);
      reset($token);
      $token = json_decode(key($token), true);
    }if($type == 'google'){
      $token = json_decode($r, true);
    }

    $this->logger->log('response', $token);
    if(!isset($token['access_token'])){
      $this->logger->log('OAuth error: cannot get access_token, got', $token);
      return false;
    }
    return $token;
  }

}
