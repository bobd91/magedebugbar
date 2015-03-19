<?php

/**
 * Stores information on a single Magento layout config item
 * from a Magento layout file.
 *
 * Children of this item are stored in their own LayoutConfigItems and
 * referenced from this one.
 *
 * @author  Bob Davison
 * @version 1.0
 */
namespace MageDebugBar;

class LayoutConfigItem {

    /**
     * Parent LayoutConfigItem, null for root of tree
     *
     * protected so it will not be included in JSON
     */
    protected $_parent;

    // Public attributes are exposed to json_encode
    // so will be downloaded to browser

    /**
     * XML element name of config item
     */
    public $name;

    /**
     * Associative array of XML attributes as name => value
     */
    public $attrs;

    /**
     * Child nodes, array of LayoutConfigItems
     */
    public $elems;

    /**
     * Index number of config file storing this config item
     * Config file paths are stored in LayoutConfig
     */
    public $file;

    /**
     * Line number in file where this item is defined
     */
    public $line;

    /**
     * XML text of this element, trimmed of leading/trailing whitespace
     */
    public $data;

    /**
     * Create new LayoutConfigItem
     * Root item in tree will call with no params
     */
    public function __construct($parent = null, $name = null, $attrs = [], $file = null, $line = null) {
        $this->_parent = $parent;
        $this->name = $name;
        $this->attrs = $attrs;
        $this->elems = [];
        $this->file = $file;
        $this->line = $line;
        $this->data = '';
    }

    /**
     * The opening XML tag of a new config item has been detected
     * So create a new LayoutConfigItem as a child of this one
     *
     * @return    the new LayoutConfigItem
     */
    public function open($name, $attrs, $file, $line) {
        $elem = new LayoutConfigItem($this, $name, $attrs, $file, $line);
        $this->elems[] = $elem;
        return $elem;
    }

    /**
     * The end XML tag of this config item has been detected
     * So trim any XML text and return this item's parent
     *
     * @return     the parent LayoutConfigItem
     */
    public function close() {
        $this->data = trim($this->data);
        return $this->_parent;
    }

    /**
     * Find the first child of the item with the specified name
     *
     * @param $name    name of the item to find
     * @return         the LayoutConfigItem with that name or null if not found
     */
    public function findFirst($name) {
        $res = $this->findAll($name);
        if(count($res)) {
            return $res[0];
        }
    }

    /**
     * Find all children of this item with the specified name
     *
     * @param $name    the name of the items to find
     * @return         array of LayoutConfigItems with that name
     */
    public function findAll($name) {
        $res = [];
        foreach($this->elems as $elem) {
            if($name == $elem->name) {
                $res[] = $elem;
            }
        }
        return $res;
    }

    /**
     * Add XML text data to this item
     *
     * @param $data     text data to add
     */
    public function addData($data) {
        $this->data .= $data;
    }
}
