<?php

namespace MageDebugBar;

class LayoutCollector 
    extends \DebugBar\DataCollector\DataCollector 
    implements \DebugBar\DataCollector\Renderable
{
    protected $_root;
    protected $_current;

    public function __construct() {
        $this->_root = new LayoutBlock();
        $this->_current = $this->_root;
    }

    public function collect()
    {
        assert($this->_current == $this->_root);
        return $this->_root;
    }

    public function getName()
    {
        return 'layout';
    }

    public function collectStartBlock($block) {
        $this->_current = $this->_current->addBlock($block);
    }

    public function collectEndBlock($block) {
        $this->_current = $this->_current->getParent();
    }

    public function getWidgets()
    {
        return array(
            "layout" => array(
                "widget" => "MageDebugBar.LayoutTab",
                "map" => "layout",
                "default" => "[]"
            )
        );
    }
}
