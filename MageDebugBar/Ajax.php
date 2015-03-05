<?php

namespace MageDebugBar;

class Ajax {

    public function run() {
        if(isset($_GET['block'])) {
            $block = \Mage::getConfig()->getBlockClassName($_GET['block']);
            $this->_processClass($block);
        } else if(isset($_GET['helper'])) {
            $helper = \Mage::helper($_GET['helper']);
            $this->_processClass($helper);
        } else if(isset($_GET['file'])) {
            $file = MAGENTO_ROOT . DS . $_GET['file'];
            if(file_exists($file)) {
                $line = isset($_GET['line']) ? $_GET['line'] : 1;
                $this->_process($file, $line);
            } else {
                // Not found
                http_response_code(404);
            }
        } else if(isset($_GET['config-flag'])) {
            $this->_configFlag($_GET['config-flag'], $_GET['store']);
        }
    }

    protected function _configFlag($flag, $store) {
        $res = \Mage::getStoreConfigFlag($flag, $store) ? 'True' : 'False';
        $message = "$flag = $res";
        echo json_encode([
            'type' => 'alert',
            'message' => $message
        ]);
    }

    protected function _processClass($class) {
        if($class) {
            $ref = new \ReflectionClass($class);
            if(isset($_GET['method'])) {
                $ref = $this->_getMethodOrCall($ref, $_GET['method']);
            }
            $this->_process($ref->getFileName(), $ref->getStartLine());
        } else {
            // Not found
            http_response_code(404);
        }
    }

    protected function _getMethodOrCall($ref, $method) {
        $res = $this->_try_getMethod($ref, $method);
        if(!$res) {
            $res = $this->_try_getMethod($ref, '__call');
        }
        return $res;
    }
 
    protected function _try_getMethod($ref, $method) {
        try {
            return $ref->getMethod($method);
        } catch(\ReflectionException $e) {
            // ignore
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
            $rel = substr($file, 1 + strlen(MAGENTO_ROOT));
            $content = file_get_contents($file);
            echo json_encode([
                "type" => "file",
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
