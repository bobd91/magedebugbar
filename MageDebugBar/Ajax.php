<?php

namespace MageDebugBar;

class Ajax {

    public function run() {
        if(isset($_GET['block'])) {
            $block = \Mage::getConfig()->getBlockClassName($_GET['block']);
            if($block) {
                $ref = new \ReflectionClass($block);
                $file = (new \ReflectionClass($block))->getFileName();
                $this->_process($ref->getFileName(), $ref->getStartLine());
            } else {
                // Not found
                http_response_code(404);
            }
        } else if(isset($_GET['file'])) {
            $file = MAGENTO_ROOT . DS . $_GET['file'];
            if(file_exists($file)) {
                $line = isset($_GET['line']) ? $_GET['line'] : 1;
                $this->_process($file, $line);
            } else {
                // Not found
                http_response_code(404);
            }
        }
    }

    protected function _process($file, $line) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file);
        finfo_close($finfo);
        if('application/xml' === $mime) {
                $mime = 'text/xml';
        }
        if(0 === strpos($mime, "text/")) {
            $rel = substr($file, strlen(MAGENTO_ROOT));
            $content = file_get_contents($file);
            echo json_encode([
                "path" =>  $rel,
                "line" => $line,
                "mime-type" => $mime,
                "content" => $content]);
        } else {
            // Unsupported media type
            http_response_code(415);
        }
    }
}
