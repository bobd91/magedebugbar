<?php

namespace tests;

use \MageDebugBar\LayoutBlock;
use \MageDebugBar\Magento;

class LayoutBlockTest extends \PHPUnit_Framework_TestCase {

    public function setup() {
        chdir('php');
    }

    public function testSimpleNoTemplate() {
        $mock = $this->getMockForAbstractClass('\tests\MockBlock'); 
        $mock->method('getNameInLayout')->willreturn('blockname');
        $mock->method('getData')->willreturn('blocktype');       

        $block = new LayoutBlock(null, $mock, 1);

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'name' => 'blockname',
                'type' => 'blocktype',
                'blocks' => [],
                'template' => '',
                'template_file' => '',
                'id'=>1]),
            json_encode($block));
    }

    public function testSimpleWithTemplate() {
        LayoutBlock::setDirs(getcwd() . '/tests', getcwd() .'/tests/design');

        $mock = $this->getMockForAbstractClass('\tests\MockTemplateBlock'); 
        $mock->method('getNameInLayout')->willreturn('blockname');
        $mock->method('getData')->willreturn('blocktype');       
        $mock->method('getTemplate')->willreturn('a/b.phtml');
        $mock->method('getTemplateFile')->willreturn('store/a/b.phtml');

        $block = new LayoutBlock(null, $mock, 1);

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'name' => 'blockname',
                'type' => 'blocktype',
                'blocks' => [],
                'template' => 'a/b.phtml',
                'template_file' => 'design/store/a/b.phtml',
                'id'=>1]),
            json_encode($block));
    }

    public function testAddBlock() {
        $mock = $this->getMockForAbstractClass('\tests\MockBlock'); 
        $mock->method('getNameInLayout')->willreturn('blockname');
        $mock->method('getData')->willreturn('blocktype');       

        $parent = new LayoutBlock();
        $parent->addBlock($mock, 2);

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'name' => '',
                'type' => '',
                'blocks' => [
                    [
                        'name' => 'blockname',
                        'type' => 'blocktype',
                        'blocks' => [],
                        'template' => '',
                        'template_file' => '',
                        'id' => 2
                    ]
                ],
                'template' => '',
                'template_file' => '',
                'id' => 0 ]),
            json_encode($parent));
    }

}

