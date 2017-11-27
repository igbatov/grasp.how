<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- The above 3 meta tags *must* come first in the head; any other head content must come *after* these tags -->
  <title>(grasp|how)</title>

  <!-- Bootstrap -->
  <link href="<?php echo $this->getAppDir('css'); ?>/bootstrap.min.css" rel="stylesheet">
  <link href="<?php echo $this->getAppDir('css'); ?>/font-awesome.min.css" rel="stylesheet">
  <link href="<?php echo $this->getAppDir('css'); ?>/hover.css" rel="stylesheet">
  <link href="<?php echo $this->getAppDir('css'); ?>/style.css" rel="stylesheet">
  <link href="<?php echo $this->getAppDir('css'); ?>/media.css" rel="stylesheet">

  <!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->
  <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
  <!--[if lt IE 9]>
  <script src="https://oss.maxcdn.com/html5shiv/3.7.2/html5shiv.min.js"></script>
  <script src="https://oss.maxcdn.com/respond/1.4.2/respond.min.js"></script>
  <![endif]-->
  <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>xor4096.min.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>Helpers.js"></script>
  <script>
    <?php
    /** @var I18N $i18n */
    echo 'GRASP.TRANSLATIONS = '.json_encode($this->i18n->showAllTranslations()).';';
    echo 'GRASP.LANGUAGE = "'.$this->i18n->getLang().'";';
    ?>
  </script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>I18n.js"></script>
  <script src="<?php echo $this->getDefaultDir('js'); ?>UIElements.js"></script>
  <script src="<?php echo $this->getAppDir('js'); ?>/main.js"></script>
  <script src="<?php echo $this->getAppDir('js'); ?>/bootstrap.min.js"></script>
  <script src="<?php echo $this->getAppDir('js'); ?>/playOnView.js"></script>
</head>
<body>
<div class="mainContainer">
<div class="header">
  <div class="container">
    <nav class="navbar navbar-default">
      <div class="container-fluid">
        <!-- Brand and toggle get grouped for better mobile display -->
        <div class="navbar-header">
          <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#bs-example-navbar-collapse-1" aria-expanded="false">
            <span class="sr-only">Toggle navigation</span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </button>
          <a class="navbar-brand" href="#"><div class="logo">(grasp|how)</div></a>
        </div>

        <!-- Collect the nav links, forms, and other content for toggling -->
        <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">
          <ul class="nav navbar-nav">
            <li><a href="#goal"><?php echo $this->i18n->__('Goal') ?></a></li>
            <li><a href="#method"><?php echo $this->i18n->__('Method') ?></a></li>
            <li><a href="#contacts"><?php echo $this->i18n->__('Contacts') ?></a></li>
          </ul>
          <ul class="nav navbar-nav navbar-right">
            <li>
              <a href="/setLang/en"><?php echo $this->i18n->getLang() == 'ru' ? 'Ru' : 'En'?></a>
              <ul>
                <li><a href="/setLang/en">En</a></li>
                <li><a href="/setLang/ru">Ru</a></li>
              </ul>
            </li>
            <li><a href="https://my.grasp.how" class="btn"><?php echo $this->i18n->__('Create my own map') ?></a></li>
          </ul>
        </div><!-- /.navbar-collapse -->
      </div><!-- /.container-fluid -->
    </nav>
  </div>
</div>
<div class="box1">
  <div class="container">
    <h1>
      Визуальные карты для анализа информации
      <span>Показываем вероятность ваших гипотез исходя из фактов и их достоверности</span>
    </h1>
    <div id="grasp-how-501cb8beb66019e90ed669caadbe7ad4" style="height: 500px;">
      <script src='http://www.grasp.how/embed.js?data={"snaps":[{"graphId":"1.155","step":28,"ts":1505413982595}],"withFbShare":false,"editMapRibbon":false}'></script>
    </div>
  </div>
</div>
<div class="box2">
  <div class="container padding50">
    <div id="goal" class="col-sm-12 nopadding">
      <h2>Зачем нужны визуальные карты</h2>
    </div>
    <div class="col-sm-7 noleft">

      <p>Часто сложно оценить правдоподобность утверждений автора, читая текст полный описаний
        и лирических отступлений.
        Сложно выделить факты, на которых основаны утверждения, определить их достоверность
        и проверить корректность логики.</p>

      <p>Визуальные карты grasp.how помогают понять взаимосвязи фактов и утверждений
        и показывают насколько тексту можно доверять.</p>

      <p>Проиллюстрировав свою статью картой вы снимете с читателя рутину анализа и покажете что не
        пытаетесь манипулировать его мнением. Карта отображает суть и фильтрует информационный шум.</p>

      <p>И, самое главное, карты доступны для совместного редактирования.
        Если вы заметили в чужой карте неточность, можете сразу же её исправить.
        Это так же значит что автор статьи моментально отделит читателей которые хотят внести
        конструктивные дополнения от "троллей".</p>
    </div>

    <div class="col-sm-5 noright">
      <p>
        Количество и качество
        информации не очень сильно влияют на субъективную уверенность.
        Уверенность в своих убеждениях зависит от связности
        истории которую вы можете рассказать о том что видите.
        <img src="<?php echo $this->getAppDir('img'); ?>/quote.png">
      </p>
      <p class="color">
        «Думая быстро и медленно»<br/>
        Даниэль Канеман — психолог,<br/>
        нобелевский лауреат 2002 г.
      </p>

      <p class="last">
        от 5000 <img style="position: relative; width: 9.3%; margin-top: 30px; margin-left: 30px;"
                 src="<?php echo $this->getAppDir('img'); ?>/Ruble_sign.svg">
        <span>платим за ваши карты</span>
      </p>
    </div>
  </div>
</div>
<div class="box3">
  <div id="method" class="container padding50">
    <h1>Как строить карты</h1>

    <div class="item">
      <div class="col-sm-6 noleft">
        <p class="head">
          <span>1.</span> Разделить утверждения на категории
        </p>
        <ul>
          <li>— факт</li>
          <li>— гипотеза</li>
          <li>— иллюстрации</li>
          <li>— вопрос</li>
          <li>— материал для исследования</li>
          <li>— лучшие практики</li>
        </ul>
      </div>
      <div class="col-sm-6 noright">
        <div class="inner">
          <div class="web-cam">
            <video class="firstVideo" loop>
              <source src="<?php echo $this->getAppDir('img'); ?>/<?php echo $this->i18n->getLang() === 'en' ? 'graspGIFs1EN.mp4' : 'graspGIFs1.mp4' ?>" type="video/mp4">
            </video>
          </div>
        </div>
      </div>
    </div>
    <div class="item">
      <div class="col-sm-6 noleft">
        <p class="head">
          <span>2.</span> Указать достоверность
        </p>
        <ul>
          <li>Присваиваем фактам достоверность, чтобы понимать насколько можно доверять этому факту.  </li>
          <li><br/>Достоверность определяется по источнику — авторитетности журнала, автора или независимыми экспериментальными проверками.</li>
        </ul>
      </div>
      <div class="col-sm-6 noright">
        <div class="inner">
          <div class="web-cam">
            <video class="secondVideo" loop>
              <source src="<?php echo $this->getAppDir('img'); ?>/<?php echo $this->i18n->getLang() === 'en' ? 'v2en.mp4' : '2v4.mp4' ?>" type="video/mp4">
            </video>
          </div>
        </div>
      </div>
    </div>
     <div class="item">
      <div class="col-sm-6 noright">
        <p class="head">
          <span>3.</span> Расставить взаимосвязи
        </p>
        <ul>
          <li>
            На этом этапе вы уже имеете конструктивную карту своей статьи.
          </li>
          <li>
            <br/>
            Однако если вы хотите математической точности, можно продолжить дальше
            и рассчитать вероятности ваших гипотез относительно указанных фактов.
          </li>
          <li>
            <br/>
            Связываем гипотезы с фактами и указываем условные вероятности.
            Нажимаем
            <button name="CalculateBayes" class="ui_button bigButton">Рассчитать по Байесу</button>
            и получаем точные вероятностные оценки наших гипотез.
          </li>
        </ul>
      </div>
      <div class="col-sm-6 noleft">
        <div class="inner">
          <div class="web-cam">
            <video class="thirdVideo" loop>
              <source src="<?php echo $this->getAppDir('img'); ?>/<?php echo $this->i18n->getLang() === 'en' ? '3v8.mp4' : '3v2.mp4' ?>" type="video/mp4">
            </video>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="box4">
  <div class="container padding50">
    <h1>Видео-инструкции</h1>
    <div class="col-sm-6 noleft">
      <iframe src="<?php echo $this->i18n->__("https://www.youtube.com/embed/D_BMNLUkro8"); ?>" frameborder="0" allowfullscreen></iframe>
      <p><?php echo $this->i18n->__("What is grasp.how and how to use it, in a nutshell"); ?></p>
    </div>
    <div class="col-sm-6 noright">
      <iframe src="<?php echo $this->i18n->__("https://www.youtube.com/embed/Dm23kNi_KYY"); ?>" frameborder="0" allowfullscreen></iframe>
      <p><?php echo $this->i18n->__("Real-life example: map of Evolution theory"); ?></p>
    </div>
    <div class="col-sm-6 noleft">
      <iframe src="<?php echo $this->i18n->__("https://www.youtube.com/embed/j0Ae1ywJfcA"); ?>" frameborder="0" allowfullscreen></iframe>
      <p><?php echo $this->i18n->__("How to share map, clone maps of others and get their modifications"); ?></p>
    </div>
  </div>
</div>
<div id="contacts" class="footer">
  <div class="top">
    <div class="container padding50 requestMap">
      <h5>Составим карту для вашей статьи</h5>

      <div class="col-sm-12 nopadding">
        <input type="text" id="siteLink" placeholder="Укажите сайт со статьёй">
      </div>
      <div class="col-sm-5 nopadding">
        <input type="text" id="email" placeholder="Эл. адрес">
      </div>
      <div class="col-sm-9 nopadding">
        <button>Отправить</button>
        <p>С вами свяжутся в течении 3х дней
          <span>для уточнения деталей</span></p>
      </div>
    </div>
  </div>
  <div class="bottom">
    <div class="container padding50">
      Вопросы и предложения пишите на <a href="mailto:igbatov@gmail.com">igbatov@gmail.com</a>
    </div>
  </div>
</div>
</div>
</body>
</html>
