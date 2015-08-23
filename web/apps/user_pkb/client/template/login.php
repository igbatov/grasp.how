<!doctype html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <link rel="stylesheet" href="http://fonts.googleapis.com/css?family=Open+Sans:400,700">
  <link rel="stylesheet" href="<?php echo $this->getAppDir('css'); ?>/login.css">
</head>
<body>
<table style="width: 100%; margin-top: 10%;">
  <tr>
    <td colspan="2" style="text-align: center; font-size: 60px;"><div style="margin-bottom: 60px;">SIGN IN OR SIGN UP</div></td>

  </tr>
  <tr>
    <td style="border-right: 1px solid #cdd0d4;">
  <div id="login" style="float: right; margin-right: 10px;">
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
        <input type="submit" value="SIGN IN" />
      </form>
    </fieldset>
  </div> <!-- end login -->
  </td>

  <td style="border-left: 1px solid #cdd0d4;">
  <div id="login" style="float: left; margin-left: 10px;">
    <fieldset class="clearfix">
      <form class="smart-green" method="<?php echo $signup_form_vars["method"]; ?>" action="<?php echo $signup_form_vars["action"]; ?>">
        <?php foreach($signup_form_vars["fields"] as $key => $field) : ?>
          <?php echo $key; ?>
          <p>
            <?php echo $field["type"] == "text" ? '<span class="fontawesome-user"></span>' : '' ?>
            <?php echo $field["type"] == "password" ? '<span class="fontawesome-lock"></span>' : '' ?>
            <input type="<?php echo $field["type"]; ?>" name="<?php echo $key; ?>" /><br>
          </p>
        <?php endforeach ?>
        <input type="submit" value="SIGN UP" />
      </form>
    </fieldset>
  </div> <!-- end login -->

  </td>
  </tr>
</table>



</body>
</html>