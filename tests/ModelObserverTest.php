<?php

namespace tests;

use \MageDebugBar\MageDebugBar;

class ModelObserverTest extends \PHPUnit_Framework_TestCase {

    public function setup() {
        require_once('app/code/community/BobD91/MageDebugBar/Model/Observer.php');
    }

    public function testHttpResponseSendBefore() {
        $this->checkEvent('http_response_send_before');
    }

    public function testCoreBlockAbstractToHtmlBefore() {
        $this->checkEvent('core_block_abstract_to_html_before');
    }

    public function testCoreBlockAbstractToHtmlAfter() {
        $this->checkEvent('core_block_abstract_to_html_after');
    }

    protected function checkEvent($event) {
        $bar = $this->getMockBuilder('\tests\MockDebugBar')->getMock();

        $mock = $this->getMockBuilder('\tests\MockModelObserver')->getMock();

        $bar->method('getEventObserver')->willReturn($mock);
        $o = 'test';
        $mock->expects($this->once())->method($event)->with($this->equalTo($o));

        $modelObserver = new \BobD91_MageDebugBar_Model_Observer($bar);
        $modelObserver->$event($o);
    }
}

class MockModelObserver {
    public function http_response_send_before($o) {}
    public function core_block_abstract_to_html_before($o) {}
    public function core_block_abstract_to_html_after($o) {}
}
