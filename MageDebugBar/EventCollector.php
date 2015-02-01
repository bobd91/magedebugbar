<?php

namespace MageDebugBar;

class EventCollector extends \DebugBar\DataCollector\DataCollector
{
    public function collect()
    {
        return "";
    }

    public function getName()
    {
        return 'event';
    }

    public function collectEvent($eventName, $args) {
    }

    public function collectEventObservers($area, $eventName, $observer) {
    }
}
