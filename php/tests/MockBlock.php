<?php

namespace tests;

/**
 * Class to provide the interface to Magento blocks
 * Well, as much of it as we use anyway
 */
abstract class MockBlock {
    public function getModuleName() { return "Mock"; }
    abstract public function getNameInLayout();
    abstract public function getData($d);
}


