-- MySQL dump 10.13  Distrib 5.5.41, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: yovalue_user_template
-- ------------------------------------------------------
-- Server version	5.5.41-0ubuntu0.14.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `edge_content`
--

DROP TABLE IF EXISTS `edge_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `edge_content` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `graph_id` int(11) NOT NULL,
  `local_content_id` int(11) NOT NULL,
  `type` varchar(255) NOT NULL,
  `label` varchar(255) NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `graph_id` (`graph_id`,`local_content_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `edge_content`
--

LOCK TABLES `edge_content` WRITE;
/*!40000 ALTER TABLE `edge_content` DISABLE KEYS */;
/*!40000 ALTER TABLE `edge_content` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `graph`
--

DROP TABLE IF EXISTS `graph`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `graph` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `graph` longtext NOT NULL,
  `cloned_from_graph_id` int(11) DEFAULT NULL,
  `cloned_from_graph_history_step` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cloned_from_auth_id` int(11) DEFAULT NULL,
  `cloned_to` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `graph`
--

LOCK TABLES `graph` WRITE;
/*!40000 ALTER TABLE `graph` DISABLE KEYS */;
/*!40000 ALTER TABLE `graph` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `graph_history`
--

DROP TABLE IF EXISTS `graph_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `graph_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `graph_id` int(11) NOT NULL,
  `step` int(11) NOT NULL,
  `timestamp` int(20) NOT NULL,
  `elements` longtext NOT NULL,
  `node_mapping` longtext,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `graph_history`
--

LOCK TABLES `graph_history` WRITE;
/*!40000 ALTER TABLE `graph_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `graph_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `graph_settings`
--

DROP TABLE IF EXISTS `graph_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `graph_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `graph_id` int(11) NOT NULL,
  `settings` longtext NOT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `auth_id` (`graph_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `graph_settings`
--

LOCK TABLES `graph_settings` WRITE;
/*!40000 ALTER TABLE `graph_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `graph_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migration_status`
--

DROP TABLE IF EXISTS `migration_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `migration_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `migration_name` varchar(255) DEFAULT NULL,
  `migration_timestamp` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migration_status`
--

LOCK TABLES `migration_status` WRITE;
/*!40000 ALTER TABLE `migration_status` DISABLE KEYS */;
/*!40000 ALTER TABLE `migration_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `node_content`
--

DROP TABLE IF EXISTS `node_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `node_content` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `graph_id` int(11) NOT NULL,
  `local_content_id` int(11) NOT NULL,
  `alternative_id` int(11) NOT NULL,
  `active_alternative_id` tinyint(4) NOT NULL DEFAULT '0',
  `p` text NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `reliability` double DEFAULT NULL,
  `importance` int(11) DEFAULT NULL,
  `label` varchar(8000) DEFAULT NULL,
  `text` text,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL,
  `has_icon` tinyint(4) DEFAULT '0',
  `stickers` text,
  `cloned_from_graph_id` int(11) DEFAULT NULL,
  `cloned_from_local_content_id` int(11) DEFAULT NULL,
  `cloned_from_auth_id` int(11) DEFAULT NULL,
  `value_type` varchar(255) DEFAULT NULL,
  `value_range` longtext,
  PRIMARY KEY (`id`),
  KEY `graph_id` (`graph_id`,`local_content_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `node_content`
--

LOCK TABLES `node_content` WRITE;
/*!40000 ALTER TABLE `node_content` DISABLE KEYS */;
/*!40000 ALTER TABLE `node_content` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `node_content_falsification`
--

DROP TABLE IF EXISTS `node_content_falsification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `node_content_falsification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `graph_id` int(11) NOT NULL,
  `local_content_id` int(11) NOT NULL,
  `alternative_id` int(11) NOT NULL DEFAULT '0',
  `name` varchar(255) NOT NULL,
  `comment` text NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `node_content_falsification`
--

LOCK TABLES `node_content_falsification` WRITE;
/*!40000 ALTER TABLE `node_content_falsification` DISABLE KEYS */;
/*!40000 ALTER TABLE `node_content_falsification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `node_content_history`
--

DROP TABLE IF EXISTS `node_content_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `node_content_history` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `graph_id` int(11) NOT NULL,
  `local_content_id` int(11) NOT NULL,
  `datetime` datetime NOT NULL,
  `type` varchar(255) DEFAULT NULL,
  `reliability` int(11) DEFAULT NULL,
  `importance` int(11) DEFAULT NULL,
  `label` varchar(255) DEFAULT NULL,
  `text` text,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL,
  `has_icon` tinyint(4) DEFAULT '0',
  `snap_timestamp` bigint(20) unsigned DEFAULT NULL,
  `alternative_id` int(10) unsigned DEFAULT NULL,
  `active_alternative_id` int(10) unsigned DEFAULT NULL,
  `p` text,
  `stickers` text,
  PRIMARY KEY (`id`),
  KEY `datetime` (`datetime`),
  KEY `node_content_id` (`graph_id`,`local_content_id`),
  KEY `snap_timestamp_idx` (`snap_timestamp`),
  KEY `local_content_id_alternative_id_idx` (`local_content_id`,`alternative_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `node_content_history`
--

LOCK TABLES `node_content_history` WRITE;
/*!40000 ALTER TABLE `node_content_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `node_content_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `node_content_source`
--

DROP TABLE IF EXISTS `node_content_source`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `node_content_source` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `auth_id` int(11) DEFAULT NULL,
  `graph_id` int(11) NOT NULL,
  `local_content_id` int(11) NOT NULL,
  `alternative_id` int(11) NOT NULL DEFAULT '0',
  `pages` varchar(255) NOT NULL,
  `comment` text NOT NULL,
  `source_id` int(11) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `node_content_source`
--

LOCK TABLES `node_content_source` WRITE;
/*!40000 ALTER TABLE `node_content_source` DISABLE KEYS */;
/*!40000 ALTER TABLE `node_content_source` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `source`
--

DROP TABLE IF EXISTS `source`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `source` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `source_type` enum('book','textbook','news','article','meta-article','personal experience') NOT NULL,
  `field_type` varchar(255) NOT NULL DEFAULT '',
  `name` varchar(255) NOT NULL,
  `url` varchar(255) NOT NULL,
  `author` varchar(255) NOT NULL,
  `editor` varchar(255) DEFAULT NULL,
  `publisher` varchar(255) NOT NULL,
  `publisher_reliability` int(11) NOT NULL DEFAULT '0',
  `scopus_title_list_id` int(11) DEFAULT NULL,
  `publish_date` varchar(255) NOT NULL,
  `comment` text NOT NULL,
  `cloned_from_id` int(11) DEFAULT NULL,
  `cloned_from_auth_id` int(11) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `source`
--

LOCK TABLES `source` WRITE;
/*!40000 ALTER TABLE `source` DISABLE KEYS */;
/*!40000 ALTER TABLE `source` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `testableapp_queries`
--

DROP TABLE IF EXISTS `testableapp_queries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `testableapp_queries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `query` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `testableapp_queries`
--

LOCK TABLES `testableapp_queries` WRITE;
/*!40000 ALTER TABLE `testableapp_queries` DISABLE KEYS */;
/*!40000 ALTER TABLE `testableapp_queries` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-09-03 13:42:59
