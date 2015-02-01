<?php

namespace MageDebugBar;

class ConfigCollector extends \DebugBar\DataCollector\DataCollector
{
    public function collect()
    {
        $this->collectModuleConfig(Mage::App()->getConfig());
        $this->collectLayoutConfig(Mage::App()->getLayout());
        return "";
    }

    public function getName()
    {
        return 'config';
    }

    public function collectModuleConfig($config) {
    }

    public function collectLayoutConfig($config) {
    }
}
