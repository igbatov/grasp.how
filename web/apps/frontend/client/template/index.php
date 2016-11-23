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
      <div class="snippet">
        <?php
          $slogans_en = array('full and reliable worldview', 'challenge your worldview');
          $slogans = array('полное и обоснованное мировоззрение', 'проверь своё мировоззрение');
          echo $slogans[rand(0,1)];
        ?></div>
    </div>
    <ul id="mainMenu" >
      <li><a href="#purpose">ЦЕЛЬ</a></li>
      <li><a href="#method">МЕТОД</a></li>
      <li><a href="#contacts">КОНТАКТЫ</a></li>
      <li><a href="http://my.grasp.how">ВХОД</a></li>
    </ul>
  </div>

  <iframe class='grasphow-iframe' src='/embed/[12,15]' style='border: 0; width: 100%; height: 600px'></iframe>

  <div id="quote" class="description">
    <blockquote>
      <p style="font-size: 1em;">
        ...эвристика доступности позволяет объяснить почему некоторые мысли чрезвычайно сильно занимают умы людей,
        в то время как другими они пренебрегают. Люди склонны оценивать важность идеи в зависимости от того насколько легко она вспоминается.
        На последнее большое влияние имеет освещенность в СМИ. То что часто упоминается вытесняет остальные темы.
        <br>...<br>
        Правило СТЧВ (Существует Только То, Что Видно) означает что ни количество ни качество информации не имеет большого значения в субъективной уверенности.
        Уверенность в своих убеждениях зависит, в большой степени, от связности истории которую вы можете рассказать о том что видите. Даже если вы видите немного.
        Мы обычно не допускаем что существуют какие-то критически важные не учтенные нами данные - существует только то, что видно.

      </p>
      <footer>
        — <cite>"Думая быстро и медленно", Даниэль Канеман, психолог, нобелевский лауреат 2002 года.</cite>
      </footer>
    </blockquote>
  </div>
  <div id="purpose" class="description">
    <h1>Цель проекта</h1>
    <?php  include($this->getAppDir('template', false).'/_aim3.php'); ?>
  </div>
  <div id="video1" class="description">
    <div style="float:left; margin-right: 10%;">
      <iframe width="560" height="315" src="https://www.youtube.com/embed/0kMvLLOi-0A" frameborder="0" allowfullscreen></iframe>
    </div>
    <div style="padding-top: 15%;">Коротко о том что такое grasp.how и как им пользоваться.</div>

    <div style="clear: both;"></div>
  </div>
  <div id="method" class="description">
    <h1>Метод</h1>
    <p>Заключается в том чтобы разделить все утверждения которые вам предлагаются на следующие категории</p>
    <ul>
      <li>факт</li>
      <li>гипотеза</li>
      <li>иллюстрация</li>
      <li>вопрос</li>
      <li>материал для исследования</li>
      <li>лучшие практики</li>
    </ul>
    <p>
      Далее теориям и гипотезам нужно выставить важность - насколько вы считаете они вообще стоят внимания.
      Может быть с вашей точки зрения автор уделяет им слишком много внимания, учитывая другие насущные проблемы.
    </p>
    <p>
      Далее фактам нужно присвоить не только важность но и достоверность.
      Достоверность показывает насколько можно доверять указанному факту, насколько он проверен.
      Достоверность может определяться, например, на основе авторитетности журнала, автора,
      независимыми экспериментальными проверками.
    </p>
    <p>
      Наконец, нужно связать гипотезы с относящимися к ним фактами и проставить условные вероятности
      - либо вероятность фактов при условии данных гипотез либо наоборот.
    </p>
    <?php  //include($this->getAppDir('template', false).'/_example1.php'); ?>
  </div>
  <div id="purpose_extended" class="description">
    <h1>Миссия</h1>
    <?php  include($this->getAppDir('template', false).'/_aim2.php'); ?>
  </div>
  <div id="contacts" class="description">
    <h1>Контакты</h1>
    <div id="social">
      <a target="_blank" href="https://www.google.com/+IgorBatov"><img src="<?php echo $this->getAppDir('img'); ?>/g.png"></a>
      <a target="_blank" href="https://www.facebook.com/igor.batov.351"><img src="<?php echo $this->getAppDir('img'); ?>/f.png"></a>
      <a target="_blank" href="http://vk.com/igbatov"><img src="<?php echo $this->getAppDir('img'); ?>/vk.png"></a>
    </div>
  </div>
  </body>
</html>
