//MAIN

MyCanvas.setSize(700, 500);
MyCanvas.setFrameRate(30);      
MyCanvas.changeState(HelloWorld);


function HelloWorld()  
{

    var that = this;              
    var fontString;
	
    MyCanvas.setStartFunction(
	function start()
    {
       fontString = MyCanvas.getFontString('sans-serif', 20, "normal");
    });
     
    MyCanvas.setBodyFunction(
	that.body = function()
    {
        MyCanvas.fillString("HELLO WORLD!", MyCanvas.width / 2, MyCanvas.height / 2, fontString, 'black', true);
    }); 
	
} 