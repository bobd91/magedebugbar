<?php

namespace tests;

use MageDebugBar\EventObserver;

class EventObserverTest extends \PHPUnit_Framework_TestCase {

    public function testIsAjax() {    
        $this->withAjax(function() {
            $this->assertTrue(EventObserver::isAjaxCall());
        });
    }


    // No Ajax support so no mods to html
    /*
    public function testAjax() {
        $this->withAjax(function() {
            
        });
        $this->fail("NIY");
    }
  */

    protected function withAjax($f) {    
        try {
            $_SERVER['HTTP_X_REQUESTED_WITH'] = 'xmlhttprequest';
            $f();
        } finally {
            unset($_SERVER['HTTP_X_REQUESTED_WITH']);
        }
    }
}

class MockDebugBar {
    public function getJavascriptRenderer() {
        return new MockJavascriptRenderer();
    }
}

class MockJavascriptRenderer {
    public function render() {
        return "<!-- Render Body -->";
    }
    public function renderHead() {
        return "<!-- Render Head -->";
    }
}

class MockObserver {
    public function getResponse() {
        return new MockResponse();
    }
    public function getData($d) {
        // we only ever call with $d === transport
        return new MockTransport();
    }
}

class MockTransport {
    public function getHtml() {}
    public function setHtml($html) {}
}
