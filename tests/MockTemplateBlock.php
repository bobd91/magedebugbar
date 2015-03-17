<?php

namespace tests;

/**
 * Class to provide the interface to Magento template blocks
 * Well, as much of it as we use anyway
 */
abstract class MockTemplateBlock extends MockBlock {
    abstract public function getTemplate();
    abstract public function getTemplateFile();
}
