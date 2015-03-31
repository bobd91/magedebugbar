PhpDebugBar Widget for Magento
==============================

### Magento Versions

MageDebugBar has only be tested with Magento 1.9, some earlier versions may work however Magento 2 will not.

Installation
------------

### Warning

The composer install will create a symlink {magento root}/lib/vendor for composer based class loading (via vendor/autoload.php)

If you already have a file /lib/vendor in your Magento root then this installation will not be safe.

Note: you will need a github account as much of the code is retrieved from github and it may complain that you are requesting too much information and require your github username and password.

### Install composer

https://getcomposer.org/download/

### Create a directory to hold the composer files

Create the directory near to your Magento root.  I use a directory structure like:

..../vhost/www      - Magento root
..../vhost/composer - Composer files

### Install using composer

Create a composer.json file in the composer directory

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

Then run

    composer install
