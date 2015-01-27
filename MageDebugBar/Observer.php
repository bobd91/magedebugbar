<?php

namespace MageDebugBar;

class Observer {

    /**
     * Use the same pattern for all observers to ensure that
     * only developers can access the DebugBar
     */
    public function http_response_send_before($observer) {
        if(\Mage::helper('core')->isDevAllowed()) {
            $this->_http_response_send_before($observer);
        }
    }

    /**
     * Called just before the Magento generated HTML is returned to the browser
     * Add the DebugBar HTML to the head and body
     */
    private function _http_response_send_before($observer) {
        $response = $observer->getResponse();
        $renderer = \Mage::App()->getDebugBar()->getJavascriptRenderer("/js/DebugBar");

        $response->setBody($this->_insertHeadBody($response->getBody(), $renderer->renderHead(), $renderer->render()));
    }

    /**
     * Insert $head and $body into $html just before </head> and </body> tags
     */
    private function _insertHeadBody($html, $head, $body) {
        // Positions in Magento HTML at start of </head> and </body> tags
        $headIndex = $bodyIndex = 0;

        // Set up the xml parser to examine closing head and body tags
        $parser = xml_parser_create();
        xml_parser_set_option($parser, XML_OPTION_CASE_FOLDING, false);
        xml_set_element_handler($parser, false, function($parser, $name) use (&$headIndex, &$bodyIndex) {
            switch($name) {
            case 'head': $headIndex = $this->_closeTagIndex($parser, $name); break;
            case 'body': $bodyIndex = $this->_closeTagIndex($parser, $name); break;
            }
        });

        // Note: ignore xml_parse result as it returns failure even for warnings
        xml_parse($parser, $html, true);
        xml_parser_free($parser);

        $start = substr($html, 0, $headIndex);
        $middle = substr($html, $headIndex, $bodyIndex - $headIndex);
        $end = substr($html, $bodyIndex);
        return $start . $head. $middle . $body. $end;

    }
   
    private function _closeTagIndex($parser, $name) {
        // current byte is at end of closing tag so - (3 + strlen($name)) gives start
        return  xml_get_current_byte_index($parser) - (3 + strlen($name));
    }

}
