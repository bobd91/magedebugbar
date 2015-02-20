<?php
namespace MageDebugBar;

class MageDebugBar extends \DebugBar\DebugBar {

    public function __construct()
    {

//        $this->addCollector(new ConfigCollector());
        $this->addCollector(new LayoutCollector());
//        $this->addCollector(new EventCollector());
//        $this->addCollector(new ModelCollector());
//        $this->addCollector(new RequestCollector());

        $this->getJavascriptRenderer("/js/DebugBar")->addAssets(
            ['magedebugbar.css', 'treegridview.css'],
            ['magedebugbar.js', 'treegridview.js'],
            '/js/MageDebugBar',
            '/js/MageDebugBar'
        ); 
    }

    /**
     * If not a developer then substitute a
     * NullCollector for the actual one
     */
    public function addCollector(\DebugBar\DataCollector\DataCollectorInterface $collector) {
        if(!\Mage::helper('core')->isDevAllowed()) {
            $collector = new NullCollector($collector);
        }
        parent::addCollector($collector);
    }

    /**
     * If not a developer then substitute
     * a NullEventObserver for the real one
     */
    public function getEventObserver() {
        if(\Mage::helper('core')->isDevAllowed()) {
            return new EventObserver();
        } else {
            return new NullEventObserver();
        }
    }
}
