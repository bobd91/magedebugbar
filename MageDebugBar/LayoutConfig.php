<?php
/**
 * Loads Magento layout config files and stores config info
 * for the supplied handles for downloading to the browser
 *
 * @author  Bob Davison
 * @version 1.0
 */
namespace MageDebugBar;

class LayoutConfig {

    // Protected attributes avoid json_encode ing
    /**
     * Base direcotory that all file paths should be stored relative to
     */
    protected $_basedir;


    // Public attributes for json_encode ing

    /**
     * Handle name => array of config items
     */
    public $handles = [];

    /**
     * Array of config file paths
     * Stored separately from handles array to save space
     * Handle array file info stores an index intop this array
     */
    public $files = [];

    /**
     * Sets up the handles array to store the
     * config for each handle
     *
     * @param $handles    array of active handle names
     * @param $basedir    directory that file paths should be stored relative to
     */
    public function __construct($handles, $basedir) {
        $this->_basedir = $basedir;
        foreach($handles as $handle) {
            $h = new \StdClass;
            $h->name = $handle;
            $h->elems = [];
            $this->handles[] = $h;
        }
    }

    /**
     * Load Magento layout config from the given file and store 
     * and config for the handles we are collecting
     *
     * @param $filePath     absolute path to config file
     */
    public function loadFile($filePath) {
        if (!is_readable($filePath)) {
            return;
        }
        $fileID = $this->_addFile($filePath);
        $current = new LayoutConfigItem();
        $parser = xml_parser_create();
        xml_parser_set_option($parser, XML_OPTION_CASE_FOLDING, false);
        xml_set_element_handler($parser,
            function($parser, $name, $props) use (&$current, $fileID) {
                $current = $current->open($name, $props, $fileID, xml_get_current_line_number($parser));
            },
            function($parser, $name) use (&$current) {
                $current = $current->close();
            }
        );
        xml_set_character_data_handler($parser,
            function($parser, $data) use (&$current) {
                $current->addData($data);
            }
        );

        xml_parse($parser, file_get_contents($filePath), true);
        xml_parser_free($parser);

        $this->_extractConfig($current);
    }

    /**
     * Assign Magento layout config items to the correct handle
     * in the handles array.
     * Config items for non-active handles are discarded
     *
     * @param $config  tree of LayoutConfigItems
     */
    protected function _extractConfig($config) {
        $layout = $config->findFirst("layout");
        if($layout) {
            foreach($this->handles as $handle) {
                foreach($layout->findAll($handle->name) as $handleConfig) {
                    foreach($handleConfig->elems as $elem) {
                        $handle->elems[] = $elem;
                    }
                }
            }
        }
    }

    /**
     * Convert file path to be relative to Magento root and
     * add to the files array
     *
     * @param $path    absolute config file path
     * @return         index in files array
     */
    protected function _addFile($path) {
        $this->files[] = $this->_relativePath($path);
        return count($this->files) - 1;
    }

    /**
     * Make file path to be relative to the Magento root
     * Will fail if the path does not lie within the Magento root
     * but this should never happen for Magento config files
     *
     * @param $path     absolute path to config file
     * @return          path relative to Magento root
     */
    protected function _relativePath($path) {
        return substr($path, 1 + strlen($this->_basedir));
    }
}
