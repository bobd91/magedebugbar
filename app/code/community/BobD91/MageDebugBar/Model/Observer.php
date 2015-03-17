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
 */

require_once "vendor/autoload.php";

class BobD91_MageDebugBar_Model_Observer {

    protected $_delegate;

    public function __construct() {
        $this->_delegate = MageDebugBar\MageDebugBar::getBar()->getEventObserver();
    }

    public function http_response_send_before($observer) {
        $this->_delegate->http_response_send_before($observer);
    }

    public function core_block_abstract_to_html_before($observer) {
        $this->_delegate->core_block_abstract_to_html_before($observer);
    }

    public function core_block_abstract_to_html_after($observer) {
        $this->_delegate->core_block_abstract_to_html_after($observer);
    }
}
