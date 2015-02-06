<?php

namespace MageDebugBar;

class ConfigCollector extends \DebugBar\DataCollector\DataCollector
{
    protected $_config;
    protected $_files = array();

    public function collect()
    {
        $this->_config = new ConfigItem();
        $this->_collectModuleConfig(\Mage::App()->getConfig());
        $this->_collectLayoutConfig(\Mage::App()->getLayout());
        return ['files' => $this->_files, 'config' => $this->_config->find('config')];
    }

    public function getName()
    {
        return 'config';
    }

    protected function _collectModuleConfig($mageConfig) {
        $resourceConfig = sprintf('config.%s.xml', $this->_getResourceConnectionModel($mageConfig, 'core'));
        $mageConfig->loadModulesConfiguration(array('config.xml',$resourceConfig), $this, $this);
    }

    protected function _collectLayoutConfig($config) {
    }
    
    /**
     * Called for each module config file by mageconfig->loadModulesConfiguration
     */
    public function loadFile($filePath)
    {
        if (!is_readable($filePath)) {
            return false;
        }
        $fileID = $this->_addFile($filePath);
        $current = $this->_config;
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

        return true;
    }

    /**
     * Required by Mage_Core_Model_Config_Base::loadModulesConfiguration
     * but we don't need to do anything as loadFile merges as it goes
     */
    public function extend($x, $y) {}


    protected function _addFile($path) {
        return 1 + ($this->_files[] = $this->_relativePath($path));
    }

    protected function _relativePath($path) {
        return substr($path, 1 + strlen(\Mage::getBaseDir()));
    }

    /**
     * Copied from app/code/core/Mage/Core/Model/Config.php
     * With $mageConfig instead of $this
     * Original not available as protected method and we are not a subclass
     */
    protected function _getResourceConnectionModel($mageConfig, $moduleName = null)
    {
        $config = null;
        if (!is_null($moduleName)) {
            $setupResource = $moduleName . '_setup';
            $config        = $mageConfig->getResourceConnectionConfig($setupResource);
        }
        if (!$config) {
            $config = $mageConfig->getResourceConnectionConfig(Mage_Core_Model_Resource::DEFAULT_SETUP_RESOURCE);
        }
    }
}
