<?php

class I18N{
  protected $session;
  protected $logger;
  protected $i18n_dir;
  protected $translation; // array of translations from english to current selected language

  const LANG_EN = 'en';
  const LANG_RU = 'ru';

  function __construct(Session $s, Logger $logger) {
    $this->session = $s;
    $this->logger = $logger;
  }

  /**
   * Set directory with translations files
   * @param $d
   */
  public function setI18NDir($d){
    $this->i18n_dir = $d;
  }

  public function getI18NDir(){
    return $this->i18n_dir;
  }

  /**
   * @param $lang - ru, en
   * @return bool
   */
  public function setLang($lang)
  {
    if(!in_array($lang, array(I18N::LANG_RU, I18N::LANG_EN))){
      $this->logger->log('Error in setLang: '.$lang.' is unknown type of language');
      return false;
    }
    $this->session->set('language', $lang);

    return true;
  }

  public function getLang()
  {
    return $this->session->get('language') ? $this->session->get('language') : I18N::LANG_EN;
  }

  /**
   * Internationalization function
   * @param $str
   */
  public function __($str)
  {
    if($this->getLang() == I18N::LANG_EN) return $str;
    else{
      if($this->translation == null){
        $file = file_get_contents($this->getI18NDir()."/".$this->getLang().".json");
        $this->translation = json_decode($file, true);
      }
      return $this->translation[$str];
    }
  }
}