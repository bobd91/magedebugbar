<?php

namespace MageDebugBar;

class ConfigCollector extends \DebugBar\DataCollector\DataCollector
{
    public function collect()
    {
        return "";
    }

    public function getName()
    {
        return 'config';
    }

    public function collectSoftwareConfig($config) {
       # \Mage::log($config->getNode()->asNiceXml());
    }
}
