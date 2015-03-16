<?php

namespace MageDebugBar;

class Ajax {

    public function run() {
        if(Magento::isDevAllowed()) {
            if(isset($_GET['block'])) {
                $block = Magento::getBlockClassName($_GET['block']);
                $method = isset($_GET['method']) ? $_GET['method'] : null;
                $this->_processClass($block, $method);
            } else if(isset($_GET['helper'])) {
                $helper = Magento::getHelperClassName($_GET['helper']);
                $method = isset($_GET['method']) ? $_GET['method'] : null;
                $this->_processClass($helper, $method);
            } else if(isset($_GET['file'])) {
                $file = Magento::getBaseDir() . '/' . $_GET['file'];
                $line = (isset($_GET['line']) && is_numeric($_GET['line'])) ? intval($_GET['line']) : 1;
                $this->_processFile($file, $line);
            } else if(isset($_GET['config-flag'])) {
                $flag = Magento::getStoreConfigFlag($_GET['config-flag'], $_GET['store']);
                $this->_processFlag($_GET['config-flag'], $flag);
            }
        } else {
            // Forbidden
            http_response_code(403);
        }
    }

    protected function _processFlag($flag, $val) {
        $res = $val ? 'True' : 'False';
        $message = "$flag = $res";
        echo json_encode([
            'type' => 'alert',
            'message' => $message
        ]);
    }

    protected function _processClass($class, $method) {
        if($class) {
            $ref = new \ReflectionClass($class);
            if($method) {
                $ref = $this->_getMethodOrCall($ref, $method);
            }
            $this->_processFile($ref->getFileName(), $ref->getStartLine());
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

    protected function _processFile($file, $line) {
        if(file_exists($file)) {
            $mime = $this->_mimeType($file);    
           if(0 === strpos($mime, "text/")) {
                $rel = substr($file, 1 + strlen(Magento::getBaseDir()));
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
        } else {
            // Not found
            http_response_code(404);
        }
    }

    protected function _mimeType($file) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mime = finfo_file($finfo, $file);
        finfo_close($finfo);
        if('application/xml' === $mime) {
            $mime = 'text/xml';
        }
        return $mime;
    } 



}
