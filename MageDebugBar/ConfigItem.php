<?php

namespace MageDebugBar;

class ConfigItem implements \JsonSerializable {

    protected
        $_name,
        $_attrs,
        $_elems,
        $_file,
        $_line,
        $_data;

    public function __construct($name = null, $attrs = [], $file = null, $line = null) {
        $this->_name = $name;
        $this->_attrs = $attrs;
        $this->_elems = [];
        $this->_file = $file;
        $this->_line = $line;
        $this->_data = '';
    }

    public function open($name, $attrs, $file, $line) {
        $elem = $this->find($name);
        if($elem) {
            $elem->overwrite($attrs, $file, $line);
        } else {
            $elem = new ConfigItem($name, $attrs, $file, $line);
            $this->_elems[] = $elem;
        }
        return $elem;
    }

    public function close() {
        $this->_data = trim($this->_data);
    }

    public function find($name) {
        foreach($this->_elems as $elem) {
            if($name == $elem->_name) {
                return $elem;
            }
        }
    }

    protected function overwrite($attrs, $file, $line) {
        $this->_attrs = $attrs;
        $this->_file = $file;
        $this->_line = $line;
        $this->_data = '';
        return $this;
    }

    public function addData($data) {
        $this->_data .= $data;
    }

    public function jsonSerialize() {
        $a = [];
        if($this->_file) $a['%'] = $this->_file . ":" . $this->_line;
        if($this->_data) $a['$'] = $this->_data;
        foreach($this->_attrs as $attr => $value) {
            $a["@$attr"] = $value;
        }
        foreach($this->_elems as $name => $elem) {
            $a[$elem->_name] = $elem->jsonSerialize();
        }
        return $a;
    }

}
