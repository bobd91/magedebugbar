<?php
/**
 * A DebugBar data collector that collects Magento layout information
 *
 * @author Bob davison
 * @version 1.0
 */
namespace MageDebugBar;

class LayoutCollector 
    extends \DebugBar\DataCollector\DataCollector 
    implements \DebugBar\DataCollector\Renderable
{
    /**
     * The current block being processed
     */
    protected $_block;

    /**
     * The start block
     */
    protected $_rootBlock;

    /**
     * Allows a unique id to be added to each block
     */
    protected $_id = 0;

    /**
     * Facacde to Magento functionality
     */
    protected $_magento;

    /**
     * Sets up the root of the blocks as the blocks tree
     * is built up as Magento events are fired
     * via collectStartBlock and collectEndBlock
     *
     * @param     Magento facade
     */
    public function __construct($magento) {
        $this->_magento = $magento;
        // Directories are shared across all LayoutBlocks
        LayoutBlock::setDirs($magento->getBaseDir(), $magento->getBaseDir('design'));
        $this->_block = $this->_rootBlock = new LayoutBlock();

    }

    /**
     * Gathers all data together so that DebugBar can
     * JSON encode it for downloading to the browser
     *
     * @return  an ssociative array
     *          'blocks' a tree of rendered Magento blocks
     *          'config' the layout page config
     *          'store'  the Magento store id
     */
    public function collect()
    {
        return [ 
            'blocks' => $this->_rootBlock, 
            'config' => $this->_getLayoutConfig(), 
            'store' => $this->_magento->getStoreId() 
        ];
    }

    /**
     * Provide the name of this collector for DebugBar
     *
     * @return the name of ths collector
     */
    public function getName()
    {
        return 'layout';
    }

    /**
     * Gather information about the Magento block about to be rendered
     * Generates a new id for the blocks and sets $_block to the new block
     * @param $block   Magento block being rendered
     */
    public function collectStartBlock($block) {
        // Strange Magento behaviour, if block is disabled sends a 
        // ..to_html_before event but then returns without sending
        // a ..to_html_after event
        // So we ignore it
        if ($this->_magento->getStoreConfigFlag(
                'advanced/modules_disable_output/' . $block->getModuleName(),
                $this->_magento->getStoreId())) {
            return '';
        }
        $this->_block = $this->_block->addBlock($block, $this->_nextId());
    }

    /**
     * Gets the id of the block that has just completed rendering
     * Resets $_block to the parent of this block
     * @param $block   Magento block that has been rendered
     * @return         the unique id generated to identify this block
     */
    public function collectEndBlock($block) {
        $blockid = $this->_block->id();
        $this->_block = $this->_block->getParent();
        return $blockid;
    }

    /**
     * Generates a new unique id
     * @return   unique id
     */
    protected function _nextId() {
        return $this->_id++;
    }

    // Modified version of Mage_Core_Model_Layout_Update::getFileLayoutUpdatesXml
    /**
     * Loads layout configuration for all of Magento and any installed modules
     * Only keeps configuration for the currently active handles
     *
     * This layout has already been loaded by Magento but we need to reload
     * so that we can record file/line number information for configuration items
     *
     * @return    Layout configuration for currently active handles
     */
    protected function _getLayoutConfig() {
        $storeId = $this->_magento->getStoreId();
        $design = $this->_magento->getSingleton('core/design_package');
        $area = $design->getArea();
        $package = $design->getPackageName();
        $theme = $design->getTheme('layout');

        $updatesRoot = $this->_magento->getConfigNode($area.'/layout/updates');
        $updates = $updatesRoot->asArray();
        $themeUpdates = $this->_magento
            ->getSingleton('core/design_config')
            ->getNode("$area/$package/$theme/layout/updates");
        if ($themeUpdates && is_array($themeUpdates->asArray())) {
            //array_values() to ensure that theme-specific layouts don't override, but add to module layouts
            $updates = array_merge($updates, array_values($themeUpdates->asArray()));
        }
        $updateFiles = array();
        foreach ($updates as $updateNode) {
            if (!empty($updateNode['file'])) {
                $module = isset($updateNode['@']['module']) ? $updateNode['@']['module'] : false;
                if ($module && $this->_magento->getStoreConfigFlag('advanced/modules_disable_output/' . $module, $storeId)) {
                    continue;
                }
                $updateFiles[] = $updateNode['file'];
            }
        }
        // custom local layout updates file - load always last
        $updateFiles[] = 'local.xml';
        $config = new LayoutConfig($this->_magento->getLayoutHandles(), $this->_magento->getBaseDir());
        foreach ($updateFiles as $file) {
            $config->loadFile($design->getLayoutFilename($file, array(
                '_area'    => $area,
                '_package' => $package,
                '_theme'   => $theme
            )));
        }
        return $config;
    }

    /**
     * Return information so that we can be installed on the DebugBar menu 
     *
     * @return    DebugBar widget config info
     */
    public function getWidgets() {
        return array(
            "layout" => array(
                "widget" => "MageDebugBar.LayoutTab",
                "map" => "layout",
                "default" => "[]"
            )
        );
    }
}
