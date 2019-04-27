<!doctype html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/slack.css">
</head>
<body>

<?php if ($thankYou): ?>
<div id="login">
  <div class="title">
    You will receive invitation on email shortly
    <br/>
    <br/>
    THANK YOU!
  </div>
<?php else : ?>

<div id="login">
  <div class="title">
    <img style="width:40px; position: relative; top: 0.44em;" src="<?php echo $this->getAppDir('css'); ?>/logo_slack.svg">
    enter email to join slack channel
  </div>
  <br/>
  <fieldset class="clearfix">
    <form class="smart-green" method="POST" action="joinSlack">
      <p>
        <span class="fontawesome-user"></span>
        <input type="text" name="email" />
        <div style="margin-top: -0.5em;">
          <?php if ($badEmail) : ?>  BAD EMAIL - JUST TRY AGAIN! :) <?php endif; ?>
        </div>
        <br>
      </p>
      <input type="submit" value="GET SLACK INVITATION!" />
    </form>
  </fieldset>
</div>
<?php endif; ?>
</body>
</html>
