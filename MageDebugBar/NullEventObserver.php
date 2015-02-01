<?php

namespace MageDebugBar;

/**
 * Ignore all events
 */
class NullEventObserver {

    public function __call($x, $y) {
    }
}
