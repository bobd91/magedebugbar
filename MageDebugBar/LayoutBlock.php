<?php

namespace MageDebugBar;

class LayoutBlock implements \JsonSerializable {
    protected $_blocks = [];
    protected $_parent = "";
    protected $_name = "";
    protected $_type = "";
    protected $_template = "";
    protected $_template_file = "";

    public function __construct($parent = null, $block = null) {
        if($block) {
            $this->_parent = $parent;
            $this->_name = $block->getIsAnonymous() ? "(anonymous)" : $block->getNameInLayout();
            $this->_type = $block->getData('type');
            if($block instanceof \Mage_Core_Block_Template) {
                $this->_template = $block->getTemplate();
                $this->_template_file = $this->_templateDir($block->getTemplateFile());
            }
        }
    }

    protected function _baseDir($path) {
        if(0 == strpos($path, MAGENTO_ROOT)) {
            return substr($path, 1 + strlen(MAGENTO_ROOT));
        } else {
            return $path;
        }
    }

    protected function _templateDir($template) {
        return $this->_baseDir(\Mage::getBaseDir('design') . DS . $template);
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
            $this->_type,
            $this->_template
        ];
        if($this->_template_file) {
            $a['template'] = $this->_template_file;
        }
        if(count($this->_blocks)) {
            $a['children'] = [];
            foreach($this->_blocks as $block) {
                $a['children'][] = $block->jsonSerialize();
            }
        }
        return $a;
    }
}
