<?php

namespace MageDebugBar;

class LayoutConfigItem {

    protected $_parent;

    // Public attributes are exposed to json_encode
    // so will be downloaded to browser
    public $name;
    public $attrs;
    public $elems;
    public $file;
    public $line;
    public $data;

    public function __construct($parent = null, $name = null, $attrs = [], $file = null, $line = null) {
        $this->_parent = $parent;
        $this->name = $name;
        $this->attrs = $attrs;
        $this->elems = [];
        $this->file = $file;
        $this->line = $line;
        $this->data = '';
    }

    public function open($name, $attrs, $file, $line) {
        $elem = new LayoutConfigItem($this, $name, $attrs, $file, $line);
        $this->elems[] = $elem;
        return $elem;
    }

    public function close() {
        $this->data = trim($this->data);
        return $this->_parent;
    }

    public function findFirst($name) {
        $res = $this->findAll($name);
        if(count($res)) {
            return $res[0];
        } else {
            return null;
        }
    }

    public function findAll($name) {
        $res = [];
        foreach($this->elems as $elem) {
            if($name == $elem->name) {
                $res[] = $elem;
            }
        }
        return $res;
    }

    public function addData($data) {
        $this->data .= $data;
    }
}
