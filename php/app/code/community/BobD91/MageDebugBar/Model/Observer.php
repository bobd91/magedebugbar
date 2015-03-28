<?php

/**
 * Observer for all MageDebugBar events
 *
 * All events are delegated to MageDebugBar#getObserver()
 * It would be nice to simply implement __call() rather than
 * each method but unfortunately Magento checks that the event
 * handler method exists before it calls it
 *
 * To add an event to the MageDebugBar it has to be added
 * here and in \MageDebugBar\Observer.php
 *
 * @author Bob Davison
 * @version 1.0
 */

// Allow loading of Composer based classes
require_once "vendor/autoload.php";

class BobD91_MageDebugBar_Model_Observer {

    protected $_delegate;

    /**
     * Create MageDebugBar event observer delegate that will handle all events
     *
     * @param $debugbar    the debugbar instance to get the event observer delegate from
     *                     will always be null when running in Magento
     */
    public function __construct($debugbar = null) {
        // This is to allow test substitution of the debugbar instance
        $debugbar = $debugbar
            ? $debugbar
            : new  MageDebugBar\MageDebugBar(new MageDebugBar\Magento());

        $this->_delegate = $debugbar->getEventObserver();
    }

    /**
     * Event called just prior to the html being output to the browser
     */
    public function http_response_send_before($observer) {
        $this->_delegate->http_response_send_before($observer);
    }

    /**
     * Event called just before to a block being rendered
     */
    public function core_block_abstract_to_html_before($observer) {
        $this->_delegate->core_block_abstract_to_html_before($observer);
    }

    /**
     * Event called just after a block has been rendered
     */
    public function core_block_abstract_to_html_after($observer) {
        $this->_delegate->core_block_abstract_to_html_after($observer);
    }

}
