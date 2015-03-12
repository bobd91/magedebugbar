<?php

namespace MageDebugBar;

/**
 * Observer for all MageDebugBar events
 *
 * To add an event to the MageDebugBar it has to be added
 * here and in app/code/community/BobD91/MageDebugBar/Model/Observer.php
 */

class EventObserver {

    // Don't put identifying <div> around these elements as they are not display elements
    const DONT_MARK_ELEMENTS = ['html', 'head', 'title', 'meta', 'base', 'style', 'script', 'link', 'object', 'body'];
    const MAX_ELEM_LENGTH = 6;

    /**
     * Called just before the Magento generated HTML is returned to the browser
     * Add the DebugBar HTML to the head and body
     */
    public function http_response_send_before($observer) {
        $response = $observer->getResponse();
        $debugbar = \Mage::App()->getDebugBar();
        $renderer = $debugbar->getJavascriptRenderer();

        if(self::isAjaxCall()) {
            /* No Ajax support at the moment
             * Leave the result unmodified
            */
        } else {
            $response->setBody($this->_insertHeadBody($response->getBody(), $renderer->renderHead(), $renderer->render()));
        }
    }

    public static function isAjaxCall() {
        return isset($SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
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
     * Also add markers to html to allow blocks to be highlighted on the client
     */
    public function core_block_abstract_to_html_after($observer) {
        $blockid = \Mage::App()->getDebugBar()['layout']->collectEndBlock($observer->getData('block'));
        $this->_markBlock($blockid, $observer->getData('transport'));
    }

    protected function _markBlock($blockid, $transport) {
        $html = $transport->getHtml();
        if($this->_shouldMarkHtml($html)) {
            $html = "<span data-blockid='$blockid'></span>$html<span data-blockid='$blockid'></span>";
            $transport->setHtml($html);
        }
    }

    protected function _shouldMarkHtml($html) {
        $trim = trim($html);
        if(0 === strlen($trim)) {
            return true;
        }
        if('<' === substr($trim, 0, 1)) {
            if('!' === substr($trim, 1, 1)) {
                return false; // <!DOCTYPE
            }
            $rest = strtolower(substr($trim, 1, 6));
            foreach(self::DONT_MARK_ELEMENTS as $not) {
                if($not === substr($rest, 0, strlen($not))) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Insert $head and $body into $html just before </head> and </body> tags
     *
     * Searching for </head> and </body> might be enough but 
     * <script> tags could easily contain strings with </...> in
     * so if we find multiple close tags we try to cater for
     * the worse case and actually parse the html
     * Unfortunately the XML parses take an exception to some HTML
     * if which case we aere out of options
     */
    private function _insertHeadBody($html, $head, $body) {
        // Positions in Magento HTML at start of </head> and </body> tags
        $headIndex = $this->_findUnique($html, '</head>');
        $bodyIndex = $this->_findUnique($html, '</body>');;

        if($headIndex == false || $bodyIndex == false) {
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
        }

        
        if($headIndex == false || $bodyIndex == false) {
            return $html;
        }

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

    // Return index of $needle in $haystack as long as there is only one needle in haystack
    // Otherwise return false
    private function _findUnique($haystack, $needle) {
        $pos = strpos($haystack, $needle);
        return $pos == strrpos($haystack, $needle) 
                ? $pos 
                : false;
    } 

}
