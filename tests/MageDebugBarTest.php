<?php

namespace tests;

use MageDebugBar\MageDebugBar;
use MageDebugBar\Magento;

class MageDebugBarTest extends \PHPUnit_Framework_TestCase {

    public function setup() {
        require_once('tests/DebugBar.php');

        $this->mage = $this->getMockBuilder('\MageDebugBar\Magento')
                     ->getMock();

        $this->bar = $this->getMockBuilder('\MageDebugBar\MageDebugBar')
                    ->setConstructorArgs([$this->mage])
                    ->setMethods(null)
                    ->getMock();
    }

    public function testNotDeveloper() {
        $this->mage->method('isDevAllowed')
                   ->willReturn(false);

        $this->assertInstanceOf('MageDebugBar\NullEventObserver', $this->bar->getEventObserver());
    }

    public function testDeveloper() {
        $this->mage->method('isDevAllowed')
                   ->willReturn(true);

        $this->assertInstanceOf('MageDebugBar\EventObserver', $this->bar->getEventObserver());
    }

}

