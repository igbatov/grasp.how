<!doctype html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/main.css">

  <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
  <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."main.js" ?>"></script>
  <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."googleanalytics.js" ?>"></script>
</head>
<body>
<div class="mainMenuContainer">
  <div id="logo">(grasp|how)</div>
  <ul class="mainMenu floatLeft leftMenuMargin">
    <li><a href="#purpose"><?php echo $this->i18n->__('Goal') ?></a></li>
    <li><a href="#method"><?php echo $this->i18n->__('Method') ?></a></li>
    <li><a href="#contacts"><?php echo $this->i18n->__('Contacts') ?></a></li>
  </ul>
  <ul class="mainMenu floatRight rightMenuMargin">
    <li>
      <a href="/setLang/en"><?php echo $this->i18n->getLang() == 'ru' ? 'Ru' : 'En'?></a>
      <ul>
        <li><a href="/setLang/en">En</a></li>
        <li><a href="/setLang/ru">Ru</a></li>
      </ul>
    </li>
    <li><a href="http://my.grasp.how"><?php echo $this->i18n->__('Create my own map') ?></a></li>
  </ul>
  <div style="margin-right: 150px;"></div>
</div>
</body>
</html>