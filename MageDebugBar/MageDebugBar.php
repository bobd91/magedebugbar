<?php
namespace MageDebugBar;

class MageDebugBar extends \DebugBar\DebugBar {

    protected static $_bar;

    public function __construct()
    {

        $this->addCollector(new LayoutCollector());

        $this->getJavascriptRenderer("/js/DebugBar")->addAssets(
            ['tooltips.css', 'magedebugbar.css', 'treegridview.css', 'fileviewer.css', 'tabbox.css', 'layoutviewer.css'],
            ['class.js', 'tooltips.js', 'magedebugbar.js', 'treegridview.js', 'tabbox.js', 'fileviewer.js', 'layoutviewer.js'],
            '/js/MageDebugBar',
            '/js/MageDebugBar'
        ); 

        $this->getJavascriptRenderer()->addAssets(
            [],
            ["https://cdnjs.cloudflare.com/ajax/libs/ace/1.1.8/ace.js"]
        );
    }

    /**
     * If not a developer then substitute
     * a NullEventObserver for the real one
     */
    public function getEventObserver() {
        if(Magento::isDevAllowed()) {
            return new EventObserver();
        } else {
            return new NullEventObserver();
        }
    }

    public static function getBar() {
        if(!isset(self::$_bar)) {
            self::$_bar = new MageDebugBar();
        }
        return self::$_bar;
    }

    public static function setBar($bar) {
        self::$_bar = $bar;
    }
}
