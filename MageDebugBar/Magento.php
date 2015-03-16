<?php

namespace MageDebugBar;

class Magento {

    protected static $_magento;

    public static function getMagento()  {
        if(!isset(self::$_magento)) {
            self::$_magento = new RealMagento();
        }
        return self::$_magento;
    }

    public static function setMagento($magento) {
        self::$_magento = $magento;
    }

    public static function __callStatic($name, $arguments) {
        return call_user_func_array(array(self::getMagento(), $name), $arguments ? $arguments : []);
    }
}

