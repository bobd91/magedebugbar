<?php

class BobD91_MageDebugBar_Model_Observer {

    public function http_response_send_before($observer) {
        $response = $observer->getResponse();

        $doc = new DOMDocument();
        $doc.loadHTML($response->getBody(), LIBXML_NOWARNING);
        $renderer = Mage::app()->getMageDebugBar()->getJavascriptRenderer();

        $head = $doc->getElementsByTagName('head')->item(0);
        $body = $doc->getElementsByTagName('body')->item(0);

        appendHTML($head, $renderer->renderHead());
        appendHTML($body, $renderer>render());

        $response.setBody($doc->saveHTML());
    }

    private function appendHTML($element, $html) {
        $ne = new DOMElement('temp', $html);
        foreach($ne->childNodes As $node) {
            $element->appendChild($node);
        }
    }
}
