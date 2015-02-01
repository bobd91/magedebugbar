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
class BobD91_MageDebugBar_Model_Observer {

    protected $_delegate;

    public function __construct() {
        $_delegate = Mage::App()->getDebugBar()->getEventObserver();
    }

    public function http_send_response_before($observer) {
        $_delegate->http_send_response_before($observer);
    }
}
