<?php

namespace tests;

use \MageDebugBar\LayoutBlock;
use \MageDebugBar\Magento;

class LayoutBlockTest extends \PHPUnit_Framework_TestCase {

    public function testSimpleNoTemplate() {
        $mock = $this->getMockForAbstractClass('\tests\MockBlock'); 

        $mock->method('getNameInLayout')
             ->willreturn('blockname');

        $mock->method('getData')
             ->willreturn('blocktype');       

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
        $mag = $this->getMockBuilder('\MageDebugBar\RealMagento')
                    ->getMock();
        $mag->method('getBaseDir')
            ->will($this->returnCallback(function ($dir = null) {
                $base = getcwd() . '/tests';
                if($dir === 'design') {
                    return $base . '/design';
                } else { 
                    return $base;
                }
            }));

        Magento::setMagento($mag);

        $mock = $this->getMockForAbstractClass('\tests\MockTemplateBlock'); 

        $mock->method('getNameInLayout')
             ->willreturn('blockname');

        $mock->method('getData')
             ->willreturn('blocktype');       

        $mock->method('getTemplate')
             ->willreturn('a/b.phtml');

        $mock->method('getTemplateFile')
             ->willreturn('store/a/b.phtml');

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

}



/**
 * Classes to provide the interface to Magento blocks that we use
 */
abstract class MockBlock {
    abstract public function getNameInLayout();
    abstract public function getData($d);
}

abstract class MockTemplateBlock extends MockBlock {
    abstract public function getTemplate();
    abstract public function getTemplateFile();
}
