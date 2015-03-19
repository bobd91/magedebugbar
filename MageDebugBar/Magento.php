<?php

/**
 * Provide a facade to Magento functionality
 * to centralise and control interaction
 * between MageDebugBar and Magento
 */
namespace MageDebugBar;

class Magento {

    /**
     * Map a Magento block alias to a PHP class name
     *
     * @param $block     Magento block alias
     * @return           PHP class name
     */
    public function getBlockClassName($block) {
        return \Mage::getConfig()->getBlockClassName($block);
    }

     /**
     * Map a Magento helper alias to a PHP class name
     *
     * @param $block     Magento helper alias
     * @return           PHP class name
     */
   public function getHelperClassName($helper) {
        return \Mage::getConfig()->getHelperClassName($helper);
    }

    /**
     * Find configuration flag value
     *
     * @param $flag     name of configuration flag
     * @param $store    Magento store id
     * @return          the value of the configuration flag in the given store
     */
    public function getStoreConfigFlag($flag, $store) {
        return \Mage::getStoreConfigFlag($flag, $store);
    }

    /**
     * Map Magento base directory name to an absolute path
     *
     * @param $dir    Magento base dir name (default 'base')
     * @return        absolute path of directory
     */
    public function getBaseDir($dir = 'base') {
        return \Mage::getBaseDir($dir);
    }

    /**
     * Check if the current session has developer rights
     *
     * @return     true if a permitted developer, otherwise false
     */
    public function isDevAllowed() {
        return \Mage::helper('core')->isDevAllowed();
    }

    /**
     * Get the current Magento store id
     *
     * @return    current Magento store id
     */
    public function getStoreId() {
        return \Mage::app()->getStore()->getId();
    }

    /**
     * Map Magento model alias to singleton object
     *
     * @param $alias    Magento model alias
     * @return          Magento model singleton
     */
    public function getSingleton($alias) {
        return \Mage::getSingleton($alias);
    }

    /**
     * Get a node from the Magento configuration
     *
     * @param $node     name of node
     * @return          configuration for node
     */
    public function getConfigNode($node) {
        return \Mage::app()->getConfig()->getNode($node);
    }

    /**
     * Get active layout handles
     *
     * @return   array of active handle names
     */
    public function getLayoutHandles() {
        return \Mage::app()->getLayout()->getUpdate()->getHandles();
    }
}
