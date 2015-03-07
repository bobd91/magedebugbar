<?php

namespace MageDebugBar;

class LayoutBlock {
    protected $_parent = "";

    public function __construct($parent = null, $block = null) {
        if($block) {
            $this->_parent = $parent;
            $this->name = $block->getNameInLayout();
            $this->type = $block->getData('type');
            $this->blocks = [];
            if($block instanceof \Mage_Core_Block_Template) {
                $this->template = $block->getTemplate();
                $this->template_file = $this->_templateDir($block->getTemplateFile());
            }
            // Avoid 'null' and 'undefined' in JSON
            if(!(isset($this->template) && $this->template)) $this->template = "";
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
        $this->blocks[] = $b;
        return $b; 
    }

    public function getParent() {
        return $this->_parent;
    }
}
