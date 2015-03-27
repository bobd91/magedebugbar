<?php

namespace tests;

use \MageDebugBar\LayoutConfig;
use \MageDebugBar\Magento;

class LayoutConfigTest extends \PHPUnit_Framework_TestCase {

    public function setup() {
        chdir('php');
        $this->basedir = getcwd() . '/tests';
    }

    public function testMissingFile() {
        $config = new LayoutConfig(['h1'], $this->basedir);
        $config->loadFile('tests/files/nosuch.file');

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'handles' => [
                    [
                        'name' => 'h1',
                        'elems' => []
                    ]
                ],
                'files' => []
            ]),
            json_encode($config));
    }   

    public function testFileNoLayout() {
        $config = new LayoutConfig(['h2'], $this->basedir);
        $config->loadFile(getcwd() . '/tests/files/layoutconfig.nolayout.xml');

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'handles' => [
                    [
                        'name' => 'h2',
                        'elems' => []
                    ]
                ],
                'files' => ['files/layoutconfig.nolayout.xml']
            ]),
            json_encode($config));
    }

    public function testFileNoMatchingHandle() {
        $config = new LayoutConfig(['nosuchhandle'], $this->basedir);
        $config->loadFile(getcwd() . '/tests/files/layoutconfig.1.xml');

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'handles' => [
                     [
                        'name' => 'nosuchhandle',
                        'elems' => []
                    ]
               ],
                'files' => ['files/layoutconfig.1.xml']
            ]),
            json_encode($config));
    }

    public function testSingleFile() {
        $config = new LayoutConfig(['h1', 'h3'], $this->basedir);
        $config->loadFile(getcwd() . '/tests/files/layoutconfig.1.xml');

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'handles' => [
                     [
                        'name' => 'h1',
                        'elems' => [
                            [
                                'name' => 'elem1',
                                'attrs' => [],
                                'elems' => [],
                                'file' => 0,
                                'line' => 4,
                                'data' => ''
                            ]
                        ]
                    ],
                    [
                        'name' => 'h3',
                        'elems' => [
                            [
                                'name' => 'elem3',
                                'attrs' => ['a3' => 'v3'],
                                'elems' => [],
                                'file' => 0,
                                'line' => 10,
                                'data' => 'Content 3'
                            ]
                        ]
                    ]
               ],
                'files' => ['files/layoutconfig.1.xml']
            ]),
            json_encode($config));
    }

    public function testMultipleFiles() {
        $config = new LayoutConfig(['h1', 'h2'], $this->basedir);
        $config->loadFile(getcwd() . '/tests/files/layoutconfig.1.xml');
        $config->loadFile(getcwd() . '/tests/files/layoutconfig.2.xml');

        $this->assertJsonStringEqualsJsonString(
            json_encode([
                'handles' => [
                     [
                        'name' => 'h1',
                        'elems' => [
                            [
                                'name' => 'elem1',
                                'attrs' => [],
                                'elems' => [],
                                'file' => 0,
                                'line' => 4,
                                'data' => ''
                            ]
                        ]
                    ],
                    [
                        'name' => 'h2',
                        'elems' => [
                            [
                                'name' => 'elem2',
                                'attrs' => [],
                                'elems' => [],
                                'file' => 0,
                                'line' => 7,
                                'data' => ''
                            ],
                            [
                                'name' => 'elem22',
                                'attrs' => [],
                                'elems' => [],
                                'file' => 1,
                                'line' => 4,
                                'data' => ''
                            ]
                        ]
                    ]
               ],
                'files' => ['files/layoutconfig.1.xml', 'files/layoutconfig.2.xml']
            ]),
            json_encode($config));
    }
}

