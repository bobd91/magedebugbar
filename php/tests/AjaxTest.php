<?php

namespace tests;

class AjaxTest extends \PHPUnit_Framework_TestCase {

    protected $magento;

    public function setup() {
        chdir('php');
        $this->magento = $this->getMockBuilder('\MageDebugBar\Magento')->getMock();
        $this->magento
            ->method('getBaseDir')
            ->willReturn(getcwd() . '/tests');
        $this->magento
            ->method('isDevAllowed')
            ->willreturn(true);
    }

    public function testNotDeveloper() {
        $this->magento = $this->getMockBuilder('\MageDebugBar\Magento')->getMock();
        $this->magento
            ->method('isDevAllowed')
            ->willreturn(false);

        (new \MageDebugBar\Ajax($this->magento))->run();

        $this->assertEquals(403, http_response_code(), 'Expected HTTP Failure');

    }

    public function testNoSuchFile() {
        $_GET['file'] = 'files/nosuchfile';
        $_GET['line'] = '2';

        (new \MageDebugBar\Ajax($this->magento))->run();

        $this->assertEquals(404, http_response_code(), 'Expected HTTP Not Found');
    }

    public function testUnsupportedFileType() {
        $_GET['file'] = 'files/ajax.bin';
        $_GET['line'] = '2';

        (new \MageDebugBar\Ajax($this->magento))->run();

        $this->assertEquals(415, http_response_code(), 'Expected HTTP Unsupported Media Type');
    }

    public function testPhpFileNoLine() {
        $_GET['file'] = 'files/ajax.php';

        $this->expectFileResponse('files/ajax.php', 1, 'text/x-php');

        (new \MageDebugBar\Ajax($this->magento))->run();
    }

    public function testPhpFileLine() {
        $_GET['file'] = 'files/ajax.php';
        $_GET['line'] = '4';

        $this->expectFileResponse('files/ajax.php', 4, 'text/x-php');

        (new \MageDebugBar\Ajax($this->magento))->run();
    }

    public function testXmlFileLine() {
        $_GET['file'] = 'files/ajax.xml';
        $_GET['line'] = '2';

        $this->expectFileResponse('files/ajax.xml', 2, 'text/xml');

        (new \MageDebugBar\Ajax($this->magento))->run();
    }

   public function testBlockNoMethod() {
        require_once('tests/files/ajax.php');

        $this->magento
            ->method('getBlockClassName')
            ->will($this->returnArgument(0));

        $_GET['block'] = '\tests\files\ajax';

        $this->expectFileResponse('files/ajax.php', 5, 'text/x-php');

        (new \MageDebugBar\Ajax($this->magento))->run();
    }

    public function testBlockMethod() {
        require_once('tests/files/ajax.php');

        $this->magento
            ->method('getBlockClassName')
            ->will($this->returnArgument(0));

        $_GET['block'] = '\tests\files\ajax';
        $_GET['method'] = 'someMethod';

        $this->expectFileResponse('files/ajax.php', 9, 'text/x-php');

        (new \MageDebugBar\Ajax($this->magento))->run();
    }

    public function testBlockMissingMethod() {
        require_once('tests/files/ajax.php');

        $this->magento
            ->method('getBlockClassName')
            ->will($this->returnArgument(0));

        $_GET['block'] = '\tests\files\ajax';
        $_GET['method'] = 'noSuchMethod';

        $this->expectFileResponse('files/ajax.php', 7, 'text/x-php');

        (new \MageDebugBar\Ajax($this->magento))->run();
    }

    public function testHelperMethod() {
        require_once('tests/files/ajax.php');

        $this->magento
            ->method('getHelperClassName')
            ->will($this->returnArgument(0));

        $_GET['helper'] = '\tests\files\ajax';
        $_GET['method'] = 'someMethod';

        $this->expectFileResponse('files/ajax.php', 9, 'text/x-php');

        (new \MageDebugBar\Ajax($this->magento))->run();
    }

    public function testStoreConfigFlag() {
        $this->magento
            ->method('getStoreConfigFlag')
            ->willreturn(true);

        $_GET['config-flag'] = 'some flag';
        $_GET['store'] = 'some store';

        $this->expectOutputString(json_encode([
            'type' => 'alert',
            'message' => 'some flag = True']));

        (new \MageDebugBar\Ajax($this->magento))->run();
    }

    public function testStoreIdUsed() {
        $this->magento
             ->expects($this->once())
             ->method('getStoreConfigFlag')
             ->with(
                 $this->equalTo('some flag'),
                 $this->equalTo('some store'));

        $_GET['config-flag'] = 'some flag';
        $_GET['store'] = 'some store';

        $this->expectOutputRegex("*flag*"); // Consume echo statements

        (new \MageDebugBar\Ajax($this->magento))->run();
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
