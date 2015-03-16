<?php

namespace MageDebugBar;

class RealMagento {

    public function getBlockClassName($block) {
        return \Mage::getConfig()->getBlockClassName($block);
    }

    public function getHelperClassName($helper) {
        return \Mage::helper($helper);
    }

    public function getStoreConfigFlag($flag, $store) {
        return \Mage::getStoreConfigFlag($flag, $store);
    }

    public function getBaseDir($dir = 'base') {
        return \Mage::getBaseDir($dir);
    }

    public function isDevAllowed() {
        return \Mage::helper('core')->isDevAllowed();
    }

    public function getStoreId() {
        return \Mage::app()->getStore()->getId();
    }

    public function getSingleton($alias) {
        return \Mage::getSingleton($alias);
    }

    public function getConfigNode($node) {
        return \Mage::app()->getConfig()->getNode($node);
    }

    public function getLayoutHandles() {
        return \Mage::app()->getLayout()->getUpdate()->getHandles();
    }
}
