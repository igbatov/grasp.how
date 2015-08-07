<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/reset.css">
    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/main.css">

    <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."d3.v3.min.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."graph.js" ?>"></script>
  </head>
  <body>
  <div id="mainMenuContainer">
    <div id="logo">
      GRASP.HOW<br>
      <div class="snippet">полная и обоснованная картина мира</div>
    </div>
    <ul id="mainMenu" >
      <li><a href="#purpose">ЦЕЛЬ</a></li>
      <li><a href="#method">МЕТОД</a></li>
      <li><a href="#contacts">КОНТАКТЫ</a></li>
      <li><a href="http://my.mindsplot.com">ВХОД</a></li>
    </ul>
  </div>

  <div id="graphMenuContainer"><ul id="graphMenu"></ul></div>
  <div id="graphContainer"></div>
  <div id="purpose" class="description">
    <h1>Цель проекта</h1>
    <?php  include($this->getAppDir('template', false).'/_aim2.php'); ?>
  </div>
  <div id="method" class="description">
    <h1>Метод</h1>
    <p>Заключается в том чтобы разделить все утверждения которые вам предлагаются в тексте на следующие категории</p>
    <ul>
      <li>факт</li>
      <li>исследование</li>
      <li>теория</li>
      <li>гипотеза</li>
      <li>иллюстрация</li>
      <li>проблема теории</li>
      <li>вопрос</li>
      <li>дальнейшее чтение</li>
      <li>лучшие практики</li>
    </ul>
    <p>
      Далее теориям и гипотезам нужно выставить важность - насколько вы считаете они вообще стоят внимания.
      Может быть с вашей точки зрения автор уделяет им слишком много внимания, учитывая другие насущные проблемы.
      Далее исследованиям, фактам и лучшим практикам нужно присвоить не только важность но и достоверность.
      Достоверность показывает насколько можно доверять указанному утверждению, насколько оно проверено.
      Достоверность может определяься, например, на основе авторитетности журнала или автора.
      Наконец, связать теории и гипотезы с относящимися к ним фактами, исследованиями, иллюстрациями, проблемами, вопросами, лучшими практиками и материалами для дальнейшего чтения.
    </p>
    <?php  //include($this->getAppDir('template', false).'/_example1.php'); ?>
  </div>
  <div id="contacts" class="description">
    <h1>Контакты</h1>
    <div id="social">
      <a target="_blank" href="https://www.google.com/+IgorBatov"><img src="<?php echo $this->getAppDir('img'); ?>/g.png"></a>
      <a target="_blank" href="https://www.facebook.com/igor.batov.351"><img src="<?php echo $this->getAppDir('img'); ?>/f.png"></a>
      <a target="_blank" href="http://vk.com/igbatov"><img src="<?php echo $this->getAppDir('img'); ?>/vk.png"></a>
    </div>
  </div>
  <div style="display: none;" id="graphsData"><?php echo $graph ? json_encode($graph) : ""; ?></div>
  </body>
</html>
