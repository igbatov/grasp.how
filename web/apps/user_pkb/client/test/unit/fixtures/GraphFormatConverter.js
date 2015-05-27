YOVALUE.TestFixtures = YOVALUE.TestFixtures || {};
YOVALUE.TestFixtures.GraphFormatConverter = {};

YOVALUE.TestFixtures.GraphFormatConverter.XMLFromString = {};
YOVALUE.TestFixtures.GraphFormatConverter.XMLFromString.xml_string =
  '<?xml version="1.0" encoding="UTF-8"?>'+
'<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2" xmlns:viz="http://www.gexf.net/1.2draft/viz" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.gexf.net/1.2draft http://www.gexf.net/1.2draft/gexf.xsd">'+
  '<meta lastmodifieddate="2012-05-06">'+
    '<creator>Gephi 0.8</creator>'+
    '<description></description>'+
  '</meta>'+
  '<graph defaultedgetype="directed" timeformat="double" mode="dynamic">'+
    '<nodes>'+
      '<node id="13" label="n12">'+
        '<attvalues></attvalues>'+
        '<viz:size value="10.0"></viz:size>'+
        '<viz:position x="-411.59607" y="-135.8378" z="0.0"></viz:position>'+
        '<viz:color r="153" g="153" b="153"></viz:color>'+
      '</node>'+
      '<node id="14" label="n13">'+
        '<attvalues></attvalues>'+
        '<viz:size value="10.0"></viz:size>'+
        '<viz:position x="428.33105" y="173.86444" z="0.0"></viz:position>'+
        '<viz:color r="153" g="153" b="153"></viz:color>'+
      '</node>'+
      '<node id="15" label="n14">'+
        '<attvalues></attvalues>'+
        '<viz:size value="10.0"></viz:size>'+
        '<viz:position x="96.55853" y="-95.05911" z="0.0"></viz:position>'+
        '<viz:color r="153" g="153" b="153"></viz:color>'+
      '</node>'+
    '</nodes>'+
    '<edges>'+
      '<edge source="13" target="14">'+
        '<attvalues>'+
          '<attvalue for="weight" value="1.0"></attvalue>'+
        '</attvalues>'+
      '</edge>'+
      '<edge source="14" target="15">'+
        '<attvalues>'+
          '<attvalue for="weight" value="1.0"></attvalue>'+
        '</attvalues>'+
      '</edge>'+
    '</edges>'+
  '</graph>'+
'</gexf>';

YOVALUE.TestFixtures.GraphFormatConverter.parseGexfXmlToGexfObj = {};
YOVALUE.TestFixtures.GraphFormatConverter.parseGexfXmlToGexfObj.xml_string =
'<gexf xmlns="http://www.gexf.net/1.2draft" xmlns:viz="http://www.gexf.net/1.2draft/viz" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.gexf.net/1.2draft http://www.gexf.net/1.2draft/gexf.xsd" version="1.2">'+
  '<graph defaultedgetype="directed">'+
    '<attributes class="node">'+
      '<attribute id="0" title="data" type="string"/>'+
      '<attribute id="1" title="type" type="liststring">'+
        '<options>value|fact|belief|hypothesis|question|text</options>'+
        '<default>text</default>'+
      '</attribute>'+
    '</attributes>'+

    '<attributes class="edge">'+
      '<attribute id="0" title="data" type="string"/>'+
      '<attribute id="1" title="isSkeleton" type="boolean">'+
        '<default>1</default>'+
      '</attribute>'+
    '</attributes>'+

    '<nodes>'+
      '<node id="root" label="root">'+
        '<attvalues>'+
         '<attvalue for="0" value="null"/>'+
        '</attvalues>'+
      '</node>'+
      '<node id="71" label="Phylosophy">'+
        '<viz:color r="255" g="255" b="0" a="1"/>'+
        '<attvalues>'+
          '<attvalue for="0" value="{\'name\':\'Phylosophy\',\'text\':\'\'}"/>'+
        '</attvalues>'+
      '</node>'+
    '</nodes>'+

    '<edges>'+
      '<edge id="1" source="root" target="71"/>'+
    '</edges>'+
  '</graph>'+
'</gexf>';