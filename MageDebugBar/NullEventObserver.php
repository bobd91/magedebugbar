<?php

/**
 * Special event observer to use when the session does not have developer permissions
 * Consumes all observed events without doing anything
 *
 * @author  Bob Davison
 * @version 1.0
 */
namespace MageDebugBar;

class NullEventObserver {

    /**
     * Ignore all events
     */
    public function __call($x, $y) {
    }
}
