<?php

namespace MageDebugBar;

/**
 * Observer for all MageDebugBar events
 *
 * To add an event to the MageDebugBar it has to be added
 * here and in app/code/community/BobD91/MageDebugBar/Model/Observer.php
 *
 * @auther Bob Davison
 * @version 1.0
 */

class EventObserver {

    // Don't put identifying <div> around these elements as they are not display elements
    const DONT_MARK_ELEMENTS = ['html', 'head', 'title', 'meta', 'base', 'style', 'script', 'link', 'object', 'body'];
    const MAX_ELEM_LENGTH = 6;

    /**
     * The MageDebugBar
     */
    protected $_debugbar;

    /**
     * Provide access to the MageDebugBar
     *
     * @param   the MageDebugBar
     */
    public function __construct($debugbar) {
        $this->_debugbar = $debugbar;
    }

    /**
     * Called just before the Magento generated HTML is returned to the browser
     * Add the DebugBar HTML to the head and body
     *
     * @param $observer   Magento observer
     */
    public function http_response_send_before($observer) {
        $response = $observer->getResponse();
        $renderer = $this->_debugbar->getJavascriptRenderer();

        if(self::isAjaxCall()) {
            /* No Ajax support at the moment
             * Leave the result unmodified
            */
        } else {
            $response->setBody($this->_insertHeadBody($response->getBody(), $renderer->renderHead(), $renderer->render()));
        }
    }

    /**
     * Check if request was made by Ajax
     *
     * @return true if made via Ajax, otherwise false
     */
    public static function isAjaxCall() {
        return isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest';
    }

    /**
     * Called before rendering a block
     * Collect details of block, PHP class and, optionally, template
     *
     * @param $observer   Magento observer
     */
    public function core_block_abstract_to_html_before($observer) {
        $this->_debugbar['layout']->collectStartBlock($observer->getData('block'));
    }

    /**
     * Called after rendering a block
     * Used with html_before to get parent/child relationships
     * Also add markers to html to allow blocks to be highlighted on the client
     *
     * @param $observer   Magento observer
     */
    public function core_block_abstract_to_html_after($observer) {
        $blockid = $this->_debugbar['layout']->collectEndBlock($observer->getData('block'));
        $this->_markBlock($blockid, $observer->getData('transport'));
    }

    /**
     * Add marker to given block (if ok to mark)
     *
     * @param $blockid    unique identifier for each block
     * @param $transport  Magento transport object
     */
    protected function _markBlock($blockid, $transport) {
        $html = $transport->getHtml();
        if($this->_shouldMarkHtml($html)) {
            $mark = "<span data-blockid='$blockid'></span>";
            $transport->setHtml($mark . $html . $mark);
        }
    }

    /**
     * Check if block is ok to mark
     * Blocks are ok if they occur in the body of the html
     * so rule out empty blocks, doctypes and non-body elements
     *
     * @param $html   the html to check
     * @return        true if the block should be marked
     */
    protected function _shouldMarkHtml($html) {
        $trim = trim($html);
        if(0 === strlen($trim)) {
            return false;
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
     * which case we are out of options
     *
     * @param $html   the original html
     * @param $head   content to be added before </head>
     * @param $body   content to be added before </body>
     * @return        possibly modified html
     */
    private function _insertHeadBody($html, $head, $body) {
        // Positions in Magento HTML at start of </head> and </body> tags
        $headIndex = $this->_findUnique($html, '</head>');
        $bodyIndex = $this->_findUnique($html, '</body>');;

        if($headIndex == false || $bodyIndex == false) {
            return $html;
        }

        $start = substr($html, 0, $headIndex);
        $middle = substr($html, $headIndex, $bodyIndex - $headIndex);
        $end = substr($html, $bodyIndex);
        return $start . $head. $middle . $body. $end;
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
