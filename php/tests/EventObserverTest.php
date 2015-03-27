<?php

namespace tests;

use MageDebugBar\EventObserver;
use MageDebugBar\MageDebugBar;

class EventObserverTest extends \PHPUnit_Framework_TestCase {

    public function setup() {
        chdir('php');
        require_once "tests/DebugBar.php";

        $this->response = $this->getMockBuilder('\tests\MockResponse')->getMock();

        $this->observer = $this->getMockBuilder('\tests\MockObserver')->getMock();
        $this->observer->method('getResponse')->willreturn($this->response);

        $renderer = $this->getMockBuilder('\tests\MockJavascriptRenderer')->getMock();
        $renderer->method('renderHead')->willreturn('<!-- Render Head -->');
        $renderer->method('render')->willreturn('<!-- Render Body -->');

        $this->bar = $this->getMockBuilder('\tests\MockDebugBar')->getMock();
        $this->bar->method('getJavascriptRenderer')->willreturn($renderer);
    }

    public function testIsAjaxCall() {    
        $this->withAjax(function() {
            $this->assertTrue(EventObserver::isAjaxCall());
        });
    }

    // No Ajax support so no mods to html
    public function testAjax() {
        $this->response->expects($this->never())->method('setBody');    

        $this->withAjax(function() {
            (new EventObserver($this->bar))->http_response_send_before($this->observer);
        });
    }

    public function testHtmlGood() {
        $top = '<html><head><title></title>';
        $middle = '</head><body><h1>';
        $bottom = '</body></html>';
        $this->response->method('getBody')
            ->willreturn($top . $middle . $bottom);
        $this->response->expects($this->once())
            ->method('setBody')
            ->with($this->equalTo($top . '<!-- Render Head -->' . $middle . '<!-- Render Body -->' . $bottom)); 

        (new EventObserver($this->bar))->http_response_send_before($this->observer);
    }

    public function testHtmlBad() {
        $top = '<html><head><title></title><!-- </head></body> -->';
        $middle = '</head><body><h1>';
        $bottom = '</body></html>';
        $this->response->method('getBody')
            ->willreturn($top . $middle . $bottom);
        $this->response->expects($this->once())
            ->method('setBody')
            ->with($this->equalTo($top . $middle . $bottom)); 

        (new EventObserver($this->bar))->http_response_send_before($this->observer);
    }

    public function testStartBlocks() {
        $collector = $this->getMockBuilder('\tests\MockCollector')->getMock();

        $this->bar->method('offsetGet')
            ->willreturn($collector);

        $this->observer->method('getData')->willReturn('test data');
        $collector->expects($this->exactly(1))
            ->method('collectStartBlock')
            ->with($this->equalTo('test data'));

        (new EventObserver($this->bar))->core_block_abstract_to_html_before($this->observer);
    }

    public function testMarkDivBlock() {
        $this->checkBlock('<div />...', true);
    }

    public function testSkipEmptyBlock() {
        $this->checkBlock('  ');
    }

    public function testSkipDoctypeBlock() {
        $this->checkBlock('<!DOCTYPE html>');
    } 

    public function testSkipHtmlBlock() {
        $this->checkBlock('<html>...');
    } 

    public function testSkipScriptBlock() {
        $this->checkBlock('<script>...');
    } 

    protected function checkBlock($html, $marked = false) {
        $collector = $this->getMockBuilder('\tests\MockCollector')->getMock();
        $this->bar->method('offsetGet')
            ->willreturn($collector);

        $id = 56;
        $mark = "<span data-blockid='$id'></span>";

        $transport = $this->getMockBuilder('\tests\MockTransport')->getMock();
        $transport->method('getHtml')->willReturn($html);

        $this->observer->method('getData')->will($this->returnValueMap(
            array(
                array('block','test data'),
                array('transport',$transport)
            )
        ));

        $collector->expects($this->exactly(1))
            ->method('collectEndBlock')
            ->with($this->equalTo('test data'))
            ->willReturn($id);

        if($marked) {
           $transport->expects($this->once())->method('setHtml')->with($mark . $html . $mark);
        } else {
           $transport->expects($this->never())->method('setHtml');
        }

        (new EventObserver($this->bar))->core_block_abstract_to_html_after($this->observer);
    }

    protected function withAjax($f) {    
        try {
            $_SERVER['HTTP_X_REQUESTED_WITH'] = 'xmlhttprequest';
            $f();
        } finally {
            unset($_SERVER['HTTP_X_REQUESTED_WITH']);
        }
    }
}


class MockJavascriptRenderer {
    public function render() { }
        public function renderHead() { }
}

class MockObserver {
    public function getResponse() {}
        public function getData($d) {}
}

class MockResponse {
    public function getBody() {}
        public function setBody($b) {}
}

class MockTransport {
    public function getHtml() {}
        public function setHtml($html) {}
}

class MockCollector {
    public function collectStartBlock($b) {}
    public function collectEndBlock($b) {}
}
