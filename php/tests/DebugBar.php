<?php

namespace DebugBar;

class DebugBar {

    public function addCollector($c) {}

    public function getJavascriptRenderer() {
        return new JavascriptRenderer();
    }
}

class JavascriptRenderer {
    public function addAssets($a) {}
}
