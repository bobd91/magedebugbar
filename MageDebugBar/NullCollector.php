<?php

namespace MageDebugBar;

/**
 * Null implementation for collector passed into constructor
 *
 * Ignores all unknown method calls so that code such as
 * Mage::App()->getDebugBar['xxx']->collectXXX(...);
 * is a NOOP
 */
class NullCollector extends \DebugBar\DataCollector\DataCollector {

    protected $_name;

    public function __construct($collector) {
        $this->_name = $collector->getName();
    }

    public function getName() {
        return $this->_name;
    }

    public function _call($x, $y) {
        // ignore
    }
}
