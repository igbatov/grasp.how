<?php


/**
 * up() and down() will be executed for EVER user and NULL (= general DB)
 */
class D20170802ChangedGraphColors extends Migration
{
  public function up($authId)
  {
    if($authId !== NULL) {
      $q = "SELECT id, settings FROM graph_settings";
      $rows = $this->db->exec($authId, $q);
      foreach ($rows as $row) {
        $s = json_decode($row['settings'], true);
        $nc = $s['skin']['node']['attr']['typeColors'];
        $ec = $s['skin']['edge']['attr']['typeColors'];
        $nc["fact"] = '#50ade3';
        $nc["proposition"] = '#b363d2';
        $nc["illustration"] = '#51d272';
        $nc["question"] = '#ffffff';
        $nc["to_read"] = '#e3d634';
        $nc["best_known_practice"] = '#ffa500';
        $ec["link"] = '#0f1226';
        $ec["causal"] = '#847fa5';
        $ec["conditional"] = '#3CB371';
        $s['skin']['node']['attr']['typeColors'] = $nc;
        $s['skin']['edge']['attr']['typeColors'] = $ec;
        $q = "UPDATE graph_settings SET settings = '".$this->db->escape(json_encode($s))."' WHERE id = '".$row['id']."'";
        $this->db->exec($authId, $q);
      }
    }
  }


  public function down($authId)
  {
    if($authId !== NULL) {
      $q = "SELECT id, settings FROM graph_settings";
      $rows = $this->db->exec($authId, $q);
      foreach ($rows as $row) {
        $s = json_decode($row['settings'], true);
        $nc = $s['skin']['node']['attr']['typeColors'];
        $ec = $s['skin']['edge']['attr']['typeColors'];
        $nc["fact"] = '#00BFFF';
        $nc["proposition"] = '#3CB371';
        $nc["illustration"] = '#FF69B4';
        $nc["question"] = '#FFFFE0';
        $nc["to_read"] = '#FFFF00';
        $nc["best_known_practice"] = '#FFA500';
        $ec["link"] = '#00BFFF';
        $ec["causal"] = '#87CEFA';
        $ec["conditional"] = '#3CB371';
        $s['skin']['node']['attr']['typeColors'] = $nc;
        $s['skin']['edge']['attr']['typeColors'] = $ec;
        $q = "UPDATE graph_settings SET settings = '".$this->db->escape(json_encode($s))."' WHERE id = '".$row['id']."'";
        $this->db->exec($authId, $q);
      }
    }
  }
}
