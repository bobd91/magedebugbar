<?php

namespace MageDebugBar;

class LayoutBlock implements \JsonSerializable {
    protected $_blocks = [];
    protected $_parent;
    protected $_name;
    protected $_type;
    protected $_template;

    public function __construct($parent = null, $block = null) {
        if($block) {
            $this->_parent = $parent;
            $this->_name = $block->getIsAnonymous() ? "(anonymous)" : $block->getNameInLayout();
            $this->_type = $block->getData('type');
            $this->_template = method_exists($block, "getTemplate") ? $block->getTemplate() : "";
        }
    }

    public function addBlock($block) {
        $b = new LayoutBlock($this, $block);
        $this->_blocks[] = $b;
        return $b; 
    }

    public function getParent() {
        return $this->_parent;
    }

    public function jsonSerialize() {
        $a = [];
        $a['values'] = [
            $this->_name ? $this->_name : 'Layout', 
            $this->_type ? $this->_type : '', 
            $this->_template ? $this->_template : ''
        ];
        if(count($this->_blocks)) {
            $a['children'] = [];
            foreach($this->_blocks as $block) {
                $a['children'][] = $block->jsonSerialize();
            }
        }
        return $a;
    }
}
