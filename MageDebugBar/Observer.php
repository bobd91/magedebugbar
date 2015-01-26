<?php

namespace MageDebugBar;

class Observer {

    public function http_response_send_before($observer) {
        $response = $observer->getResponse();
        $renderer = Mage::App()->getDebugBar()->getJavascriptRenderer();
        
        $doc = Sunra\PhpSimple\HtmlDomParser::str_get_html($response->getBody());

        $doc->set_callback(function($element) use ($renderer) {
            switch($element->tag) {
            case 'head': $element->innertext = $element->innertext . $renderer->renderHead();
                         break;
            case 'body': $element->innertext = $element->innertext . $renderer->render();
            }
        });

        $response->setBody($doc->save());
    }
}
