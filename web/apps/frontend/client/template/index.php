<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />

    <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/main.css">

    <script src="<?php echo $this->getDefaultDir('js'); ?>jquery.js"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."d3.v3.min.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."main.js" ?>"></script>
    <script type="text/javascript" src="<?php echo $this->getAppDir('js')."/"."googleanalytics.js" ?>"></script>
  </head>
  <body>
  <div id="mainMenuContainer">
    <div id="logo">
      GRASP.HOW<br>
      <div class="snippet">
        <?php
          $slogans = array($this->i18n->__('full and reliable worldview'), $this->i18n->__('challenge your worldview'));
          echo $slogans[rand(0,1)];
        ?></div>
    </div>
    <ul id="mainMenu">
      <li>
        <a href="/setLang/en"><?php echo $this->i18n->getLang() == 'ru' ? 'РУ' : 'EN'?></a>
        <ul>
          <li><a href="/setLang/en">EN</a></li>
          <li><a href="/setLang/ru">РУ</a></li>
        </ul>
      </li>
      <li><a href="#purpose"><?php echo $this->i18n->__('GOAL') ?></a></li>
      <li><a href="#method"><?php echo $this->i18n->__('METHOD') ?></a></li>
      <li><a href="#contacts"><?php echo $this->i18n->__('CONTACTS') ?></a></li>
      <li><a href="http://my.grasp.how"><?php echo $this->i18n->__('SIGN IN (UP)') ?></a></li>
    </ul>
  </div>

  <div id="grasp-how-8866" style="height: 600px;"><script src="http://www.grasp.how/embedjs/[155]/grasp-how-8866"></script></div>

  <div id="quote" class="description">
    <blockquote>
      <p style="font-size: 1em;">
        <?php echo $this->i18n->__('...availability heuristic helps explain why some issues are highly salient in the public’s mind while others are neglected. People tend to assess the relative importance of issues by the ease with which they are retrieved from memory—and this is largely determined by the extent of coverage in the media. Frequently mentioned topics populate the mind even as others slip away from awareness.'); ?>
        <br>...<br>
        <?php echo $this->i18n->__('As the WYSIATI (What You See is All There is) rule implies, neither the quantity nor the quality of the evidence counts for much in subjective confidence. The confidence that individuals have in their beliefs depends mostly on the quality of the story they can tell about what they see, even if they see little. We often fail to allow for the possibility that evidence that should be critical to our judgment is missing—what we see is all there is.'); ?>

      </p>
      <footer>
        — <cite><?php echo $this->i18n->__("'Thinking, fast and slow', Daniel Kahneman, psychologist, Nobel Memorial Prize in Economic Sciences"); ?></cite>
      </footer>
    </blockquote>
  </div>
  <div class="description subscribe" style="text-align: right;">
    <input type="text" placeholder="youremail@domain.com">
    <input id="sss" type="submit" value="<?php echo $this->i18n->__("Subscribe to newsletter"); ?>">
    <div id="subscribe_msg_ok" style="display: none;"><?php echo $this->i18n->__("thank you, now you subscribed!"); ?></div>
    <div id="subscribe_msg_error" style="display: none;"><?php echo $this->i18n->__("enter you email"); ?></div>
  </div>
  <div id="purpose" class="description">
    <h1><?php echo $this->i18n->__("Project objective"); ?></h1>
    <?php  include($this->getAppDir('template', false).'/_aim3.php'); ?>
  </div>
  <div id="video1" class="description">
    <div style="float:left; margin-right: 10%;">
      <iframe width="560" height="315" src="<?php echo $this->i18n->__("https://www.youtube.com/embed/D_BMNLUkro8"); ?>" frameborder="0" allowfullscreen></iframe>
    </div>
    <div style="padding-top: 15%;"><?php echo $this->i18n->__("What is grasp.how and how to use it, in a nutshell"); ?></div>

    <div style="clear: both;"></div>
  </div>
  <div id="video2" class="description">
    <div style="float:left; margin-right: 10%;">
      <iframe width="560" height="315" src="<?php echo $this->i18n->__("https://www.youtube.com/embed/JRFGqepAnhU"); ?>" frameborder="0" allowfullscreen></iframe>
    </div>
    <div style="padding-top: 15%;"><?php echo $this->i18n->__("Real-life example: map of Evolution theory"); ?></div>

    <div style="clear: both;"></div>
  </div>
  <div id="video3" class="description">
    <div style="float:left; margin-right: 10%;">
      <iframe width="560" height="315" src="<?php echo $this->i18n->__("https://www.youtube.com/embed/2Fw-zeoT2ew"); ?>" frameborder="0" allowfullscreen></iframe>
    </div>
    <div style="padding-top: 15%;"><?php echo $this->i18n->__("How to share map, clone maps of others and get their modifications"); ?></div>

    <div style="clear: both;"></div>
  </div>
  <div id="method" class="description">
    <h1><?php echo $this->i18n->__("Method"); ?></h1>
    <p><?php echo $this->i18n->__("Aims at subdividing all statements into the following categories:"); ?></p>
    <ul>
      <li><?php echo $this->i18n->__("a fact"); ?></li>
      <li><?php echo $this->i18n->__("a hypothesis"); ?></li>
      <li><?php echo $this->i18n->__("an illustration"); ?></li>
      <li><?php echo $this->i18n->__("a question"); ?></li>
      <li><?php echo $this->i18n->__("research material"); ?></li>
      <li><?php echo $this->i18n->__("the best practices"); ?></li>
    </ul>
    <p>
      <?php echo $this->i18n->__("Next, reliability level should be determined for all the facts. Reliability shows how much credence to give to the stated fact, and how proven it is."); ?>
    </p>
    <p>
      <?php echo $this->i18n->__("Then all theories and hypothesis should be rated for importance – how much attention you think is worth paying to them."); ?>
    </p>
    <p>
      <?php echo $this->i18n->__("Finally, you need to link hypotheses with the facts relating to them, and determine conditional probabilities – the probabilities of facts on condition of hypotheses. Or, vice versa, the probability of hypotheses on condition of these facts (however, such probabilities are considerably rare to come across)."); ?>
    </p>
    <?php  //include($this->getAppDir('template', false).'/_example1.php'); ?>
  </div>
  <div id="purpose_extended" class="description">
    <h1><?php echo $this->i18n->__("Mission") ?></h1>
    <?php  include($this->getAppDir('template', false).'/_aim2.php'); ?>
  </div>
  <div id="contacts" class="description">
    <h1><?php echo $this->i18n->__("Contacts") ?></h1>
    <div id="social">
      <a target="_blank" href="https://www.google.com/+IgorBatov"><img src="<?php echo $this->getAppDir('img'); ?>/g.png"></a>
      <a target="_blank" href="https://www.facebook.com/igor.batov.351"><img src="<?php echo $this->getAppDir('img'); ?>/f.png"></a>
      <a target="_blank" href="http://vk.com/igbatov"><img src="<?php echo $this->getAppDir('img'); ?>/vk.png"></a>
    </div>
  </div>
  </body>
</html>
