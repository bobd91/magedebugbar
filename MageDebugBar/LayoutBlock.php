<?php

namespace MageDebugBar;

class LayoutBlock {

    protected $_parent = "";

    // Public attributes are exposed to json_encode
    // and so downloaded to the browser
    public $name;
    public $type;
    public $blocks;
    public $id;
    public $template;
    public $template_file;

    public function __construct($parent = null, $block = null, $id = 0) {
        if($block) {
            $this->_parent = $parent;
            $this->id = $id;
            $this->name = $block->getNameInLayout();
            $this->type = $block->getData('type');
            $this->blocks = [];
            if(method_exists($block, 'getTemplate') && method_exists($block, 'getTemplateFile')) {
                $this->template = $block->getTemplate();
                $this->template_file = $this->_templateDir($block->getTemplateFile());
            }
            // Avoid 'null' and 'undefined' in JSON
            if(!(isset($this->template) && $this->template)) {
                $this->template = $this->template_file = "";
            }
        }
    }

    protected function _baseDir($path) {
        if(0 == strpos($path, Magento::getBaseDir())) {
            return substr($path, 1 + strlen(Magento::getBaseDir()));
        } else {
            return $path;
        }
    }

    protected function _templateDir($template) {
        return $this->_baseDir(Magento::getBaseDir('design') . '/' . $template);
    }

    public function addBlock($block, $id) {
        $b = new LayoutBlock($this, $block, $id);
        $this->blocks[] = $b;
        return $b; 
    }

    public function getParent() {
        return $this->_parent;
    }

    public function id() {
        return $this->id;
    }
}
