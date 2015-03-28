PhpDebugBar Widget for Magento
==============================

Installation
------------

### Warning

The composer install will create a symlink {magento root}/lib/vendor for composer based class loading (via vendor/autoload.php)

If you already have a file /lib/vendor in your Magento root then this installation will not be safe.

### Install using composer:

Note: you will need a github account as much of the code is retrieved from github and it may complain that you are requesting too mmuch information and require your github username and password.

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
        },
        {
            "type": "vcs",
            "url": "https://github.com/bobd91/php-debugbar"
        }
        ],
        "extra":{
            "magento-root-dir": "../www/"
        }
    }

Make sure that the "magento-root-dir" points to your Magento installation.

    composer install
