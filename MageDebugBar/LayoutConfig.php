<?php

namespace MageDebugBar;

class LayoutConfig {

    public function __construct($handles) {
        $this->handles = [];
        foreach($handles as $handle) {
            $h = new \StdClass;
            $h->name = $handle;
            $h->elems = [];
            $this->handles[] = $h;
        }
    }

    public function loadFile($filePath) {
        if (!is_readable($filePath)) {
            return;
        }
        $fileID = $this->_addFile($filePath);
        $current = new LayoutConfigItem();
        $parser = xml_parser_create();
        xml_parser_set_option($parser, XML_OPTION_CASE_FOLDING, false);
        xml_set_element_handler($parser,
            function($parser, $name, $props) use (&$current, $fileID) {
                $current = $current->open($name, $props, $fileID, xml_get_current_line_number($parser));
            },
            function($parser, $name) use (&$current) {
                $current = $current->close();
            }
        );
        xml_set_character_data_handler($parser,
            function($parser, $data) use (&$current) {
                $current->addData($data);
            }
        );

        xml_parse($parser, file_get_contents($filePath), true);
        xml_parser_free($parser);

        $this->_extractConfig($current);
    }

    protected function _extractConfig($config) {
        $layout = $config->findFirst("layout");
        foreach($this->handles as $handle) {
            foreach($layout->findAll($handle->name) as $handleConfig) {
                foreach($handleConfig->elems as $elem) {
                    $handle->elems[] = $elem;
                }
            }
        }
    }

    protected function _addFile($path) {
        $this->files[] = $this->_relativePath($path);
        return count($this->files) - 1;
    }

    protected function _relativePath($path) {
        return substr($path, 1 + strlen(Magento::getBaseDir()));
    }
}
