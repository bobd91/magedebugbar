<?php

namespace tests;

class MockDebugBar implements \ArrayAccess {
    public function getEventObserver() {}
    public function getJavascriptRenderer() {}
    public function offsetExists($o) {}
    public function offsetGet($o) {}
    public function offsetSet($o, $v) {}
    public function offsetUnset($o) {}
}

