<?php


/**
 * up() and down() will be executed for EVERY user and NULL (= general DB)
 */

/**
 * Adding alternative_id, active_alternative_id, p
 * Class D20170918AddAbsentColumnsToNodeContentHistory
 */
class D20170918AddAbsentColumnsToNodeContentHistory extends Migration
{
  public function up($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history ADD alternative_id INT UNSIGNED DEFAULT NULL;'
      );
      $this->db->exec(
          null,
          'CREATE INDEX local_content_id_alternative_id_idx ON yovalue_user_template.node_content_history (local_content_id, alternative_id)'
      );
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history ADD active_alternative_id INT UNSIGNED DEFAULT NULL;'
      );
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history ADD p TEXT DEFAULT NULL;'
      );
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history ADD stickers TEXT DEFAULT NULL;'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history ADD alternative_id INT UNSIGNED DEFAULT NULL;'
      );
      $this->db->exec(
          $authId,
          'CREATE INDEX local_content_id_alternative_id_idx ON node_content_history (local_content_id, alternative_id)'
      );
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history ADD active_alternative_id INT UNSIGNED DEFAULT NULL;'
      );
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history ADD p TEXT DEFAULT NULL;'
      );
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history ADD stickers TEXT DEFAULT NULL;'
      );
    }
  }


  public function down($authId)
  {
    if($authId === NULL) {
      // change general DB only
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history DROP alternative_id'
      );
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history DROP INDEX local_content_id_alternative_id_idx'
      );
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history DROP active_alternative_id'
      );
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history DROP p'
      );
      $this->db->exec(
          null,
          'ALTER TABLE yovalue_user_template.node_content_history DROP stickers'
      );
    } else {
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history DROP alternative_id'
      );
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history DROP INDEX local_content_id_alternative_id_idx'
      );
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history DROP active_alternative_id'
      );
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history DROP p'
      );
      $this->db->exec(
          $authId,
          'ALTER TABLE node_content_history DROP stickers'
      );
    }
  }
}