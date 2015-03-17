<?php

namespace tests;

use \MageDebugBar\LayoutCollector;
use \MageDebugBar\Magento;

class LayoutCollectorTest extends \PHPUnit_Framework_TestCase {

    /*
     *  Testing the LayoutCollector requires lots of scaffolding
     *  as it interacts with many different players  
     */
    public function setup() {
        require_once('tests/files/debugbar.datacollector.php');

        $mock = $this->getMockBuilder('\MageDebugBar\RealMagento')
                     ->getMock();
        $mock->method('getBaseDir') ->willReturn(getcwd() . '/tests');
        $mock->method('getStoreId')->willreturn(1);
        $mock->method('getStoreConfigFlag')->willreturn(false);
        $mock->method('getLayoutHandles')->willreturn(['h1', 'h2']);
        $mock->method('getSingleton')->willreturn(new DummyDesign());
        $mock->method('getConfigNode')->willreturn(\simplexml_load_string("
                <updates>
                    <a>
                        <file>1.xml</file>
                    </a>
                    <b>
                        <file>2.xml</file>
                    </b>
                </updates>
            ", '\tests\DummyElement'));

        \MageDebugBar\Magento::setMagento($mock);

    }

    public function testConfig() {
        $layout = (new LayoutCollector())->collect();

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'handles' => [
                     [
                        'name' => 'h1',
                        'elems' => [
                            [
                                'name' => 'elem1',
                                'attrs' => [],
                                'elems' => [],
                                'file' => 0,
                                'line' => 4,
                                'data' => ''
                            ]
                        ]
                    ],
                    [
                        'name' => 'h2',
                        'elems' => [
                            [
                                'name' => 'elem2',
                                'attrs' => [],
                                'elems' => [],
                                'file' => 0,
                                'line' => 7,
                                'data' => ''
                            ],
                            [
                                'name' => 'elem22',
                                'attrs' => [],
                                'elems' => [],
                                'file' => 1,
                                'line' => 4,
                                'data' => ''
                            ]
                        ]
                    ]
               ],
                'files' => ['files/layoutconfig.1.xml', 'files/layoutconfig.2.xml']
            ]),
            json_encode($layout['config']));
 
    }

    public function testBlocks() {
        $collector = new LayoutCollector();

        $m1 = $this->getMockForAbstractClass('\tests\MockBlock'); 
        $m1->method('getNameInLayout')->willreturn('block1');
        $m1->method('getData')->willreturn('type1');       

        $m2 = $this->getMockForAbstractClass('\tests\MockBlock'); 
        $m2->method('getNameInLayout')->willreturn('block2');
        $m2->method('getData')->willreturn('type2');       

        $m3 = $this->getMockForAbstractClass('\tests\MockBlock'); 
        $m3->method('getNameInLayout')->willreturn('block3');
        $m3->method('getData')->willreturn('type3');       

        $collector->collectStartBlock($m1);
        $collector->collectStartBlock($m2);
        $collector->collectEndBlock($m2);
        $collector->collectStartBlock($m3);
        $collector->collectEndBlock($m3);
        $collector->collectEndBlock($m1);

        $layout = $collector->collect();

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'name' => '',
                'type' => '',
                'blocks' => [
                    [
                        'name' => 'block1',
                        'type' => 'type1',
                        'blocks' => [
                            [
                                'name' => 'block2',
                                'type' => 'type2',
                                'blocks' => [],
                                'id' => 1,
                                'template' => '',
                                'template_file' => ''
                            ],
                            [
                                'name' => 'block3',
                                'type' => 'type3',
                                'blocks' => [],
                                'id' => 2,
                                'template' => '',
                                'template_file' => ''
                            ]
                        ],
                        'id' => 0,
                        'template' => '',
                        'template_file' => ''
                    ] 
                ],
                'id' => null,
                'template' => '',
                'template_file' => ''
            ]),
            json_encode($layout['blocks']));
    }

    public function testStore() {
        $layout = (new LayoutCollector())->collect();

        $this->assertEquals(1, $layout['store']);
    }

}

class DummyDesign {
    public function getArea() { return 'tests'; }
    public function getPackageName() { return 'files'; }
    public function getTheme() { return 'layoutconfig'; }
    public function getNode() { return null; }
    public function getLayoutFilename($file, $params) {
        return getcwd() . '/' . $params['_area'] . '/' . $params['_package'] . '/' . $params['_theme'] . "." . $file;
    }
}

// Methods required from Varien_Simplexml_Element
class DummyElement extends \SimpleXMLElement {
    public function asArray() {
        $result = array();
        // add attributes
        foreach ($this->attributes() as $attributeName => $attribute) {
            if ($attribute) {
                $result['@'][$attributeName] = (string)$attribute;
            }
        }
        // add children values
        if ($this->hasChildren()) {
            foreach ($this->children() as $childName => $child) {
                $result[$childName] = $child->asArray();
            }
        } else {
            if (empty($result)) {
                // return as string, if nothing was found
                $result = (string) $this;
            } else {
                // value has zero key element
                $result[0] = (string) $this;
            }
        }
        return $result;
    }

    public function hasChildren()
    {
        if (!$this->children()) {
            return false;
        }

        // simplexml bug: @attributes is in children() but invisible in foreach
        foreach ($this->children() as $k=>$child) {
            return true;
        }
        return false;
    }

}
