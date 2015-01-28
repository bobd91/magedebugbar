<?php

namespace MageDebugBar;

class ConfigBase extends \Mage_Core_Model_Config_Base {

    protected $_fileID;
    protected $_paths;

    public function loadFile($filePath) {
        $this->_fileID = $this->_addPath($filePath);
        return parent::loadFile($filePath);
    }

    public function processFileData($text)
    {
        $res = [];
        $idx = 0;
        $fileID = $this->_fileID;
        $parser = xml_parser_create();
        xml_parser_set_option($parser, XML_OPTION_CASE_FOLDING, false);
        xml_set_element_handler($parser, function($parser, $name, $attribs) use ($text,$fileID, &$res, &$idx) {
            $i = xml_get_current_byte_index($parser);
            $res[] = substr($text, $idx, $i - $idx);
            $idx = $i;
            $line = xml_get_current_line_number($parser);
        #    $res[] = " mdb$this->_fileID='$line'";
        }, false);

        xml_parse($parser, $text, true);

        $res[] = substr($text, $idx);

        return implode($res);
    }

    protected function _addPath($path) {
        $rel = self::mageRelative($path);
        $this->_paths[] = $rel;
        return count($this->_paths);
    }

    public static function mageRelative($path) {
        return '.' . substr($path, strlen(\Mage::getBaseDir()));
    }
}

