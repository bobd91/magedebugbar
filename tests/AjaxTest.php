<?php

namespace tests;

class AjaxTest extends \PHPUnit_Framework_TestCase {

    protected $mock;

    public function setup() {
        $this->mock = $this->getMockBuilder('\MageDebugBar\RealMagento')
                     ->getMock();
        $this->mock->method('getBaseDir')
             ->willReturn(getcwd() . '/tests');
        $this->mock->method('isDevAllowed')
             ->willreturn(true);

        \MageDebugBar\Magento::setMagento($this->mock);
    }

    public function testNotDeveloper() {
        $this->mock = $this->getMockBuilder('\MageDebugBar\RealMagento')
                     ->getMock();
        $this->mock->method('isDevAllowed')
                   ->willreturn(false);

        \MageDebugBar\Magento::setMagento($this->mock);

        (new \MageDebugBar\Ajax())->run();

        $this->assertEquals(403, http_response_code(), 'Expected HTTP Failure');

    }

    public function testNoSuchFile() {
        $_GET['file'] = 'files/nosuchfile';
        $_GET['line'] = '2';

        (new \MageDebugBar\Ajax())->run();

        $this->assertEquals(404, http_response_code(), 'Expected HTTP Not Found');
    }

    public function testUnsupportedFileType() {
        $_GET['file'] = 'files/ajax.bin';
        $_GET['line'] = '2';

        (new \MageDebugBar\Ajax())->run();

        $this->assertEquals(415, http_response_code(), 'Expected HTTP Unsupported Media Type');
    }

    public function testPhpFileNoLine() {
        $_GET['file'] = 'files/ajax.php';

        $this->expectFileResponse('files/ajax.php', 1, 'text/x-php');

        (new \MageDebugBar\Ajax())->run();
    }

    public function testPhpFileLine() {
        $_GET['file'] = 'files/ajax.php';
        $_GET['line'] = '4';


        $this->expectFileResponse('files/ajax.php', 4, 'text/x-php');

        (new \MageDebugBar\Ajax())->run();
    }

    public function testXmlFileLine() {
        $_GET['file'] = 'files/ajax.xml';
        $_GET['line'] = '2';


        $this->expectFileResponse('files/ajax.xml', 2, 'text/xml');

        (new \MageDebugBar\Ajax())->run();
    }

   public function testBlockNoMethod() {
        require_once('tests/files/ajax.php');

        $this->mock->method('getBlockClassName')
            ->will($this->returnArgument(0));

        $_GET['block'] = '\tests\files\ajax';

        $this->expectFileResponse('files/ajax.php', 5, 'text/x-php');

        (new \MageDebugBar\Ajax())->run();
    }

    public function testBlockMethod() {
        require_once('tests/files/ajax.php');

        $this->mock->method('getBlockClassName')
            ->will($this->returnArgument(0));

        $_GET['block'] = '\tests\files\ajax';
        $_GET['method'] = 'someMethod';

        $this->expectFileResponse('files/ajax.php', 9, 'text/x-php');

        (new \MageDebugBar\Ajax())->run();
    }

    public function testBlockMissingMethod() {
        require_once('tests/files/ajax.php');

        $this->mock->method('getBlockClassName')
            ->will($this->returnArgument(0));

        $_GET['block'] = '\tests\files\ajax';
        $_GET['method'] = 'noSuchMethod';

        $this->expectFileResponse('files/ajax.php', 7, 'text/x-php');

        (new \MageDebugBar\Ajax())->run();
    }

    public function testHelperMethod() {
        require_once('tests/files/ajax.php');

        $this->mock->method('getHelperClassName')
            ->will($this->returnArgument(0));

        $_GET['helper'] = '\tests\files\ajax';
        $_GET['method'] = 'someMethod';

        $this->expectFileResponse('files/ajax.php', 9, 'text/x-php');

        (new \MageDebugBar\Ajax())->run();
    }

    public function testStoreConfigFlag() {
        $this->mock->method('getStoreConfigFlag')
            ->willreturn(true);

        $_GET['config-flag'] = 'some flag';
        $_GET['store'] = 'some store';

        $this->expectOutputString(json_encode([
            'type' => 'alert',
            'message' => 'some flag = True']));

        (new \MageDebugBar\Ajax())->run();
    }

    public function testStoreIdUsed() {

        $this->mock->expects($this->once())
             ->method('getStoreConfigFlag')
             ->with(
                 $this->equalTo('some flag'),
                 $this->equalTo('some store'));

        $_GET['config-flag'] = 'some flag';
        $_GET['store'] = 'some store';

        $this->expectOutputRegex("*flag*"); // Consume echo statements

        (new \MageDebugBar\Ajax())->run();
    }

    protected function expectFileResponse($path, $line, $mime) {
        $this->expectOutputString(json_encode([
            'type' => 'file',
            'path' => $path,
            'line' => $line,
            'mime-type' => $mime,
            'content' => file_get_contents('tests/' . $path)]));
    }


}
