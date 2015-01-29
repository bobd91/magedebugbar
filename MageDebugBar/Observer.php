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
     *
     * Searching for </head> and </body> might be enough but 
     * <script> tags could easily contain strings with </...> in
     * so we have to cater for the worse case and actually parse the html
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

        // PHP does not give enough control over libxml2 to avoid entity errors
        // and valid HTML entities are not necessarily valid XML entities 
        // so we blank out all entities first
        $mangled = preg_replace_callback('/&[a-z]+;/', function($match) { return str_repeat(' ', strlen($match[0])); }, $html);

        xml_parse($parser, $mangled, true);
        xml_parser_free($parser);

        $start = substr($html, 0, $headIndex);
        $middle = substr($html, $headIndex, $bodyIndex - $headIndex);
        $end = substr($html, $bodyIndex);
        return $start . $head. $middle . $body. $end;
    }
   
    /**
     * Return start position of closing tag just found by parser
     * The current positon is at end of closing tag so
     * "- (3 + strlen($name))" gives start position
     */
    private function _closeTagIndex($parser, $name) {
        return  xml_get_current_byte_index($parser) - (3 + strlen($name));
    }

}
