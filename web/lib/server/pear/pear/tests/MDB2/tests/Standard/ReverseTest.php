<?php
// +----------------------------------------------------------------------+
// | PHP versions 4 and 5                                                 |
// +----------------------------------------------------------------------+
// | Copyright (c) 1998-2007 Lukas Smith, Lorenzo Alberton                |
// | All rights reserved.                                                 |
// +----------------------------------------------------------------------+
// | MDB2 is a merge of PEAR DB and Metabases that provides a unified DB  |
// | API as well as database abstraction for PHP applications.            |
// | This LICENSE is in the BSD license style.                            |
// |                                                                      |
// | Redistribution and use in source and binary forms, with or without   |
// | modification, are permitted provided that the following conditions   |
// | are met:                                                             |
// |                                                                      |
// | Redistributions of source code must retain the above copyright       |
// | notice, this list of conditions and the following disclaimer.        |
// |                                                                      |
// | Redistributions in binary form must reproduce the above copyright    |
// | notice, this list of conditions and the following disclaimer in the  |
// | documentation and/or other materials provided with the distribution. |
// |                                                                      |
// | Neither the name of Manuel Lemos, Tomas V.V.Cox, Stig. S. Bakken,    |
// | Lukas Smith nor the names of his contributors may be used to endorse |
// | or promote products derived from this software without specific prior|
// | written permission.                                                  |
// |                                                                      |
// | THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS  |
// | "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT    |
// | LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS    |
// | FOR A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE      |
// | REGENTS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,          |
// | INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, |
// | BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS|
// |  OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED  |
// | AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT          |
// | LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY|
// | WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE          |
// | POSSIBILITY OF SUCH DAMAGE.                                          |
// +----------------------------------------------------------------------+
// | Author: Lorenzo Alberton <l dot alberton at quipo dot it>            |
// +----------------------------------------------------------------------+
//
// $Id: ReverseTest.php 322076 2012-01-11 15:51:09Z danielc $

require_once dirname(__DIR__) . '/autoload.inc';

class Standard_ReverseTest extends Standard_Abstract
{
    //test table name (it is dynamically created/dropped)
    public $table       = 'testtable';
    public $fields      = array();
    public $indices     = array();
    public $constraints = array();

    public $table2      = 'testtable2';
    public $fields2      = array();
    public $indices2     = array();
    public $constraints2 = array();

    /**
     * The non-standard helper
     * @var Nonstandard_Base
     */
    protected $nonstd;


    /**
     * Can not use setUp() because we are using a dataProvider to get multiple
     * MDB2 objects per test.
     *
     * @param array $ci  an associative array with two elements.  The "dsn"
     *                   element must contain an array of DSN information.
     *                   The "options" element must be an array of connection
     *                   options.
     */
    protected function manualSetUp($ci) {
        parent::manualSetUp($ci);

        $this->nonstd = Nonstandard_Base::factory($this->db, $this);

        $this->db->loadModule('Reverse', null, true);
        $this->db->loadModule('Manager', null, true);

        //Table structure
        $this->fields = array(
            'id' => array(  //PK
                'type'     => 'integer',
                'unsigned' => 1,
                'notnull'  => 1,
                'default'  => 0,
                'length'  => 4,
            ),
            'id2' => array( //UNIQUE_MULTIFIELD(1/2)
                'type'     => 'integer',
                'unsigned' => 1,
                'notnull'  => 1,
                'default'  => 0,
            ),
            'id3' => array( //UNIQUE_MULTIFIELD(2/2)
                'type'     => 'integer',
                'unsigned' => 1,
                'notnull'  => 1,
                'default'  => 0,
            ),
            'id4' => array( //UNIQUE
                'type'     => 'integer',
                'unsigned' => 1,
                'notnull'  => 1,
                'default'  => 0,
            ),
            'somename' => array( //NORMAL INDEX
                'type'   => 'text',
                'length' => 12,
            ),
            'somedescription' => array( //INDEX_MULTIFIELD(1/2)
                'type'   => 'text',
                'length' => 12,
            ),
            'sex' => array( //INDEX_MULTIFIELD(2/2)
                'type' => 'text',
                'length' => 1,
                'default' => 'M',
            ),
        );

        $options = array();
        if ('mysql' == substr($this->db->phptype, 0, 5)) {
            $options['type'] = 'innodb';
        }

        if (!$this->tableExists($this->table)) {
            $this->db->manager->createTable($this->table, $this->fields, $options);
        }

        //Table2 structure
        $this->fields2 = array(
            'ext_id' => array(  //SINGLE_FK
                'type'     => 'integer',
                'unsigned' => 1,
                'notnull'  => 1,
                'default'  => 0,
            ),
            'ext_id2' => array( //MULTI_FK(1/2)
                'type'     => 'integer',
                'unsigned' => 1,
                'notnull'  => 1,
                'default'  => 0,
            ),
            'ext_id3' => array( //MULTI_FK(2/2)
                'type'     => 'integer',
                'unsigned' => 1,
                'notnull'  => 1,
                'default'  => 0,
            ),
        );

        if (!$this->tableExists($this->table2)) {
            $this->db->manager->createTable($this->table2, $this->fields2, $options);
        }
    }

    public function tearDown() {
        if (!$this->db || MDB2::isError($this->db)) {
            return;
        }
        if ($this->tableExists($this->table2)) {
            $this->db->manager->dropTable($this->table2);
        }
        if ($this->tableExists($this->table)) {
            $this->db->manager->dropTable($this->table);
        }
        parent::tearDown();
    }

    public function setUpIndices()
    {
        //Indices definition
        $this->indices = array(
            'sometestindex' => array(
                'fields' => array(
                    'somename' => array(
                        'sorting' => 'ascending',
                    ),
                ),
                'unique' => false,
            ),
            'multipletestindex' => array(
                'fields' => array(
                    'somedescription' => array(
                        'sorting' => 'ascending',
                    ),
                    'sex' => array(
                        'sorting' => 'ascending',
                    ),
                ),
            ),
        );
        foreach ($this->indices as $index_name => $index) {
            $result = $this->db->manager->createIndex($this->table, $index_name, $index);
            $this->assertFalse(MDB2::isError($result), 'Error creating index: '.$index_name);
            if (MDB2::isError($result)) {
                break;
            }
        }
        return MDB2::isError($result);
    }

    public function setUpConstraints()
    {
        //Constraints definition
        $this->constraints = array(
            'pkfield' => array(
                'fields' => array(
                    'id' => array(
                        'sorting' => 'ascending',
                    ),
                ),
                'primary' => true,
            ),
            'multipleunique' => array(
                'fields' => array(
                    'id2' => array(
                        'sorting' => 'ascending',
                    ),
                    'id3' => array(
                        'sorting' => 'ascending',
                    ),
                ),
                'unique' => true,
            ),
            'singleunique' => array(
                'fields' => array(
                    'id4' => array(
                        'sorting' => 'ascending',
                    ),
                ),
                'unique' => true,
            ),
        );
        $failed1 = false;
        foreach ($this->constraints as $constraint_name => $constraint) {
            //$this->db->manager->dropConstraint($this->table, $constraint_name);
            $result = $this->db->manager->createConstraint($this->table, $constraint_name, $constraint);
            //$this->assertFalse(MDB2::isError($result), 'Error creating constraint: '.$constraint_name);
            if (MDB2::isError($result)) {
                $this->fail('Error creating constraint "'.$constraint_name.'": '.$result->getUserInfo(). ' :: '.$result->getUserInfo());
                $failed1 = true;
                break;
            }
        }

        $this->fk_constraint1_name = $this->table2.'_fk_'.$this->table.'_id';
        //$this->fk_constraint2_name = $this->table2.'_fk_'.$this->table.'_id2_id3';
        $this->fk_constraint2_name = $this->table2.'_fk_'.$this->table.'_2f';
        $this->constraints2 = array(
            $this->fk_constraint1_name => array(
                'primary' => false,
                'unique'  => false,
                'foreign' => true,
                'check'   => false,
                'fields' => array(
                    'ext_id' => array(
                        'position' => 1,
                        'sorting' => 'ascending',
                    ),
                ),
                'references' => array(
                    'table'  => $this->table,
                    'fields' => array(
                        'id' => array(
                            'position' => 1,
                        ),
                    ),
                ),
                'onupdate' => 'CASCADE',
                'ondelete' => 'CASCADE',
                'match'    => 'FULL',
                'deferrable'        => false,
                'initiallydeferred' => false,
            ),
            $this->fk_constraint2_name => array(
                'primary' => false,
                'unique'  => false,
                'foreign' => true,
                'check'   => false,
                'fields' => array(
                    'ext_id2' => array(
                        'position' => 1,
                        'sorting'  => 'ascending',
                    ),
                    'ext_id3' => array(
                        'position' => 2,
                        'sorting'  => 'ascending',
                    ),
                ),
                'references' => array(
                    'table'  => $this->table,
                    'fields' => array(
                        'id2' => array(
                            'position' => 1,
                        ),
                        'id3' => array(
                            'position' => 2,
                        ),
                    ),
                ),
                'onupdate' => 'NO ACTION',
                'ondelete' => 'NO ACTION',
                'match'    => 'FULL',
                'deferrable'        => false,
                'initiallydeferred' => false,
            ),
        );
        $failed2 = false;
        foreach ($this->constraints2 as $constraint_name => $constraint) {
            //$this->db->manager->dropConstraint($this->table, $constraint_name);
            $result = $this->db->manager->createConstraint($this->table2, $constraint_name, $constraint);
            //$this->assertFalse(MDB2::isError($result), 'Error creating constraint: '.$constraint_name);
            if (MDB2::isError($result)) {
                $this->fail('Error creating constraint "'.$constraint_name.'": '.$result->getUserInfo(). ' :: '.$result->getUserInfo());
                $failed2 = true;
                break;
            }
        }

        return !($failed1 || $failed2);
    }

    /**
     * Test tableInfo('table_name')
     * @dataProvider provider
     */
    public function testTableInfo($ci) {
        $this->manualSetUp($ci);

        if (!$this->methodExists($this->db->reverse, 'tableInfo')) {
            $this->markTestSkipped('tableInfo not supported.');
        }

        $table_info = $this->db->reverse->tableInfo($this->table);
        if (MDB2::isError($table_info)) {
            $this->fail('Error getting tableInfo(): '.$table_info->getUserInfo());
        } else {
            $this->assertEquals(count($this->fields), count($table_info), 'The number of fields retrieved is different from the expected one');
            foreach ($table_info as $field_info) {
                $this->assertEquals($this->table, $field_info['table'], 'the table name is not correct');
                if (!array_key_exists(strtolower($field_info['name']), $this->fields)) {
                    $this->fail('Field names do not match ('.$field_info['name'].' is unknown)');
                }
                //expand test, for instance adding a check on types...
            }
        }

        if (!$this->supported('result_introspection')) {
            $this->markTestSkipped('Introspection not supported.');
        }

        $result = $this->db->query('SELECT * FROM '.$this->table);
        $table_info = $this->db->reverse->tableInfo($result);
        if (MDB2::isError($table_info)) {
            $this->fail('Error getting tableInfo(): '.$table_info->getUserInfo());
        } else {
            $this->assertEquals(count($this->fields), count($table_info), 'The number of fields retrieved is different from the expected one');
            foreach ($table_info as $field_info) {
                //not all the drivers are capable of returning the table name,
                //and may return an empty value
                if (!empty($field_info['table'])) {
                    $this->assertEquals($this->table, $field_info['table'], 'the table name is not correct');
                }
                if (!array_key_exists(strtolower($field_info['name']), $this->fields)) {
                    $this->fail('Field names do not match ('.$field_info['name'].' is unknown)');
                }
                //expand test, for instance adding a check on types...
            }
        }
        $result->free();
    }

    /**
     * Test getTableFieldDefinition($table, $field_name)
     * @dataProvider provider
     */
    public function testGetTableFieldDefinition($ci) {
        $this->manualSetUp($ci);

        if (!$this->methodExists($this->db->reverse, 'getTableFieldDefinition')) {
            $this->markTestSkipped('Driver lacks getTableFieldDefinition.');
        }

        //test integer not null
        $field_info = $this->db->reverse->getTableFieldDefinition($this->table, 'id');
        if (MDB2::isError($field_info)) {
            $this->fail('Error in getTableFieldDefinition(): '.$field_info->getUserInfo());
        } else {
            $field_info = array_shift($field_info);
            $this->assertEquals('integer', $field_info['type'], 'The field type is different from the expected one');
            $expected_length = ($this->db->phptype == 'oci8') ? 10 : 4;
            $this->assertEquals($expected_length, $field_info['length'], 'The field length is different from the expected one');
            $this->assertTrue($field_info['notnull'], 'The field can be null unlike it was expected');
            $this->assertEquals('0', $field_info['default'], 'The field default value is different from the expected one');
        }

        //test blob
        $field_info = $this->db->reverse->getTableFieldDefinition($this->table_files, 'picture');
        if (MDB2::isError($field_info)) {
            $this->fail('Error in getTableFieldDefinition(): '.$field_info->getUserInfo());
        } else {
            $field_info = array_shift($field_info);
            $this->assertEquals($field_info['type'], 'blob', 'The field type is different from the expected one');
            $this->assertFalse($field_info['notnull'], 'The field cannot be null unlike it was expected');
        }

        //test varchar(100) not null
        $field_info = $this->db->reverse->getTableFieldDefinition($this->table_users, 'user_name');
        if (MDB2::isError($field_info)) {
            $this->fail('Error in getTableFieldDefinition(): '.$field_info->getUserInfo());
        } else {
            $field_info = array_shift($field_info);
            $this->assertEquals('text', $field_info['type'], 'The field type is different from the expected one');
            $this->assertEquals(12, $field_info['length'], 'The field length is different from the expected one');
            $this->assertFalse($field_info['notnull'], 'The field can be null unlike it was expected');
            $this->assertNull($field_info['default'], 'The field default value is different from the expected one');
            $this->assertFalse($field_info['fixed'], 'The field fixed value is different from the expected one');
        }

        //test decimal
        $field_info = $this->db->reverse->getTableFieldDefinition($this->table_users, 'quota');
        if (MDB2::isError($field_info)) {
            $this->fail('Error in getTableFieldDefinition(): '.$field_info->getUserInfo());
        } else {
            $field_info = array_shift($field_info);
            $this->assertEquals('decimal', $field_info['type'], 'The field type is different from the expected one');
            $expected_length = ($this->db->phptype == 'oci8') ? '22,2' : '18,2';
            $this->assertEquals($expected_length, $field_info['length'], 'The field length is different from the expected one');
        }

        $field_info = $this->db->reverse->getTableFieldDefinition($this->table_users, 'user_name');
        if (MDB2::isError($field_info)) {
            $this->fail('Error in getTableFieldDefinition(): '.$field_info->getUserInfo());
        } else {
            $field_info = array_shift($field_info);
            $this->assertEquals('text', $field_info['type'], 'The field type is different from the expected one');
            $this->assertEquals(12, $field_info['length'], 'The field length is different from the expected one');
            $this->assertFalse($field_info['notnull'], 'The field can be null unlike it was expected');
            $this->assertNull($field_info['default'], 'The field default value is different from the expected one');
            $this->assertFalse($field_info['fixed'], 'The field fixed value is different from the expected one');
        }
    }

    /**
     * Test getTableIndexDefinition($table, $index_name)
     * @dataProvider provider
     */
    public function testGetTableIndexDefinition($ci) {
        $this->manualSetUp($ci);

        if (!$this->methodExists($this->db->reverse, 'getTableIndexDefinition')) {
            $this->markTestSkipped('Driver lacks getTableIndexDefinition.');
        }

        $this->setUpIndices();

        //test index names
        foreach ($this->indices as $index_name => $index) {
            $index_info = $this->db->reverse->getTableIndexDefinition($this->table, $index_name);
            if (MDB2::isError($index_info)) {
                $this->fail('Error getting table index definition');
            } else {
                $field_names = array_keys($index['fields']);
                $this->assertEquals($field_names, array_keys($index_info['fields']), 'Error listing index fields');
            }
        }

        //test INDEX
        $index_name = 'sometestindex';
        $index_info = $this->db->reverse->getTableIndexDefinition($this->table, $index_name);
        if (MDB2::isError($index_info)) {
            $this->fail('Error in getTableIndexDefinition(): '.$index_info->getUserInfo());
        } else {
            $this->assertEquals(1, count($index_info['fields']), 'The INDEX is not on one field unlike it was expected');
            $expected_fields = array_keys($this->indices[$index_name]['fields']);
            $actual_fields = array_keys($index_info['fields']);
            $this->assertEquals($expected_fields, $actual_fields, 'The INDEX field names don\'t match');
            $this->assertEquals(1, $index_info['fields'][$expected_fields[0]]['position'], 'The field position in the INDEX is not correct');
        }

        //test INDEX on MULTIPLE FIELDS
        $index_name = 'multipletestindex';
        $index_info = $this->db->reverse->getTableIndexDefinition($this->table, $index_name);
        if (MDB2::isError($index_info)) {
            $this->fail('Error in getTableIndexDefinition(): '.$index_info->getUserInfo());
        } else {
            $this->assertEquals(2, count($index_info['fields']), 'The INDEX is not on two fields unlike it was expected');
            $expected_fields = array_keys($this->indices[$index_name]['fields']);
            $actual_fields = array_keys($index_info['fields']);
            $this->assertEquals($expected_fields, $actual_fields, 'The INDEX field names don\'t match');
            $this->assertEquals(1, $index_info['fields'][$expected_fields[0]]['position'], 'The field position in the INDEX is not correct');
            $this->assertEquals(2, $index_info['fields'][$expected_fields[1]]['position'], 'The field position in the INDEX is not correct');
        }

        if (!$this->setUpConstraints()) {
            $this->markTestSkipped('Could not set up constraints.');
        }
        //constraints should NOT be listed
        foreach (array_keys($this->constraints) as $constraint_name) {
            $this->db->expectError(MDB2_ERROR_NOT_FOUND);
            $result = $this->db->reverse->getTableIndexDefinition($this->table, $constraint_name);
            $this->assertTrue(MDB2::isError($result), 'Error listing index definition, this is a CONSTRAINT');
        }

        //test index created WITHOUT using MDB2 (i.e. without the "_idx" suffix)
        //NB: MDB2 > v.2.3.0 provides a fallback mechanism
    }

    /**
     * Test testGetTableConstraintDefinition($table, $constraint_name)
     * @dataProvider provider
     */
    public function testGetTableConstraintDefinition($ci) {
        $this->manualSetUp($ci);

        if (!$this->methodExists($this->db->reverse, 'getTableConstraintDefinition')) {
            $this->markTestSkipped('Driver lacks getTableConstraintDefinition.');
        }

        if (!$this->setUpConstraints()) {
            $this->markTestSkipped('Could not set up constraints.');
        }

        $primary_namechange = array(
            'mysql',
            'mysqli',
            'sqlite',
        );


        //test constraint names
        foreach ($this->constraints as $constraint_name => $constraint) {
            if (!empty($constraint['primary'])
                && in_array($this->db->phptype, $primary_namechange))
            {
                // Change "pkfield" to "primary".
                $constraint_name = 'primary';
            }
            $result = $this->db->reverse->getTableConstraintDefinition($this->table, $constraint_name);
            if (MDB2::isError($result)) {
                $this->fail('Error getting table constraint definition ('.$constraint_name.')');
            } else {
                $constraint_names = array_keys($constraint['fields']);
                $this->assertEquals($constraint_names, array_keys($result['fields']), 'Error listing constraint fields');
            }
        }

        $this->setUpIndices();
        //indices should NOT be listed
        foreach (array_keys($this->indices) as $index_name) {
            $this->db->expectError(MDB2_ERROR_NOT_FOUND);
            $result = $this->db->reverse->getTableConstraintDefinition($this->table, $index_name);
            $this->db->popExpect();
            $this->assertTrue(MDB2::isError($result), 'Error listing constraint definition, this is a normal INDEX');
        }

        //test PK
        if (in_array($this->db->phptype, $primary_namechange)) {
            $constraint_name = 'primary';
        } else {
            $constraint_name = 'pkfield';
        }
        $constraint_info = $this->db->reverse->getTableConstraintDefinition($this->table, $constraint_name);
        if (MDB2::isError($constraint_info)) {
            $this->fail('Error in getTableConstraintDefinition(): '.$constraint_info->getUserInfo());
        } else {
            $this->assertTrue($constraint_info['primary'], 'The field is not a PK unlike it was expected');
        }

        //test UNIQUE
        $constraint_name = 'singleunique';
        $constraint_info = $this->db->reverse->getTableConstraintDefinition($this->table, $constraint_name);
        if (MDB2::isError($constraint_info)) {
            $this->fail('Error in getTableConstraintDefinition(): '.$constraint_info->getUserInfo());
        } else {
            $this->assertTrue($constraint_info['unique'], 'The field is not a PK unlike it was expected');
            $this->assertTrue(empty($constraint_info['primary']), 'The field is a PK unlike it was expected');
            $this->assertEquals(1, count($constraint_info['fields']), 'The UNIQUE INDEX is not on one field unlike it was expected');
            $expected_fields = array_keys($this->constraints[$constraint_name]['fields']);
            $actual_fields = array_keys($constraint_info['fields']);
            $this->assertEquals($expected_fields, $actual_fields, 'The UNIQUE INDEX field names don\'t match');
            $this->assertEquals(1, $constraint_info['fields'][$expected_fields[0]]['position'], 'The field position in the INDEX is not correct');
        }

        //test UNIQUE on MULTIPLE FIELDS
        $constraint_name = 'multipleunique';
        $constraint_info = $this->db->reverse->getTableConstraintDefinition($this->table, $constraint_name);
        if (MDB2::isError($constraint_info)) {
            $this->fail('Error in getTableConstraintDefinition(): '.$constraint_info->getUserInfo());
        } else {
            $this->assertTrue($constraint_info['unique'], 'The field is not a PK unlike it was expected');
            $this->assertTrue(empty($constraint_info['primary']), 'The field is a PK unlike it was expected');
            $this->assertEquals(2, count($constraint_info['fields']), 'The UNIQUE INDEX is not on two fields unlike it was expected');
            $expected_fields = array_keys($this->constraints[$constraint_name]['fields']);
            $actual_fields = array_keys($constraint_info['fields']);
            $this->assertEquals($expected_fields, $actual_fields, 'The UNIQUE INDEX field names don\'t match');
            $this->assertEquals(1, $constraint_info['fields'][$expected_fields[0]]['position'], 'The field position in the INDEX is not correct');
            $this->assertEquals(2, $constraint_info['fields'][$expected_fields[1]]['position'], 'The field position in the INDEX is not correct');
        }

        //test FOREIGN KEYs
        foreach (array_keys($this->constraints2) as $constraint_name) {
            $constraint_info = $this->db->reverse->getTableConstraintDefinition($this->table2, $constraint_name);
            if (MDB2::isError($constraint_info)) {
                $this->fail('Error in getTableConstraintDefinition():'. $constraint_info->getUserInfo());
            } else {
                $this->_compareFKdefinitions($this->constraints2[$constraint_name], $constraint_info);
            }
        }
    }

    /**
     * Check the original FK constraint definition against the reverse engineered one.
     *
     * Ideally, the retrieved FK constraint definition should be equal to the
     * one used to create the constraint, but not all the DBMS support all the
     * parameters, so check the common base and do some generic checks for the
     * other patameters.
     * @dataProvider provider
     */
    public function _compareFKdefinitions($expected, $actual) {
        //ideal case: all the parameters are supported by all the DBMS:
        //$this->assertEquals($expected, $actual);

        $this->assertEquals($expected['primary'], $actual['primary']);
        $this->assertEquals($expected['unique'],  $actual['unique']);
        $this->assertEquals($expected['foreign'], $actual['foreign']);
        $this->assertEquals($expected['check'],   $actual['check']);
        $this->assertEquals(array_keys($expected['fields']), array_keys($actual['fields']));
        $this->assertEquals($expected['references'],   $actual['references']);
        $this->assertEquals($expected['deferrable'],   $actual['deferrable']);
        $this->assertEquals($expected['initiallydeferred'],   $actual['initiallydeferred']);
        $this->assertTrue(!empty($actual['match']));
        $this->assertTrue(!empty($actual['onupdate']));
        $this->assertTrue(!empty($actual['ondelete']));
    }

    /**
     * Test getSequenceDefinition($sequence)
     * @dataProvider provider
     */
    public function testGetSequenceDefinition($ci) {
        $this->manualSetUp($ci);

        //setup
        $this->db->loadModule('Manager', null, true);
        $sequence = 'test_sequence';
        $sequences = $this->db->manager->listSequences();
        if (!in_array($sequence, $sequences)) {
            $result = $this->db->manager->createSequence($sequence);
            $action = 'create sequence';
            if (MDB2::isError($result)) {
                if ($result->getCode() == MDB2_ERROR_NO_PERMISSION
                    || $result->getCode() == MDB2_ERROR_ACCESS_VIOLATION)
                {
                    $this->markTestSkipped("Test user lacks permission to $action");
                }
                $this->fail("Could not $action: " . $result->getUserInfo());
            }
        }

        //test
        $start = $this->db->nextId($sequence);
        $def = $this->db->reverse->getSequenceDefinition($sequence);
        $this->assertEquals($start+1, (isset($def['start']) ? $def['start'] : 1), 'Error getting sequence definition');

        //cleanup
        $result = $this->db->manager->dropSequence($sequence);
        $this->assertFalse(MDB2::isError($result), 'Error dropping a sequence');
    }

    /**
     * Test getTriggerDefinition($trigger)
     * @dataProvider provider
     */
    public function testGetTriggerDefinition($ci) {
        $this->manualSetUp($ci);

        //setup
        $trigger_name = 'test_trigger';

        if (!$this->nonstd) {
            $this->markTestSkipped('No Nonstandard Helper for this phptype.');
        }

        $action = 'create trigger';
        $result = $this->nonstd->createTrigger($trigger_name, $this->table);
        if (MDB2::isError($result)) {
            if ($result->getCode() == MDB2_ERROR_NO_PERMISSION
                || $result->getCode() == MDB2_ERROR_ACCESS_VIOLATION)
            {
                $this->markTestSkipped("Test user lacks permission to $action");
            }
            $this->fail("Could not $action: " . $result->getUserInfo());
        }

        //test
        $def = $this->db->reverse->getTriggerDefinition($trigger_name);
        if (MDB2::isError($def)) {
            $this->fail('getTriggerDefinition: '.$def->getUserInfo());
        } else {
            $this->nonstd->checkTrigger($trigger_name, $this->table, $def);
        }

        //cleanup
        $result = $this->nonstd->dropTrigger($trigger_name, $this->table);
        if (MDB2::isError($result)) {
            $this->fail('Error dropping the trigger: '.$result->getUserInfo());
        }
    }
}
