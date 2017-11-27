<!doctype html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/login.css">
</head>
<body>

  <div id="login">
    <fieldset class="clearfix">
      <form class="smart-green" method="<?php echo $login_form_vars["method"]; ?>" action="<?php echo $login_form_vars["action"]; ?>">
        <?php foreach($login_form_vars["fields"] as $key => $field) : ?>
          <?php echo $key; ?>
        <p>
          <?php echo $field["type"] == "text" ? '<span class="fontawesome-user"></span>' : '' ?>
          <?php echo $field["type"] == "password" ? '<span class="fontawesome-lock"></span>' : '' ?>
          <input type="<?php echo $field["type"]; ?>" name="<?php echo $key; ?>" /><br>
        </p>
        <?php endforeach ?>
        <input type="hidden" name="fromUrl" value="<?php echo $fromUrl; ?>" />
        <input type="submit" value="SIGN IN" />
      </form>
    </fieldset>
    <div>
      <div style="text-align: center;">or authorize via</div>
      <div style="text-align: center;">
        <?php foreach($this->oauth->getOauthProviders(base64_encode(json_encode(['fromUrl'=>$fromUrl]))) as $provider) : ?>
          <a target="_blank" href="<?php echo $provider['uri'] ?>" style="margin: 0 5px 0 5px;"><?php echo $provider['name']; ?></a>
        <?php
          endforeach
        ?>
      </div>
    </div>
  </div> <!-- end login -->
</body>
</html>
