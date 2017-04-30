<?php


/**
 *
 */
class D20170423MultiTenant extends Migration
{
  private $generalTables;
  private $userTables;
  private $graphIdConverter;
  private $contentIdConverter;

  public function __construct(MultiTenantDB $db, Config $c, Logger $logger)
  {
    parent::__construct($db, $c, $logger);
    $this->graphIdConverter = new GraphIdConverter($logger);
    $this->contentIdConverter = new ContentIdConverter($logger);
    $this->generalTables = [
        'asjc_code_list',
        'auth',
        'request_log',
        'scopus_title_list',
        'share_track',
        'subscribe_email',
    ];
    $this->userTables = [
        'edge_content',
        'graph',
        'graph_history',
        'graph_settings',
        'migration_status',
        'node_content',
        'node_content_falsification',
        'node_content_history',
        'node_content_source',
        'source',
    ];
  }

  public function up($authId)
  {
    // we only want to change general db (one and only for not-multi-tenant architecture)
    if($authId !== null) return;
    $this->addChannelToAuth();
    $this->addDomainToAuth();
    $this->transformClones();
    $this->createTemplateDatabase();
    $this->splitUsers();
    $this->rebuildGraphHistoryGraphIds();
    $this->rebuildNodeContentPGraphIds();
    $this->removeUserTablesFromGeneral();
    $this->removeObsoleteColumns();
  }

  /**
   * Remove obsolete auth_id columns from user databases
   */
  private function removeObsoleteColumns()
  {
    $q = "SELECT * FROM ".$this->config->getDbConf()->dbName.".auth";
    $auths = $this->db->exec(null, $q);

    foreach($auths as $auth) {
      $q = "ALTER TABLE graph DROP COLUMN auth_id";
      $this->db->exec($auth['id'], $q);
      $q = "ALTER TABLE source DROP COLUMN auth_id";
      $this->db->exec($auth['id'], $q);
    }
  }

  /**
   * remove user tables from general database
   */
  private function removeUserTablesFromGeneral()
  {
    foreach ($this->userTables as $userTable) {
      if($userTable === 'migration_status') continue;
      $q = "DROP TABLE ".$userTable;
      $this->db->exec(null, $q);
    }
  }

  private function rebuildNodeContentPGraphIds()
  {
    $q = "SELECT * FROM ".$this->config->getDbConf()->dbName.".auth";
    $auths = $this->db->exec(null, $q);

    foreach($auths as $auth) {
      $q = "SELECT id, p FROM node_content";
      $rows = $this->db->exec($auth['id'], $q);
      foreach ($rows as $row) {
        if(strlen($row['p']) === 0) continue;
        $p = json_decode($row['p'], true);
        $newP = [];
        foreach ($p as $k => $probability) {
          $parentAlternativeSet = json_decode($k, true);
          $newParentAlternativeSet = [];
          foreach ($parentAlternativeSet as $parentContentId => $alternativeId) {
            $localGraphId = $this->contentIdConverter->getGraphId($parentContentId);
            $localContentId = $this->contentIdConverter->getLocalContentId($parentContentId);
            $globalGraphId = $this->graphIdConverter->createGlobalGraphId($auth['id'], $localGraphId);
            $newParentContentId = $this->contentIdConverter->createGlobalContentId($globalGraphId, $localContentId);
            $newParentAlternativeSet[$newParentContentId] = $alternativeId;
          }
          $newP[json_encode($newParentAlternativeSet)] = $probability;
        }
        $q = "UPDATE node_content SET p = '".$this->db->escape(json_encode($newP))."' WHERE id = '".$row['id']."'";
        $this->db->exec($auth['id'], $q);
      }
    }
  }

  /**
   * Rebuild graphId to global form (that contains authId)
   */
  private function rebuildGraphHistoryGraphIds()
  {
    $q = "SELECT * FROM ".$this->config->getDbConf()->dbName.".auth";
    $auths = $this->db->exec(null, $q);

    foreach($auths as $auth) {
      $q = "SELECT id, elements FROM graph_history";
      $rows = $this->db->exec($auth['id'], $q);
      foreach ($rows as $row) {
        if(strlen($row['elements']) === 0) continue;

        $elements = json_decode($row['elements'], true);

        // convert nodes
        foreach ($elements['nodes'] as $k=>$node) {
          $localGraphId = $this->contentIdConverter->getGraphId($node['nodeContentId']);
          $localContentId = $this->contentIdConverter->getLocalContentId($node['nodeContentId']);
          $globalGraphId = $this->graphIdConverter->createGlobalGraphId($auth['id'], $localGraphId);
          $elements['nodes'][$k]['nodeContentId'] = $this->contentIdConverter->createGlobalContentId($globalGraphId, $localContentId);
        }

        // convert edges
        foreach ($elements['edges'] as $k=>$node) {
          $localGraphId = $this->contentIdConverter->getGraphId($node['edgeContentId']);
          $localContentId = $this->contentIdConverter->getLocalContentId($node['edgeContentId']);
          $globalGraphId = $this->graphIdConverter->createGlobalGraphId($auth['id'], $localGraphId);
          $elements['edges'][$k]['edgeContentId'] = $this->contentIdConverter->createGlobalContentId($globalGraphId, $localContentId);
        }

        $q = "UPDATE graph_history SET elements = '".$this->db->escape(json_encode($elements))."' WHERE id = ".$row['id'];
        $this->db->exec($auth['id'], $q);
      }
    }
  }

  /**
   *  Split users on different databases
   */
  private function splitUsers()
  {
    $this->db->switchDB($this->config->getDbConf()->dbName);
    $q = "SELECT * FROM auth";
    $auths = $this->db->exec(null, $q);

    foreach($auths as $auth) {
      // create user database without data
      $this->db->copyDB(
          $this->config->get('db_template'),
          $this->config->get('userDBPrefix').$auth['id'],
          array()
      );

      // get user graph ids
      $graphIds = [];
      $q = "SELECT id FROM graph WHERE auth_id = ".$auth['id'];
      $rows = $this->db->exec(null, $q);
      foreach ($rows as $row) $graphIds[] = $row['id'];

      // copy data of this user
      $fromDB = $this->config->getDbConf()->dbName;
      $toDB = $this->config->get('userDBPrefix').$auth['id'];
      foreach ($this->userTables as $tableName){
        $q = "INSERT INTO ".$toDB.".".$tableName." SELECT * FROM ".$fromDB.".".$tableName." ";
        if(in_array($tableName, ['migration_status'])){
        }else if(in_array($tableName, ['graph', 'source'])){
          $q .= "WHERE auth_id = ".$auth['id'];
        }else{
          $q .= "WHERE graph_id IN (".implode(',',$graphIds).")";
        }
        $this->db->exec(null, $q);
      }
    }
  }

  private function createTemplateDatabase()
  {
    $this->db->copyDB($this->config->getDbConf()->dbName, $this->config->get('db_template'), array());
    foreach ($this->generalTables as $generalTable) {
      $q = "DROP TABLE ".$this->config->get('db_template').".".$generalTable;
      $this->db->exec(null, $q);
    }
  }

  private function addChannelToAuth()
  {
    $this->db->exec(null, "ALTER TABLE `auth` ADD COLUMN channel varchar(255) DEFAULT 'alpha'");
    $this->db->exec(null, "UPDATE `auth` SET channel = 'alpha'");
  }

  private function addDomainToAuth()
  {
    $this->db->exec(null, "ALTER TABLE `auth` ADD COLUMN domain varchar(255)");
    $this->db->exec(null, "ALTER TABLE `auth` ADD UNIQUE (domain)");
    $rows = $this->db->exec(null, "SELECT * FROM `auth`");
    foreach ($rows as $row) {
      $domain =  preg_replace('/[^a-zA-Z0-9_]/', '-', $row['username']);
      $this->db->exec(null, "UPDATE `auth` SET domain = '".$domain."' WHERE id = '".$row['id']."'");
    }
  }

  private function transformClones()
  {
    $this->db->exec(null, "ALTER TABLE `node_content` ADD COLUMN cloned_from_auth_id int DEFAULT NULL");
    $this->db->exec(null, "ALTER TABLE `graph` ADD COLUMN cloned_from_auth_id int DEFAULT NULL");
    $this->db->exec(null, "ALTER TABLE `graph` ADD COLUMN cloned_to text DEFAULT NULL");

    $q = "SELECT * FROM auth";
    $auths = [];
    $authRows = $this->db->exec(null, $q);
    foreach ($authRows as $authRow) {
      $auths[$authRow['id']] = $authRow;
    }


    // fill cloned_from_auth_id field
    $graphAuthMap = [];
    $graphs = [];
    $q = "SELECT * FROM graph";
    $graphRows = $this->db->exec(null, $q);
    foreach ($graphRows as $graphRow){
      $graphAuthMap[$graphRow['id']] = $graphRow['auth_id'];
      $graph = json_decode($graphRow['graph'], true);
      $graphs[$graphRow['id']] = [
          'authId'=>$graphRow['auth_id'],
          'name'=>$graph['name']
      ];
    }

    $q = "SELECT * FROM graph WHERE cloned_from_graph_id IS NOT NULL";
    $graphRows = $this->db->exec(null, $q);
    foreach ($graphRows as $graphRow){
      $q = "UPDATE graph SET cloned_from_auth_id = '".$graphAuthMap[$graphRow['cloned_from_graph_id']]."' WHERE id = '".$graphRow['id']."'";
      $this->db->exec(null, $q);
    }

    $q = "SELECT * FROM node_content WHERE cloned_from_graph_id IS NOT NULL";
    $nodeContentRows = $this->db->exec(null, $q);
    foreach ($nodeContentRows as $nodeContentRow){
      $q = "UPDATE node_content SET cloned_from_auth_id = '".$graphAuthMap[$nodeContentRow['cloned_from_graph_id']]."' WHERE id = '".$nodeContentRow['id']."'";
      $this->db->exec(null, $q);
    }

    // fill cloned_to
    $q = "SELECT * FROM graph";
    $graphRows = $this->db->exec(null, $q);
    foreach ($graphRows as $graphRow){
      // find all clones of this graph
      $q = "SELECT * FROM graph WHERE cloned_from_graph_id = '".$graphRow['id']."'";
      $cloneRows = $this->db->exec(null, $q);
      $clonedTo = [];
      foreach ($cloneRows as $cloneRow) {
        $clonedTo[$graphAuthMap[$cloneRow['id']].".".$cloneRow['id']] = [
            'graphId'=>$cloneRow['id'],
            'graphName'=>$graphs[$cloneRow['id']]['name'],
            'authId'=>$graphAuthMap[$cloneRow['id']],
            'username'=>$auths[$graphAuthMap[$cloneRow['id']]]['username']
        ];
      }
      $q = "UPDATE graph SET cloned_to = '".$this->db->escape(json_encode($clonedTo))."' WHERE id = '".$graphRow['id']."'";
      $this->db->exec(null, $q);
    }
  }

  public function down($authId)
  {
    // Implement this if you need it. For now I am not.
  }
}
