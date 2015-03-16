<?php

namespace MageDebugBar;

class LayoutCollector 
    extends \DebugBar\DataCollector\DataCollector 
    implements \DebugBar\DataCollector\Renderable
{
    protected $_root;
    protected $_current;
    protected $_config;

    protected $_id = 0;

    public function __construct() {
        $this->_root = new LayoutBlock();
        $this->_current = $this->_root;
    }

    public function collect()
    {
        assert($this->_current == $this->_root);
        return [ 'blocks' => $this->_root, 'config' => $this->_getLayoutConfig(), 'store' => Magento::getStoreId() ];
    }

    public function getName()
    {
        return 'layout';
    }

    public function collectStartBlock($block) {
        $this->_current = $this->_current->addBlock($block, $this->_nextId());
    }

    public function collectEndBlock($block) {
        $blockid = $this->_current->id();
        $this->_current = $this->_current->getParent();
        return $blockid;
    }

    protected function _nextId() {
        return $this->_id++;
    }

    // Modified version of Mage_Core_Model_Layout_Update::getFileLayoutUpdatesXml
    protected function _getLayoutConfig() {
        $storeId = Magento::getStoreId();
        $design = Magento::getSingleton('core/design_package');
        $area = $design->getArea();
        $package = $design->getPackageName();
        $theme = $design->getTheme('layout');

        $updatesRoot = Magento::getConfigNode($area.'/layout/updates');
        $updates = $updatesRoot->asArray();
        $themeUpdates = Magento::getSingleton('core/design_config')->getNode("$area/$package/$theme/layout/updates");
        if ($themeUpdates && is_array($themeUpdates->asArray())) {
            //array_values() to ensure that theme-specific layouts don't override, but add to module layouts
            $updates = array_merge($updates, array_values($themeUpdates->asArray()));
        }
        $updateFiles = array();
        foreach ($updates as $updateNode) {
            if (!empty($updateNode['file'])) {
                $module = isset($updateNode['@']['module']) ? $updateNode['@']['module'] : false;
                if ($module && Magento::getStoreConfigFlag('advanced/modules_disable_output/' . $module, $storeId)) {
                    continue;
                }
                $updateFiles[] = $updateNode['file'];
            }
        }
        // custom local layout updates file - load always last
        $updateFiles[] = 'local.xml';
        $config = new LayoutConfig(Magento::getLayoutHandles());
        foreach ($updateFiles as $file) {
            $config->loadFile($design->getLayoutFilename($file, array(
                '_area'    => $area,
                '_package' => $package,
                '_theme'   => $theme
            )));
        }
        return $config;
    }

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
