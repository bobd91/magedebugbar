<?php

namespace MageDebugBar;

/**
 * Observer for all MageDebugBar events
 *
 * To add an event to the MageDebugBar it has to be added
 * here and in app/code/community/BobD91/MageDebugBar/Model/Observer.php
 */

class EventObserver {

    /**
     * Called just before the Magento generated HTML is returned to the browser
     * Add the DebugBar HTML to the head and body
     */
    public function http_response_send_before($observer) {
        $response = $observer->getResponse();
        $renderer = \Mage::App()->getDebugBar()->getJavascriptRenderer();

        $response->setBody($this->_insertHeadBody($response->getBody(), $renderer->renderHead(), $renderer->render()));
    }

    /**
     * Called before rendering a block
     * Collect details of block, PHP class and, optionally, template
     */
    public function core_block_abstract_to_html_before($observer) {
        \Mage::App()->getDebugBar()['layout']->collectStartBlock($observer->getData('block'));
    }

    /**
     * Called after rendering a block
     * Used with html_before to get parent/child relationships
     */
    public function core_block_abstract_to_html_after($observer) {
        \Mage::App()->getDebugBar()['layout']->collectEndBlock($observer->getData('block'));
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
