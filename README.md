PhpDebugBar Widget for Magento
==============================

Installation
------------

### Warning

The composer install will create a symlink {magento root}/lib/vendor for composer based class loading (via vendor/autoload.php)

If you already have a file /lib/vendor in your Magento root then this installation will not be safe.

### Install using composer:

Create a composer.json file
{
    "prefer-stable": true,
    "require": {
        "bobd91/magedebugbar": "@dev"
    },
    "repositories": [
        {
        "type": "composer",
        "url": "http://packages.firegento.com"
    },
    {
        "type": "vcs",
        "url": "https://github.com/bobd91/magedebugbar"
    }
    ],
    "extra":{
        "magento-root-dir": "../www/"
    }
}

Make sure that the "magento-root-dir" points to your Magento installation.

> composer install

To optimize Javascript files:
----------------------------
> # Install requirejs optimizer
> npm install -g requirejs

> # Optimize 
> r.js -o baseUrl=Resources/ name=modules out=Resources/magedebugbar-modules.js paths.ace=empty:

