//MAIN

MyCanvas.setSize(800, 500);
MyCanvas.setFrameRate(30);      
MyCanvas.changeState(TestDemo, { "keyboard": true }); //example param


function TestDemo(params)   //not "var state = function()" because first changeState function this would not be  visible         
{

    var that = this;              

    var audioTest = null;
    var ghostTexture = null;
    var bgTexture = null;
    var bgPattern = null;
    var degrees = 0;
    var degreesSpeed = 4;
    var circleRadius = 20;
    var rectData = null;
    var gradient;
    var img = null; //Image2D
    var txt = null; //Text2D

    //start function
    MyCanvas.setStartFunction(
	function start()
    {
        if (params["keyboard"]) MyCanvas.initKeyboard(false); //'false' because it doesn't disable browser shortcuts
        //we must initialize both, it's not safe to choose the appropriate input method after checking the running device
        MyCanvas.initMouseAndTouch(true);

        //high level images and texts (HighLevel.js)
        img = new Image2D("Assets/arrow.png", MyCanvas.width / 2, 300, beginImg); 
        txt = new Text2D("Textures test", MyCanvas.width / 2, 65, 'arial', 30, '#000000', true, 'normal');
        txt.fill = false; txt.strokeValue = 5;
        txt.alpha = 0.8;
        //direct images
        ghostTexture = MyCanvas.loadTexture("Assets/ghost.png", function () { bgPattern = MyCanvas.getPattern(bgTexture, 'repeat'); }); //the function is a callback after loading
        bgTexture = MyCanvas.loadTexture("Assets/texture.png", null);
        //audio
        audioTest = MyCanvas.loadAudio("Assets/audio/audioDemo.m4a", true, false);      
        audioTest.volume = 1.0;
        audioTest.loop = true;
        //gradient
        gradient = MyCanvas.ctx.createLinearGradient(0, 0, MyCanvas.width, 25);
        gradient.addColorStop(0, '#C08DD6');
        gradient.addColorStop(1, '#819FD3');
        //it creates the rect using pixel manipulation
        rectData = MyCanvas.ctx.createImageData(MyCanvas.width, 25);
        for (var i = 0; i < rectData.data.length; i += 4)
        {
            rectData.data[i + 0] = 100; //random colors
            rectData.data[i + 1] = Math.random() * 100;
            rectData.data[i + 2] = Math.random() * 255;
            rectData.data[i + 3] = 100;
        }
        //you can also generate a pixel data from a part of canvas, but if the application runs locally there are some issues with Chrome
        //data = MyCanvas.ctx.getImageData(screenX, screenY, width, height);

        //PRELOADING
        MyCanvas.setPreloaderFunction(that.preloader);
        //the canvas can't handle the loading of custom fonts so the loading time should be increased to minimize the possibility that a custom font will load
        //after the application start.
        MyCanvas.fakePreloadTimer = 1; //(seconds)
    });
    
    //Body function, executed every frame
    that.body = function()
    {
        render();
        update();
    }
    MyCanvas.setBodyFunction(that.body); //separated set

    that.preloader = function()
    {
        MyCanvas.defaultPreloader();
        if(MyCanvas.isLoaded())
        {
            //for iphone/ipad that only supports audio with user interaction
            if(audioTest.paused) //play failed
            {
                MyCanvas.audioOnInteraction = audioTest;
            }
        }
    }


    function beginImg() //calback after img loading (Image2D object)
    {
        img.centerOrigin();
        img.setScale(0.8);
    }

    var update = function()
    {
        //keyboard
        if (MyCanvas.isKeyPressed(MyCanvas.Keys.LEFT))
        { 
            if (degreesSpeed > 2) degreesSpeed -= 2;
        }
        else if (MyCanvas.isKeyPressed(MyCanvas.Keys.RIGHT))
        {
            if (degreesSpeed < 10) degreesSpeed += 2;
        }
		if (MyCanvas.isKeyReleased(MyCanvas.Keys.P))
        {
		    if(!audioTest.paused)
                MyCanvas.stopAudio(audioTest);
			else
			    MyCanvas.playAudio(audioTest);
        }
        degrees += degreesSpeed * MyCanvas.elapsedFactor; if (degrees >= 360) degrees -= 360; //elapsedFactor makes the rotation more smooth when a lag occurs
        //mouse or touch down
        if (MyCanvas.interactionDown) 
        {
            var n = 2 * MyCanvas.elapsedFactor;
            //mouse specific (detect mouse trick)
            if (MyCanvas.mouseButtonsPressed.length == 1) //avoid also changes when pressing left/right at the same time
            {
                if (MyCanvas.mouseDownButton == MyCanvas.MouseButtons.LEFT)
                {
                    if (circleRadius < 60) {
                        circleRadius += n;
                        if (circleRadius > 60) circleRadius = 60;

                    }
                }
                else if (MyCanvas.mouseDownButton == MyCanvas.MouseButtons.RIGHT) {

                    if (circleRadius > 20) {
                        circleRadius -= n;
                        if (circleRadius < 20) circleRadius = 20;
                    }
                }
            }
            //touch specific (detect touch trick)
            else if (MyCanvas.touchesList.length > 0)
            {
                if (circleRadius < 60)
                {
                    circleRadius += n;
                    if (circleRadius > 60) circleRadius = 60;
                }
            }
        }
        
    }

    var render = function ()
    {
        //pattern
        MyCanvas.clearToColor(bgPattern);
        //draw textures (direct mode)
        MyCanvas.fillTexture(ghostTexture, 155, 100);
        MyCanvas.fillTextureRect(ghostTexture, 225, 110, 9, 10, 32, 26);
        MyCanvas.fillScaledTexture(ghostTexture, 275, 120, 0.5, 0.5);
        MyCanvas.setAlpha(0.7);
        MyCanvas.fillScaledTexture2(ghostTexture, 315, 80, ghostTexture.width * 1.5, ghostTexture.height * 1.5);
        MyCanvas.setAlpha(1);
        MyCanvas.fillRotatedTexture(ghostTexture, 415, 100, degrees);
        //MyCanvas.fillRotatedTextureAround(ghostImage, 650, 100, 70, 1, 1);
        MyCanvas.fillFlippedTexture(ghostTexture, 495, 100, false, true);
        MyCanvas.fillTextureComplete(ghostTexture, 540, 100, 9, 10, 32, 26, 1.5, 1.5, true, false, 70, 0, 0);
        //primitives
        var fontString = MyCanvas.getFontString('sans-serif', 20, "normal");
        MyCanvas.fillString("Left/right: change rotation speed", MyCanvas.width / 2, MyCanvas.height / 2 - 40, fontString, '#ffffff', true);
        fontString = MyCanvas.getFontString('sans-serif', 20, "italic");
        MyCanvas.fillString("Click/Touch: change circle radius", MyCanvas.width / 2, MyCanvas.height / 2 - 20, fontString, '#ffffff', true);
        fontString = MyCanvas.getFontString('TestFont', 20, ''); //custom font, '' == 'normal'
        MyCanvas.fillString("Smart Canvas 2D test demo", MyCanvas.width / 2, MyCanvas.height / 2 + 7, fontString, '#ffffff', true); 

        MyCanvas.fillRect(30, 250, 50, 50, '#AA4998');
        MyCanvas.fillRect(40, 260, 30, 30, '#C63F83');
        MyCanvas.strokeRect(35, 255, 40, 40, 5, '#ffffff');

        MyCanvas.strokeRect(MyCanvas.width - 80, 250, 50, 50, 5, '#ffffff');
        MyCanvas.fillRect(MyCanvas.width - 70, 260, 30, 30, '#C63F83');
        MyCanvas.strokeRect(MyCanvas.width - 75, 255, 40, 40, 2, '#AA4998');
        
        MyCanvas.fillCircle(MyCanvas.width / 2, 380, circleRadius, '#AA4998');
        MyCanvas.strokeCircle(MyCanvas.width / 2, 380, circleRadius - 1, 1, '#C63F83'); //border
        for (var i = 0; i < circleRadius - 3; i += 3)
        {
            var b = 50 + i;
            MyCanvas.strokeCircle(MyCanvas.width / 2, 380, circleRadius - i, 1, 'rgba(200, 60, '+ b +', 1)');
        }

        MyCanvas.strokeLine(0, 25, MyCanvas.width / 2, MyCanvas.height - 25, 2, 'rgba(255, 255, 255, 0.4)'); //alpha value
        MyCanvas.strokeLine(MyCanvas.width, 25, MyCanvas.width / 2, MyCanvas.height - 25, 2, 'rgba(255, 255, 255, 0.4)'); //alpha value

        MyCanvas.setUpShadow(20, '#FFFFFF', 0, 0);
        MyCanvas.strokeTriangle(150, 400, 200, 450, 100, 450, 2, '#ffffff');
        MyCanvas.fillTriangle(MyCanvas.width - 150, 400, MyCanvas.width - 200, 450, MyCanvas.width - 100, 450, '#ffffff');
        MyCanvas.disableShadow();

        MyCanvas.fillPixelData(rectData, 0, 0);
        MyCanvas.fillRect(0, MyCanvas.height - 25, MyCanvas.width, 25, gradient);

        //high level mode
        img.render();
        txt.render();
    }


} 