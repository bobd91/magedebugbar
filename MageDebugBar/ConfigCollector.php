<?php

namespace MageDebugBar;

class ConfigCollector extends \DebugBar\DataCollector\DataCollector
{
    public function collect()
    {
        $this->collectConfig(Mage::App()->getConfig());

        return "";
    }

    public function getName()
    {
        return 'config';
    }

    public function collectEvent($eventName, $args) {
    }

    public function collectEventObservers($area, $eventName, $observer) {
    }

    public function collectConfig($config) {
    }

    public function collectModuleConfig($config) {
    }

    public function collectLayoutConfig($config) {
    }
}
