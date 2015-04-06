<?php
/**
 * The implementation of PHPDebugBar for presenting Magento data
 *
 * @author  Bob Davison
 * @version 1.0
 */ 
namespace MageDebugBar;

class MageDebugBar extends \DebugBar\DebugBar {

    /**
     * Facade to Magento functionality
     */
    protected $_magento;

    /**
     * Add a custom collector, custom css and js files to the DebugBar
     *
     * @param $magento  facade to Magento
     */
    public function __construct($magento) {
        $this->_magento = $magento;
        $this->addCollector(new LayoutCollector($magento));

        $this->getJavascriptRenderer("/js/DebugBar")->addAssets(
            ['magedebugbar.css'],
            ['magedebugbar.js'],
            '/js/MageDebugBar',
            '/js/MageDebugBar'
        ); 
    }

    /**
     * Creates an EventObserver to handle Magento events
     * If not a developer then substitute
     * a NullEventObserver for the real one
     *
     * @return new EventObserver or NullEventObserver
     */
    public function getEventObserver() {
        if($this->_magento->isDevAllowed()) {
            return new EventObserver($this);
        } else {
            return new NullEventObserver();
        }
    }

}
