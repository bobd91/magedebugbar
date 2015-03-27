<?php
/**
 * Handles all ajax requests to magedebugbar.php
 * after magdebugbar.php has set up Magento environment
 *
 * @author Bob Davison
 * @version 1.0
 */
namespace MageDebugBar;

class Ajax {

    const HTTP_FORBIDDEN = 403;
    const HTTP_NOT_FOUND = 404;
    const HTTP_UNSUPPORTED_MEDIA_TYPE = 415;

    // Magento facade
    protected $_magento;

    /**
     * To minimize coupling with Magento we inject a Magento facade
     *
     * @param   object that provides access to Magento functionality
     */
    public function __construct($magento) {
        $this->_magento = $magento;
    }

    /**
     * Entry point from magedebugbar.php
     *
     * Uses query string to decide what to return:
     *
     *   block= load class file for Magento block alias
     *   method= optionally find line for method (default is line of class defn)
     *
     *   helper= load class file for Magento helper alias
     *   method= optionally find line for method (default is line of class defn)
     *
     *   file= load file, path specified relative to Magento root
     *   line= optionally specify line (default is 1)
     *
     *   config-flag= return value of store config-flag
     *   store= for this store id
     * 
     * Sets http failure codes under the following circumstances:
     *   403 Forbidden - IP Address is not for a Magento developer
     *   404 Not Found - Requested object is not found
     *   415 Unsupported Media Type - Requested file is not text
     *
     * File based requests echo JSON
     *  {
     *      'type': 'file'
     *      'path': Magento relative file path
     *      'line': line number
     *      'mime-type': mime type of file content (always text/...)
     *      'content': text content of file
     *      }
     *
     * For config flag request echo JSON
     * {
     *  'type': alert
     *  'message': message to display in browser
     * }
     */
    public function run() {
        if($this->_magento->isDevAllowed()) {
            if(isset($_GET['block'])) {
                $block = $this->_magento->getBlockClassName($_GET['block']);
                $method = isset($_GET['method']) ? $_GET['method'] : null;
                $this->_processClass($block, $method);
            } else if(isset($_GET['helper'])) {
                $helper = $this->_magento->getHelperClassName($_GET['helper']);
                $method = isset($_GET['method']) ? $_GET['method'] : null;
                $this->_processClass($helper, $method);
            } else if(isset($_GET['file'])) {
                $file = $this->_magento->getBaseDir() . '/' . $_GET['file'];
                $line = (isset($_GET['line']) && is_numeric($_GET['line'])) ? intval($_GET['line']) : 1;
                $this->_processFile($file, $line);
            } else if(isset($_GET['config-flag'])) {
                $flag = $this->_magento->getStoreConfigFlag($_GET['config-flag'], $_GET['store']);
                $this->_processFlag($_GET['config-flag'], $flag);
            }
        } else {
            http_response_code(self::HTTP_FORBIDDEN);
        }
    }

    /**
     * Echo alert message JSON for config flag request
     *
     * @param $flag  string name of config flag
     * @param $val   boolean value of config flag 
     */
    protected function _processFlag($flag, $val) {
        $res = $val ? 'True' : 'False';
        $message = "$flag = $res";
        echo json_encode([
            'type' => 'alert',
            'message' => $message
        ]);
    }

    /**
     * Echo file message JSON for class and method
     *
     * If method is specified but cannot be located then
     * attempt to locate the PHP __call method
     *
     * @param $class  name of class
     * @param $method name of method, null means return line of class defn
     */
    protected function _processClass($class, $method) {
        if($class) {
            $ref = new \ReflectionClass($class);
            if($method) {
                $ref = $this->_getMethodOrCall($ref, $method);
            }
            $this->_processFile($ref->getFileName(), $ref->getStartLine());
        } else {
            http_response_code(self::HTTP_NOT_FOUND);
        }
    }

    /**
     * Lookup ReflectioMethod for given method or '__call' method
     *
     * @param $ref     ReflectionClass owning the method
     * @param $method  name of the method
     * @return         ReflectionMethod of method or '__call'
     */
    protected function _getMethodOrCall($ref, $method) {
        $res = $this->_try_getMethod($ref, $method);
        if(!$res) {
            $res = $this->_try_getMethod($ref, '__call');
        }
        return $res;
    }
 
    /**
     * Try to get ReflectionMethod for method
     * without throwing an exception if the
     * method is not found
     *
     * @param     ReflectionClass owing the method
     * @param     method name
     * @returns   ReflectionMethod or null if method not found
     */ 
    protected function _try_getMethod($ref, $method) {
        try {
            return $ref->getMethod($method);
        } catch(\ReflectionException $e) {
            // ignore
        }
    }

    /**
     * Echo file message JSON for file and line
     *
     * Set http error codes
     *   404 Not Found if file dose not exist
     *   415 Unsupported Media Type if file is not mime-type 'text/...'
     *
     * @param $file  absolute file path
     * @param $line  line number
     */
    protected function _processFile($file, $line) {
        if(file_exists($file)) {
            $mime = $this->_mimeType($file);    
           if(0 === strpos($mime, "text/")) {
                $rel = substr($file, 1 + strlen($this->_magento->getBaseDir()));
                $content = file_get_contents($file);
                echo json_encode([
                    "type" => "file",
                    "path" =>  $rel,
                    "line" => $line,
                    "mime-type" => $mime,
                    "content" => $content]);
            } else {
                http_response_code(self::HTTP_UNSUPPORTED_MEDIA_TYPE);
            }
        } else {
            http_response_code(self::HTTP_NOT_FOUND);
        }
    }

    /**
     * Return mime type for file
     * Changes application/xml to text/xml
     * as we only handle text/... mime types
     * but are happy with xml
     *
     * @param $file   absolute file path
     * @return mime-type as string
     */
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
