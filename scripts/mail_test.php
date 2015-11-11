<?php

sendMail("info@grasp.how", "igbatov@gmail.com", "someone want to signup", "test");

  function sendMail( $from, $to, $subj, $text, $files = array())
  {
    $un        = strtoupper(uniqid(time()));
    $head      = "From: ".$from."\n";
    $head     .= "To: ".$to."\n";
    //  $head     .= "Subject: ".$subj."\n";
    $head     .= "X-Mailer: PHPMail Tool\n";
    $head     .= "Reply-To: ".$from."\n";
    $head     .= "Mime-Version: 1.0\n";
    $head     .= "Content-Type:multipart/mixed;";
    $head     .= "boundary=\"----------".$un."\"\n\n";
    $zag       = "------------".$un."\nContent-Type:text/html; charset=utf-8\n";
    $zag      .= "Content-Transfer-Encoding: 8bit\n\n".$text."\n\n";
    foreach($files as $file_key=>$file)
    {
      $filename = is_int($file_key) ? basename($file) : $file_key;
      $f         = fopen($file,"rb");
      $zag      .= "------------".$un."\n";
      $zag      .= "Content-Type: application/octet-stream;";
      $zag      .= "name=\"".$filename."\"\n";
      $zag      .= "Content-Transfer-Encoding:base64\n";
      $zag      .= "Content-Disposition:attachment;";
      $zag      .= "filename=\"".$filename."\"\n\n";
      $zag      .= chunk_split(base64_encode(fread($f,filesize($file))))."\n";
    }

    return mail("$to", '=?UTF-8?B?'.base64_encode($subj).'?=', $zag, $head);
  }

?>
