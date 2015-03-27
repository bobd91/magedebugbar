<?php
/**
 * Keeps track of information for rendered layout blocks
 * Blocks can contain other blocks so the tree structure is maintained.
 *
 * Will be JSON encoded and sent to the browser for processing
 *
 * @author Bob Davison
 * @version 1.0
 */
namespace MageDebugBar;

class LayoutBlock {

    // Magento root and design directories
    // shared between all instances
    protected static $_rootdir;
    protected static $_designdir;


    // Protected attributes will not be json_encoded
    // Parent of this block, empty if root
    protected $_parent;


    // Public attributes are exposed to json_encode
    // and so downloaded to the browser

    /**
     * Name of this block
     */
    public $name = '';

    /**
     * Magento block alias of this block
     */
    public $type = '';

    /**
     * Array of child blocks
     */
    public $blocks = [];

    /**
     * MageDebugBar unique id for this block
     */
    public $id = null;

    /**
     * Magento template file (may not be one)
     */ 
    public $template = '';

    /**
     * Magento root relative path to template file (may not be one)
     */
    public $template_file = '';

    /**
     * Construct a new LayoutBlock
     * Not all layout blocks have templates so check if they do before attempting
     * to get the values
     *
     * @param $parent   the parent block in the tree, root node has not parent
     * @param $block    the Magento block, root block has no associated info
     * @param $id       a unique identifier for the block#
     */
    public function __construct($parent = null, $block = null, $id = 0) {
        if($block) {
            $this->_parent = $parent;
            $this->id = $id;
            $this->name = $block->getNameInLayout();
            $this->type = $block->getData('type');
            $this->blocks = [];
            if(method_exists($block, 'getTemplate') && method_exists($block, 'getTemplateFile')) {
                $this->template = $block->getTemplate();
                $this->template_file = $this->_templateDir($block->getTemplateFile());
            }
            // Avoid 'null' and 'undefined' in JSON
            if(!$this->type) {
                $this->type = '';
            }
            if(!(isset($this->template) && $this->template)) {
                $this->template = $this->template_file = "";
            }
        }
    }

    // Return file path relative to Magento root 
    protected function _baseDir($path) {
        if(0 == strpos($path, self::$_rootdir)) {
            return substr($path, 1 + strlen(self::$_rootdir));
        } else {
            return $path;
        }
    }

    // Return path to template file relative to Magento root
    protected function _templateDir($template) {
        return $this->_baseDir(self::$_designdir . '/' . $template);
    }

    /**
     * Adds a new block as a child of this block
     *
     * @param $block   the Magento block to add
     * @param $id      the unique id for the block
     * @return         the new block
     */
    public function addBlock($block, $id) {
        $b = new LayoutBlock($this, $block, $id);
        $this->blocks[] = $b;
        return $b; 
    }

    /**
     * Return the parent of this block
     *
     * @return    this blocks parent
     */
    public function getParent() {
        return $this->_parent;
    }

    /**
     * Return this blocks unique id
     *
     * @return     this blocks id
     */
    public function id() {
        return $this->id;
    }

    /**
     * Sets the Magento root and design directories
     * Required for makeing template file names relative to Magento root
     * All blocks share the same values
     *
     * @param $rootdir   magento root directory
     * @param $designdir magento design directory
     */
    public static function setDirs($rootdir,  $designdir) {
        self::$_rootdir = $rootdir;
        self::$_designdir = $designdir;
    }
}
