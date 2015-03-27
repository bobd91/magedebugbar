<?php

namespace tests;

use \MageDebugBar\LayoutConfigItem;

class LayoutConfigItemTest extends \PHPUnit_Framework_TestCase {

    public function setup() {
        chdir('php');
    }

    public function testSimple() {
        $simple = new LayoutConfigItem(null, 'simple', [], 2, 3);
        $simple->close();

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'name' => 'simple', 
                'attrs' => [], 
                'elems' => [], 
                'file' => 2, 
                'line' => 3, 
                'data' => '']),
            json_encode($simple));
    }

    public function testNested() {
        $parent = new LayoutConfigItem(null, 'parent');
        $nested = $parent->open('nested', [], 3, 4);
        $result = $nested->close();

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'name' => 'parent', 
                'attrs' => [], 
                'elems' => [ [
                    'name' => 'nested',
                    'attrs' => [],
                    'elems' => [],
                    'file' => 3,
                    'line' => 4,
                    'data' => ''
                ] ],
                'file' => null,
                'line' => null,
                'data' => '']),
            json_encode($result));
    }

    public function testAddData() {
        $data = new LayoutConfigItem(null, 'data', [], 1, 5);
        $data->addData('    hello');
        $data->addData(' there     ');
        $data->close();

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'name' => 'data', 
                'attrs' => [], 
                'elems' => [], 
                'file' => 1, 
                'line' => 5, 
                'data' => 'hello there']),
            json_encode($data));
    }

    public function testAttrs() {
        $attrs = new LayoutConfigItem(null, 'attrs', ['a1' => 'v1', 'a2' => 'v2'], 1, 5);
        $attrs->close();

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'name' => 'attrs', 
                'attrs' => ['a1' => 'v1', 'a2' => 'v2'], 
                'elems' => [], 
                'file' => 1, 
                'line' => 5, 
                'data' => '']),
            json_encode($attrs));
    }

    public function testFindAll() {
        $parent = new LayoutConfigItem(null, 'parent');
        $multi1 = $parent->open('multi', [], 1, 2);
        $multi1->close();
        $parent->open('single', [], 3, 4)->close();
        $multi2 = $parent->open('multi', [], 5, 6);
        $multi2->close();

        $this->assertEquals([$multi1, $multi2], $parent->findAll('multi'));
    }

    public function testFindFirst() {
        $parent = new LayoutConfigItem(null, 'parent');
        $multi1 = $parent->open('multi', [], 1, 2);
        $multi1->close();
        $parent->open('single', [], 3, 4)->close();
        $multi2 = $parent->open('multi', [], 5, 6);
        $multi2->close();

        $this->assertEquals($multi1, $parent->findFirst('multi'));
    }

    public function testFindNoFirst() {
        $parent = new LayoutConfigItem(null, 'parent');
        $multi1 = $parent->open('multi', [], 1, 2);
        $multi1->close();
        $parent->open('single', [], 3, 4)->close();
        $multi2 = $parent->open('multi', [], 5, 6);
        $multi2->close();

        $this->assertNull($parent->findFirst('notthere'));
    }




}
    

