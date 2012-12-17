//Smart Canvas 2D Framework 
//Copyright 2012 Mattia Russomando


var MyCanvas = new function () //singleton
{

    var that = this;
    var VERSION = "0.52";

    //canvas stuff
    that.width = 700;
    that.height = 500;  
    that.value = document.getElementById('c'); //the canvas
    that.value.width = that.width;
    that.value.height = that.height;
    that.ctx = that.value.getContext('2d');

    //settings
    disableCanvasContextMenu();
    that.ctx.textBaseline = 'top';
    that.usePreloader = true;
    that.preloadAudio = false; //if true the app can't be executed on mobile devices
    that.fakePreloadTimer = 0; //for custom fonts loading that can't be handled (seconds)
    that.preventDefaultKeys = null; //it disables for instance browser shortcuts and other default behaviours
    that.preventDefaultTouch = null;
    that.preventDefaultMouse = null;
    that.touchScrolling = null;

    //other stuff
    var FR = 60;
    var doublePI = Math.PI * 2; //for drawing circles
    that.convertToRadiansFactor = Math.PI / 180;
    var loaded = true;
    var endLoadingFunctions = new Array(); //functions executed when loading ends
    var started = false;
    that.imagesLoaded = 0;
    that.imagesToPreload = 0;
    that.musicsToPreload = 0;
    that.musicsLoaded = 0;
    //device stuff
    var device = navigator.userAgent.toLowerCase();
    var touchDevice = checkDevice(["iphone", "ipad", "ipod", "android", "touch", "windows phone", "kindle"]);
    var mobileDevice = touchDevice || checkDevice(["blackberry", "opera mini", "symbian", "mobile", "smartphone"]);
    that.runningOnMobileDevice = function() { return mobileDevice; } //not reliable, be careful
    that.runningOnMobileTouchDevice = function () { return touchDevice; } //not reliable, be careful
    function checkDevice(options)
    {
        for(var i = 0; i< options.length; i++)
        {
            if (device.indexOf(options[i]) != -1) return true;
        }
        return false;
    }
    //input
    var keysDown;
    var keysPressed;
    var keysReleased;
    that.mouseDownButton; //last mouse button down
    that.mousePressedButton; //last mouse button pressed
    that.mouseReleasedButton; //last mouse button released
    that.mouseButtonsPressed; //array of mouse buttons pressed
    that.mouseX;
    that.mouseY;
    that.touchX;
    that.touchY;
    that.touchDown; //last mouse button down
    that.touchPressed; //last mouse button pressed
    that.touchReleased //last mouse button released
    that.allowTouchOffscreen; //when touch is down if true the touch position can go offscreen ( < 0 or > width/height)
    var multiTouchPositions; //array with touch positions
    that.getTouchPositions = function () { return multiTouchPositions;}
    var SingleTouchPosition; //class that represents a touch position (defined inside initTouch method)
    var initMousePos; //the first time it sets the mouse position also in touchDown event. (The user can click without having moved the mouse before)
    var keyboardActive = false;
    var mouseActive = false;
    var touchActive = false;
    that.isMouseEnabled = function () { return mouseActive; }
    that.isKeyboardEnabled = function () { return keyboardActive; }
    that.isTouchEnabled = function () { return touchActive; }

    //state stuff
    var nextState = null;
    var nextStateParams = null;
    that.interval = false;
    var lastTime = null;
    that.elapsed = 0; //numbers of seconds between last and current cycle
    that.elapsedFactor = 1; //elapsed * framerate  (lag)0->1(no lag)
    that.state = null;
    var stateBody = null;
    var preloaderStateBody = null;
    var startFunction = null;

    //music
    var audioEnabled = null; //on safari audio tag doesn't work without quickTime
    that.audioOnInteraction = null; //audio that will play when the user click/touch the screen (ios only supports this feature to play audio files)
    var endLoadingAudio = null; //audio file playing when loading ends

    //HELPERS
    that.showMessage = function (m)
    {
        alert(m);
        clearKeyboardInputLists(); //it avoids keyup errors after an alert
        resetMouse();
        resetTouch();
        //Some browsers lost focus after an alert.
        document.getElementById("c").focus();
    }

    that.getFrameRate = function ()
    {
        return that.FR;
    }
    that.setFrameRate = function(frameRate)
    {
        FR = frameRate;
        if(started)
        {
            clearInterval(that.interval);
            setUpGameLoop();
        }
    }

    that.collide = function (x, y, w, h, x2, y2, w2, h2)
    {
        if (x + w > x2 && x < x2 + w2 && y + h > y2 && y < y2 + h2)
            return true;
        return false;
    }

    function convertToRadians(degree) //different notation but same effect, except that "convertToRadians" can be used before the declaration
    {
        return degree * that.convertToRadiansFactor;
    }


    that.clear = function ()
    {
        that.ctx.clearRect(0, 0, that.width, that.height);
    }

    that.setSize = function (w, h)
    {
        that.width = w;
        that.height = h;
        that.value.width = that.width;
        that.value.height = that.height;
    }

    function disableCanvasContextMenu() //right click will not show the context menu
    {
        that.value.oncontextmenu = function () {
            return false;
        }
    }

    //IMMEDIATE MODE: DRAW TEXTURES
    that.fillTexture = function (src, x, y)
    {
        that.ctx.drawImage(src, 0, 0, src.width, src.height, x, y, src.width, src.height);
    }

    that.fillTextureRect = function (src, x, y, srcX, srcY, w, h)
    {
        that.ctx.drawImage(src, srcX, srcY, w, h, x, y, w, h);
    }

    that.fillTextureAlpha = function (src, x, y, alpha)
    {
        that.ctx.globalAlpha = alpha;
        that.ctx.drawImage(src, 0, 0, src.width, src.height, x, y, src.width, src.height);
        that.ctx.globalAlpha = 1;
    }

    that.fillScaledTexture = function (src, x, y, scaleX, scaleY) //MIN-MAX scaleX (0 -> 1) scaleY (0 -> 1)
    {
        scaleX = src.width * scaleX;
        scaleY = src.height * scaleY;
        that.ctx.drawImage(src, 0, 0, src.width, src.height, x, y, scaleX, scaleY);
    }
    that.fillScaledTexture2 = function (src, x, y, scaleWidth, scaleHeight) //MIN-MAX scaleX (0 -> src.width) scaleY (0 -> src.height)
    {
        that.ctx.drawImage(src, 0, 0, src.width, src.height, x, y, scaleWidth, scaleHeight);
    }

    that.fillRotatedTexture = function (src, x, y, degrees)
    {
        that.ctx.save();
        that.ctx.translate(x + src.width / 2, y + src.height / 2);
        that.ctx.rotate(degrees * that.convertToRadiansFactor);
        that.ctx.drawImage(src, 0, 0, src.width, src.height, -src.width / 2, -src.height / 2, src.width, src.height);
        that.ctx.restore();
    }

    that.fillRotatedTextureAround = function (src, x, y, degrees, centerX, centerY) //centerX (0 -> 1) centerY (0 -> 1)
    {
        centerX = src.width * centerX;
        centerY = src.height * centerY;
        that.ctx.save();
        that.ctx.translate(x + centerX, y + centerY);
        that.ctx.rotate(degrees * that.convertToRadiansFactor);
        that.ctx.drawImage(src, 0, 0, src.width, src.height, -centerX, -centerY, src.width, src.height);
        that.ctx.restore();
    }
    that.fillRotatedTextureAround2 = function (src, x, y, degrees, centerWidth, centerHeight) //centerWidth (0 -> src.width) centerHeight (0 -> src.height)
    {
        that.ctx.save();
        that.ctx.translate(x + centerWidth, y + centerHeight);
        that.ctx.rotate(degrees * that.convertToRadiansFactor);
        that.ctx.drawImage(src, 0, 0, src.width, src.height, -centerWidth, -centerHeight, src.width, src.height);
        that.ctx.restore();
    }
    that.fillRotatedTextureAroundRadians = function (src, x, y, radians, centerX, centerY) //centerX (0 -> 1) centerY (0 -> 1) radians instead of degrees
    {
        centerX = src.width * centerX;
        centerY = src.height * centerY;
        that.ctx.save();
        that.ctx.translate(x + centerX, y + centerY);
        that.ctx.rotate(radians);
        that.ctx.drawImage(src, 0, 0, src.width, src.height, -centerX, -centerY, src.width, src.height);
        that.ctx.restore();
    }


    that.fillFlippedTexture = function (src, x, y, horizontal, vertical)
    {
        that.ctx.save();
        if (horizontal && !vertical)
        {
            that.ctx.translate(that.width, 0);
            that.ctx.scale(-1, 1);
            that.ctx.drawImage(src, 0, 0, src.width, src.height, that.width - x - src.width, y, src.width, src.height);
        }
        else if (vertical && !horizontal)
        {
            that.ctx.translate(0, that.height);
            that.ctx.scale(1, -1);
            that.ctx.drawImage(src, 0, 0, src.width, src.height, x, that.height - y - src.height, src.width, src.height);
        }
        else if (vertical && horizontal)
        {
            that.ctx.translate(that.width, 0);
            that.ctx.scale(-1, 1);
            that.ctx.translate(0, that.height);
            that.ctx.scale(1, -1);
            that.ctx.drawImage(src, 0, 0, src.width, src.height, that.width - x - src.width, that.height - y - src.height, src.width, src.height);
        }
        else
        {
            that.ctx.drawImage(src, 0, 0, src.width, src.height, x, y, src.width, src.height);
        }
        that.ctx.restore();
    }

    that.fillTextureComplete = function (src, x, y, srcX, srcY, w, h, scaleX, scaleY, flipX, flipY, degrees, centerX, centerY) //center/scale min-max(0->1)
    {
        scaleX = scaleX * w;
        scaleY = scaleY * h;
        if (!flipX && !flipY && degrees == 0)
        {
            that.ctx.drawImage(src, srcX, srcY, w, h, x, y, scaleX, scaleY);
        }
        else
        {
            var new_x = x;
            var new_y = y;
            var new_w = w;
            var new_h = h;
            that.ctx.save();
            if (flipX)
            {
                that.ctx.translate(that.width, 0);
                that.ctx.scale(-1, 1);
                new_x = that.width - x - scaleX;
            }
            if (flipY)
            {
                that.ctx.translate(0, that.height);
                that.ctx.scale(1, -1);
                new_y = that.height - y - scaleY;
            }
            if (degrees != 0)
            {
                centerX = scaleX * centerX;
                centerY = scaleY * centerY;
                that.ctx.translate(new_x + centerX, new_y + centerY);
                that.ctx.rotate(degrees * that.convertToRadiansFactor);
                new_x = -centerX;
                new_y = -centerY;
            }
            that.ctx.drawImage(src, srcX, srcY, new_w, new_h, new_x, new_y, scaleX, scaleY);
            that.ctx.restore();
        }
    }
    that.fillTextureComplete2 = function (src, x, y, srcX, srcY, w, h, scaleW, scaleH, flipX, flipY, degrees, centerWidth, centerHeight) //center/scale min-max(0->width/height)
    {
        if (!flipX && !flipY && degrees == 0)
        {
            that.ctx.drawImage(src, srcX, srcY, w, h, x, y, scaleW, scaleH);
        }
        else
        {
            var new_x = x;
            var new_y = y;
            var new_w = w;
            var new_h = h;
            that.ctx.save();
            if (flipX)
            {
                that.ctx.translate(that.width, 0);
                that.ctx.scale(-1, 1);
                new_x = that.width - x - scaleW;
            }
            if (flipY)
            {
                that.ctx.translate(0, that.height);
                that.ctx.scale(1, -1);
                new_y = that.height - y - scaleH;
            }
            if (degrees != 0)
            {
                that.ctx.translate(new_x + centerWidth, new_y + centerHeight);
                that.ctx.rotate(degrees * that.convertToRadiansFactor);
                new_x = -centerWidth;
                new_y = -centerHeight;
            }
            that.ctx.drawImage(src, srcX, srcY, new_w, new_h, new_x, new_y, scaleW, scaleH);
            that.ctx.restore();
        }
    }

    that.fillPixelData = function (src, x, y) //dynamic pixel manipulation data
    {
        that.ctx.putImageData(src, x, y);
    }


    //DRAW TEXT
    that.getFontString = function(FName, FSize, FStyle) //example: font "sans-serif" fontStyle "italic/bold"
    {
        return FStyle + ' ' + FSize + 'px ' + FName;
    }

    that.fillString = function (text, x, y, fontString, color, center) 
    {
        that.ctx.fillStyle = color;
        that.ctx.font = fontString;
        if (center == true)
            x -= that.ctx.measureText(text).width / 2;
        that.ctx.fillText(text, x, y);
    }
    that.strokeString = function (text, x, y, fontString, color, center, lineWidth)
    {
        that.ctx.strokeStyle = color;
        that.ctx.lineWidth = lineWidth;
        that.ctx.font = fontString; 
        if (center == true)
            x -= that.ctx.measureText(t).width / 2;
        that.ctx.strokeText(text, x, y);
    }



    //DRAW PRIMITIVES
    that.strokeArc = function (x, y, radius, color, startAngle, endAngle, clockWise, lineWidth)
    {
        that.ctx.strokeStyle = color;
        that.ctx.lineWidth = lineWidth;
        that.ctx.beginPath();
        that.ctx.arc(x, y, radius, startAngle, endAngle, clockWise);
        that.ctx.closePath();
        that.ctx.stroke();
    }

    that.fillArc = function (x, y, radius, color, startAngle, endAngle, clockWise)
    {
        that.ctx.fillStyle = color;
        that.ctx.beginPath();
        that.ctx.arc(x, y, radius, startAngle, endAngle, clockWise);
        that.ctx.closePath();
        that.ctx.fill();
    }


    that.strokeCircle = function (x, y, radius, lineWidth, color)
    {
        that.ctx.strokeStyle = color;
        that.ctx.lineWidth = lineWidth;
        that.ctx.beginPath();
        that.ctx.arc(x, y, radius, 0, doublePI, true);
        that.ctx.closePath();
        that.ctx.stroke();
    }

    that.fillCircle = function (x, y, radius, color)
    {
        that.ctx.fillStyle = color;
        that.ctx.beginPath();
        that.ctx.arc(x, y, radius, 0, doublePI, true);
        that.ctx.closePath();
        that.ctx.fill();
    }

    that.strokeLine = function (x, y, x2, y2, lineWidth, color)
    {
        that.ctx.strokeStyle = color;
        that.ctx.lineWidth = lineWidth;
        that.ctx.beginPath();
        that.ctx.moveTo(x, y);
        that.ctx.lineTo(x2, y2);
        that.ctx.closePath();
        that.ctx.stroke();
    }

    that.strokeTriangle = function (x, y, x2, y2, x3, y3, lineWidth, color)
    {
        that.ctx.strokeStyle = color;
        that.ctx.lineWidth = lineWidth;
        that.ctx.beginPath();
        that.ctx.moveTo(x, y);
        that.ctx.lineTo(x2, y2);
        that.ctx.lineTo(x3, y3);
        that.ctx.lineTo(x, y);
        that.ctx.closePath();
        that.ctx.stroke();
    }
    that.fillTriangle = function (x, y, x2, y2, x3, y3, color)
    {
        that.ctx.fillStyle = color;
        that.ctx.beginPath();
        that.ctx.moveTo(x, y);
        that.ctx.lineTo(x2, y2);
        that.ctx.lineTo(x3, y3);
        that.ctx.lineTo(x, y);
        that.ctx.closePath();
        that.ctx.fill();
    }

    that.fillRect = function (x, y, w, h, color)
    {
        that.ctx.fillStyle = color;
        that.ctx.beginPath();
        that.ctx.rect(x, y, w, h);
        that.ctx.closePath();
        that.ctx.fill();
    }

    that.strokeRect = function (x, y, w, h, lineWidth, color)
    {
        that.ctx.strokeStyle = color;
        that.ctx.lineWidth = lineWidth;
        that.ctx.beginPath();
        that.ctx.rect(x, y, w, h);
        that.ctx.closePath();
        that.ctx.stroke();
    }


    that.getPattern = function (img) //it creates an image pattern, pass it as a color
    {
        //other values are "repeat-x" "repeat-y" "no-repeat"
        return that.ctx.createPattern(img, 'repeat');
    }

    that.clearToColor = function (color)//clear the screen with a color
    {
        that.ctx.fillStyle = color;
        that.ctx.beginPath();
        that.ctx.rect(0, 0, that.width, that.height);
        that.ctx.closePath();
        that.ctx.fill();
    }

    that.setAlpha = function(value)
    {
        that.ctx.globalAlpha = value;
    }

    that.setUpShadow = function(value, color, offsetX, offsetY)
    {
        that.ctx.shadowBlur = value;
        that.ctx.shadowColor = color;
        that.ctx.shadowOffsetX = offsetX;
        that.ctx.shadowOffsetY = offsetY;
    }
    that.disableShadow = function()
    {
        that.ctx.shadowColor = '#000000';
        that.ctx.shadowBlur = 0;
    }


    //TIMER
    that.timer = function ()
    {
        var tim = this;
        tim.MyTimer = new Date();
        tim.milliseconds = function ()
        {
            var date = new Date();
            return date - tim.MyTimer;
        }
        tim.seconds = function ()
        {
            var date = new Date();
            return parseInt((date - tim.MyTimer) / 1000);
        }
        tim.restart = function ()
        {
            tim.MyTimer = new Date();
        }

    }

   
    //INPUT
    that.isKeyDown = function(key)
    {
        if (key == that.Keys.ANY) return keysDown.length > 0;
        for(var i = 0; i < keysDown.length; i++)
        {
            if (keysDown[i] == key) return true;
        }
        return false;
    }
    that.isKeyPressed = function(key)
    {
        if (key == that.Keys.ANY) return keysPressed.length > 0;
        for (var i = 0; i < keysPressed.length; i++)
        {
            if (keysPressed[i] == key) return true;
        }
        return false;
    }
    that.isKeyReleased = function(key)
    {
        if (key == that.Keys.ANY) return keysReleased.length > 0;
        for (var i = 0; i < keysReleased.length; i++)
        {
            if (keysReleased[i] == key) return true;
        }
        return false;
    }

    var handleKeyPress = function (ev) //not called
    {
        
    }

   var handleKeyDown = function (ev)
   {
       /*this event is too instable so the input process is a little bit complex.
       keydown is acquired only at the first press (the key goes in keysPressed list) and after a game loop the key goes into
       keysDown list. the keyUp event removes the key from the list*/
       var index = keysDown.indexOf(ev.keyCode);
       if (index == -1)
       {
             keysPressed.push(ev.keyCode);
       }
       if (that.preventDefaultKeys)
           preventDefault(ev);
    }

    var handleKeyUp = function (ev)
    {
        keysReleased.push(ev.keyCode);
        var index = keysDown.indexOf(ev.keyCode);
        if (index != -1)
        {
            //remove key
            keysDown.splice(index, 1);
        }
        if(that.preventDefaultKeys)
            preventDefault(ev);
    }

    that.Keys = null; //keys enum (init in initKeyboard)
    that.MouseButtons = null; //mouse buttons enum (init in initMouse)

   that.stopPropagation = function (event) //useless since this framework doesn't use the javascript native event process. 
   {
        //Anyway after this function listeners no longer receive the input event.
        if (event.stopPropagation) event.stopPropagation();
   }
   var preventDefault = function(event) //it prevents default input behaviour of the browser
   {
       if (event.preventDefault) event.preventDefault();
   }

   var ev_touchdown = function (ev)
   {
       that.touchDown = true;
       updateTouchPos(ev, true, !that.allowTouchOffscreen);
       if (that.preventDefaultTouch)
           preventDefault(ev);
   }
   var ev_touchup = function (ev)
   {
       if (ev.touches.length < multiTouchPositions.length)
       {
           multiTouchPositions.splice(ev.touches.length, multiTouchPositions.length - ev.touches.length);
           that.touchReleased = true;
           if (ev.touches.length == 0) that.touchDown = false;
       }
       updateTouchPos(ev, false);
       if (that.preventDefaultTouch)
           preventDefault(ev);
   }
   var ev_touchmove = function (ev)
   {
       updateTouchPos(ev, true, !that.allowTouchOffscreen);
       if (that.preventDefaultTouch && !that.touchScrolling)
           preventDefault(ev);
   }

   function updateTouchPos(ev, updatePositions, checkOffscreen)
   {
       if (updatePositions)
       {
            for (var i = 0; i < ev.touches.length; i++)
            {
               var tX = ev.touches[i].pageX - that.value.offsetLeft;
               var tY = ev.touches[i].pageY - that.value.offsetTop;
               if (i >= multiTouchPositions.length) //new touch pos
               {
                   //touchMove checks new positions because if a finger is offscreen and returns inside it there will be a new pos.
                   if (!checkOffscreen || (tX >= 0 && tX <= that.width && tY >= 0 && tY <= that.height))
                   {
                       if (that.audioOnInteraction != null) that.playAudio(that.audioOnInteraction); //iphone/ipad support
                       that.touchPressed = true;
                       multiTouchPositions.push(new SingleTouchPosition(tX, tY));
                   }
                   continue;
               }   
               if (checkOffscreen && (tX < 0 || tX > that.width || tY < 0 || tY > that.height))
               {
                   multiTouchPositions.splice(i, 1);
               }
               else
               {
                   multiTouchPositions[i].x = tX;
                   multiTouchPositions[i].y = tY;
               }         
            } 
       }
       //update main touch pos
       if (multiTouchPositions.length > 0)
       {
           that.touchX = multiTouchPositions[multiTouchPositions.length - 1].x;
           that.touchY = multiTouchPositions[multiTouchPositions.length - 1].y;
       }
   }



   var ev_mouseup = function (ev)
   {
       //remove to mouse buttons pressed list
       var index = that.mouseButtonsPressed.indexOf(ev.which);
       if (index != -1) that.mouseButtonsPressed.splice(index, 1);
       if (that.mouseButtonsPressed.length == 0)
       {
           that.mouseDownButton = that.MouseButtons.NO_PRESSED;
       }
       else
       {
           that.mouseDownButton = that.mouseButtonsPressed[0];
       }
       that.mousePressedButton = that.MouseButtons.NO_PRESSED;
       that.mouseReleasedButton = ev.which;
       if (that.preventDefaultMouse)
           preventDefault(ev);
   }


   var ev_mousedown = function (ev)
   {
       if (initMousePos)
       {
           updateMousePos(ev);
           initMousePos = false;
       }
       //add to mouse buttons pressed list
       var index = that.mouseButtonsPressed.indexOf(ev.which);
       if (index == -1) //new mouse button pressed
       {
           if (that.audioOnInteraction != null) that.playAudio(that.audioOnInteraction); //iphone/ipad support
           that.mouseButtonsPressed.push(ev.which);
           that.mousePressedButton = ev.which;
       }
       if (that.preventDefaultMouse)
           preventDefault(ev);
   }

   var ev_mousemove = function (ev)
   {
       updateMousePos(ev);
       //if (that.preventDefaultMouse)
            //preventDefault(ev);
   }

   function updateMousePos(ev)
   {
       //different browsers
       if (ev.pageX || ev.pageY)
       {
           that.mouseX = ev.pageX - that.value.offsetLeft;
           that.mouseY = ev.pageY - that.value.offsetTop;
       }
       if (ev.clientX || ev.clientY)
       {
           that.mouseX = ev.clientX + document.body.scrollLeft
               + document.documentElement.scrollLeft - that.value.offsetLeft;
           that.mouseY = ev.clientY + document.body.scrollTop
               + document.documentElement.scrollTop - that.value.offsetTop;
       }
        
   }

    var resetMouse = function()
    {
        that.mouseDownButton = that.MouseButtons.NO_PRESSED;
        that.mousePressedButton = that.MouseButtons.NO_PRESSED;
        that.mouseReleasedButton = that.MouseButtons.NO_PRESSED;
        that.mouseX = 0;
        that.mouseY = 0;
        that.mouseButtonsPressed.splice(0, that.mouseButtonsPressed.length);
    }
    that.isMouseDown = function () { return that.mouseDownButton != that.MouseButtons.NO_PRESSED; }
    that.isMousePressed = function () { return that.mousePressedButton != that.MouseButtons.NO_PRESSED; }
    that.isMouseReleased = function () { return that.mouseReleasedButton != that.MouseButtons.NO_PRESSED; }
    that.isMouseOrTouchDown = function () { return (mouseActive && that.mouseDownButton != that.MouseButtons.NO_PRESSED) || (touchActive && that.touchDown); }
    that.isMouseOrTouchPressed = function () { return (mouseActive && that.mousePressedButton != that.MouseButtons.NO_PRESSED) || (touchActive && that.touchPressed); }
    that.isMouseOrTouchReleased = function () { return (mouseActive && that.mouseReleasedButton != that.MouseButtons.NO_PRESSED) || (touchActive && that.touchReleased); }

    that.initMouse = function (preventDefault) //default browser behaviours
    {
        if (mouseActive) return;
        that.mouseButtonsPressed = new Array();
        //buttons list
        that.MouseButtons = new function ()
        {
            var that = this;
            that.NO_PRESSED = 0;
            that.LEFT = 1;
            that.MIDDLE = 2;
            that.RIGHT = 3;
        }
        resetMouse();
        mouseActive = true;
        initMousePos = true;
        that.preventDefaultMouse = preventDefault;
        //listeners
        that.value.addEventListener('mousedown', ev_mousedown, true);
        that.value.addEventListener('mouseup', ev_mouseup, true);
        that.value.addEventListener('mousemove', ev_mousemove, true);
    }

    that.endMouse = function ()
    {
        if (!mouseActive) return;
        mouseActive = false;
        resetMouse();
        that.mouseButtonsPressed = null;
        that.preventDefaultMouse = null;
        that.mouseButtons = null;
        that.value.removeEventListener('mousedown', ev_mousedown, true);
        that.value.removeEventListener('mouseup', ev_mouseup, true);
        that.value.removeEventListener('mousemove', ev_mousemove, true);
    }


    var resetTouch = function()
    {
        that.touchX = 0;
        that.touchY = 0;
        that.touchDown = false;
        that.touchUp = false;
        that.touchReleased = false;
        multiTouchPositions.splice(0, multiTouchPositions.length);
    }

    that.initTouch = function(preventDefault, touchScrollingEnabled) //default browser behaviours
    {
        if (touchActive) return;
        touchActive = true; 
        SingleTouchPosition = function (x, y) { var that = this; that.x = x; that.y = y; }
        multiTouchPositions = new Array(); //array of SingleTouchPosition for handling multiTouch
        resetTouch();
        that.allowTouchOffscreen = false;
        that.touchScrolling = false;
        if (touchScrollingEnabled)
            that.touchScrolling = true;         
        that.preventDefaultTouch = preventDefault;
        that.value.addEventListener('touchstart', ev_touchdown, true);
        that.value.addEventListener('touchend', ev_touchup, true);
        that.value.addEventListener('touchcancel', ev_touchup, true);
        that.value.addEventListener('touchmove', ev_touchmove, true);
    }
    that.endTouch = function ()
    {
        if (!touchActive) return;
        touchActive = false;
        resetTouch();
        multiTouchPositions = null;
        that.preventDefaultTouch = null;
        SingleTouchPosition = null;
        that.value.removeEventListener('touchstart', ev_touchdown, true);
        that.value.removeEventListener('touchend', ev_touchup, true);
        that.value.removeEventListener('touchcancel', ev_touchup, true);
        that.value.removeEventListener('touchmove', ev_touchmove, true);
    }

    that.initKeyboard = function (preventDefault)
    {
        if (keyboardActive) return;
        keyboardActive = true;
        that.preventDefaultKeys = preventDefault;
        //init
        keysDown = new Array();
        keysPressed = new Array();
        keysReleased = new Array();
        //key list
        that.Keys = new function()
        {
            var that = this;

            that.ANY = -1;

            that.LEFT = 37;
            that.UP = 38;
            that.RIGHT = 39;
            that.DOWN = 40;
		
            that.ENTER = 13;
        
            that.SPACE = 32;
            that.SHIFT = 16;
            that.BACKSPACE = 8;
            that.CAPS_LOCK = 20;
            that.DELETE = 46;
            that.END = 35;
            that.CTRL = 17;
            that.ESC = 27;
            that.HOME = 36;
            that.INSERT = 45;

            that.PAGE_UP = 33;
            that.TAB = 9;
            that.PAGE_DOWN = 34;
		
            that.LEFT_SQUARE_BRACKET = 219;
            that.RIGHT_SQUARE_BRACKET = 221;
		
            that.F1 = 112;
            that.F2 = 113;
            that.F3 = 114;
            that.F4 = 115;
            that.F5 = 116;
            that.F6 = 117;
            that.F7 = 118;
            that.F8 = 119;
            that.F9 = 120;
            that.F10 = 121;
            that.F11 = 122;
            that.F12 = 123;
            that.F13 = 124;
            that.F14 = 125;
            that.F15 = 126;

            that.A = 65;
            that.B = 66;
            that.C = 67;
            that.D = 68;
            that.E = 69;
            that.F = 70;
            that.G = 71;
            that.H = 72;
            that.I = 73;
            that.J = 74;
            that.K = 75;
            that.L = 76;
            that.M = 77;
            that.N = 78;
            that.O = 79;
            that.P = 80;
            that.Q = 81;
            that.R = 82;
            that.S = 83;
            that.T = 84;
            that.U = 85;
            that.V = 86;
            that.W = 87;
            that.X = 88;
            that.Y = 89;
            that.Z = 90;
		
            /*
            that.DIGIT0 = 48;
            that.DIGIT1 = 49;
            that.DIGIT2 = 50;
            that.DIGIT3 = 51;
            that.DIGIT4 = 52;
            that.DIGIT5 = 53;
            that.DIGIT6 = 54;
            that.DIGIT7 = 55;
            that.DIGIT8 = 56;
            that.DIGIT9 = 57;
            
            that.NUMPAD0 = 96;
            that.NUMPAD1 = 97;
            that.NUMPAD2 = 98;
            that.NUMPAD3 = 99;
            that.NUMPAD4 = 100;
            that.NUMPAD5 = 101;
            that.NUMPAD6 = 102;
            that.NUMPAD7 = 103;
            that.NUMPAD8 = 104;
            that.NUMPAD9 = 105;
            that.NUMPAD_ADD = 107;
            that.NUMPAD_DECIMAL = 110;
            that.NUMPAD_DIVIDE = 111;
            that.NUMPAD_ENTER = 108;
            that.NUMPAD_MULTIPLY = 106;
            that.NUMPAD_SUBTRACT = 109;
            */
        }
        //listeners
        document.addEventListener('keydown', handleKeyDown, true); //adding on canvas not working
        //window.addEventListener('keypress', handleKeyPress, true);
        document.addEventListener('keyup', handleKeyUp, true);
    }
    that.endKeyboard = function ()
    {
        if (!keyboardActive) return;
        keyboardActive = false;
        that.preventDefaultKeys = null;
        that.keys = null;
        clearKeyboardInputLists();
        document.removeEventListener('keydown', handleKeyDown, true);
        //window.removeEventListener('keypress', handleKeyPress, true);
        document.removeEventListener('keyup', handleKeyUp, true);
    }

    var clearKeyboardInputLists = function ()
    {
        keysDown.splice(0, keysDown.length);
        keysPressed.splice(0, keysPressed.length);
        keysReleased.splice(0, keysReleased.length);
    }

    that.isKeyboardActive = function () { return keyboardActive; }
    that.isMouseActive = function () { return mouseActive; }
    that.isTouchActive = function () { return touchActive; }


    //MUSIC    
    that.playAudio = function(music)
    {
        if (!audioEnabled || !music.paused) return;
        //some browsers doesn't recognize the loop param so we have to use a callback
        function endedEvent()
        {
            if (music.loop) 
            {
                music.currentTime = 0;
                music.play(); //compatibility
            }
            else
            {
                music.paused = true;
            }
        }
        function stopEvent()
        {
            music.removeEventListener("ended", endedEvent, false);
            music.removeEventListener("pause", stopEvent, false);
        }
        music.addEventListener("ended", endedEvent, false);
        music.addEventListener("pause", stopEvent, false);
        music.play();

        return music.paused; //true == not played 
    }
    
    that.disableAudio = function () { audioEnabled = false; }

    that.stopAudio = function(music)
    {
        if (!audioEnabled) return;
        music.pause();
        music.currentTime = 0;
    }
    that.pauseAudio = function (music)
    {
        if (!audioEnabled || music == null) return;
        music.pause();
    }

    var FakeAudio = function() //when Audio is not supported loadAudio returns this, so the app will not crash if the user for instance write 'if(audio.paused) stuff'
    {
        var that = this;
        that.paused = true;
        that.src = '';
        that.currentTime = 0;
        that.loop = false;
        that.muted = false;
        that.volume = 0;
        that.preload = '';
        that.play = function () { }
        that.pause = function () { }
        that.canplay = function () { }
        that.removeEventListener = function () { }
        that.addEventListener = function () { }
    }



    //LOADING
    that.loadTexture = function (url, endLoadingFunction) //(endLoadingFunction can be null)
    {
        if (endLoadingFunction != null) endLoadingFunctions.push(endLoadingFunction);
        that.imagesToPreload += 1;
        loaded = false;
        var img = new Image();
        img.onload = function () 
        { 
           that.imagesLoaded += 1; 
           img.onload = null; 
        };
        img.onerror = function () { throw new Error("Load image error"); };
        img.onabort = function () { throw new Error("Load image error");};
        img.src = url;
        return img;
    }
    that.loadAudio = function (url, playAfterLoading, playWhenPossible) 
    {
        var audio;
        //on safari without quicktime audio doesn't work, so the first time it checks if the audio tag works.
        if (audioEnabled == false) return new FakeAudio(); //audio tag doesn't work (fake audio obj for not crashing)
        else if (audioEnabled == null) //first time
        {
            //init some audio stuff
            audioList = new Array();
            audioEnabled = true;
            //check
            try{ audio = new Audio(); }
            catch (err)
            {
                audioEnabled = false;
                return new FakeAudio();
            }
        }
        else
            audio = new Audio(); //audio tag works. 
        //get format and check if it's compatible with the browser.
        //if not load another format, so provide always at least ogg and m4a formats.
        var ext = url.substr(url.lastIndexOf('.') + 1);
        var changeUrl = false;
        switch(ext)
        {
            case "ogg":
                if (audio.canPlayType('audio/ogg') == "")
                {
                    changeUrl = true;
                    if (audio.canPlayType('audio/m4a') != "")
                        ext = "m4a";
                    else
                        ext = "mp3";
                }
                break;
            case "m4a":
                if (audio.canPlayType('audio/m4a') == "")
                {
                    changeUrl = true;
                    if (audio.canPlayType('audio/ogg') != "")
                        ext = "ogg";
                    else
                        ext = "mp3";
                }
                break;
            case "mp3":
                if (audio.canPlayType('audio/mp3') == "")
                {
                    changeUrl = true;
                    if (audio.canPlayType('audio/m4a') != "")
                        ext = "m4a";
                    else
                        ext = "ogg";
                }
                break;
        }
        if (changeUrl)
        {
            //set the new format
            url = url.substr(0, url.lastIndexOf('.')) + '.' + ext;
        }
        if(that.preloadAudio)
        {
            loaded = false;
            that.musicsToPreload += 1;
            audio.preload = 'none';
            var loadEvent = function ()
            {
                that.musicsLoaded += 1;
                audio.removeEventListener("canplaythrough", loadEvent, false);
                if (playWhenPossible) that.playAudio(audio);
            }
            audio.addEventListener("canplaythrough", loadEvent, false);
        }
        else
        {
            audio.preload = 'auto';
        }
        //if there is an audio error the application does not crash and so it will keep going without music
        audio.onerror = function () { if (that.preloadAudio) that.musicsToPreload -= 1; audio = new FakeAudio(); };
        audio.onabort = function () { if (that.preloadAudio) that.musicsToPreload -= 1; audio = new FakeAudio(); };

        audio.src = url;
        audio.paused = true;

        if (playWhenPossible && !that.preloadAudio) that.playAudio(audio);
        else if (playAfterLoading) endLoadingAudio = audio;
        return audio;
    }

    that.isLoaded = function() 
    {
        return loaded;
    }
    that.getLoadingPercentage = function() //it doesn't work properly if fakePreloaderTimer is set.
    {
        return ((that.imagesLoaded + that.musicsLoaded) / (that.imagesToPreload + that.musicsToPreload)) * 100;
    }
    var checkLoading = function()
    {
        loaded = (that.imagesLoaded == that.imagesToPreload && that.musicsLoaded == that.musicsToPreload && that.fakePreloadTimer == 0);
        if (loaded) //reset for future loadings
        {
            that.imagesLoaded = 0; that.imagesToPreload = 0;
            that.musicsLoaded = 0; that.musicsToPreload = 0;
        }
        return loaded;
    }
    that.addEndPreloadingFunction = function(f) //function executed when preloading ends like assets events
    {
        endLoadingFunctions.push(f);
    }
    that.defaultPreloader = function()
    {
        var fontString = MyCanvas.getFontString('sans-serif', 20, "normal");
        that.fillString("Loading...", that.width / 2, that.height / 2, fontString, '#000000', true);
    }


    var setUpGameLoop = function()
    {
        that.interval = setInterval(that.cycle, 1000 / FR);
    }

    that.cycle = function () //main game loop
    {
        var now = Date.now();
        that.elapsed = (now - lastTime) / 1000;
        that.elapsedFactor = Math.round((that.elapsed * FR) * 10) / 10; //rounded to first decimal
        if (that.elapsedFactor > 2) that.elapsedFactor = 2; //max value
        lastTime = now;
        if (keyboardActive)
        {
            //input (a keyPressed after a game loop becomes a keyDown if it's still pressed ( == keyUp not called yet))
            for (var i = 0; i < keysPressed.length; i++) { keysDown.push(keysPressed[i]); } //goto keydown event for the explanation
        }
        if (mouseActive)
        {
            if (that.mousePressedButton != that.MouseButtons.NO_PRESSED) that.mouseDownButton = that.mousePressedButton;
        }
        //clear screed
        that.clear();
        //loop
        if (loaded || !that.usePreloader)
        {
            stateBody();
            if (nextState != null) applyNewState();
        }
        if(!loaded) //loading
        {
            if (that.fakePreloadTimer != 0) //fake timer (seconds) for custom fonts loading
            {
                that.fakePreloadTimer -= that.elapsed; 
                if (that.fakePreloadTimer < 0) that.fakePreloadTimer = 0;
            }
            if (checkLoading())
            {
                //it executes functions callbacks of loaded assets
                for(var i = 0; i< endLoadingFunctions.length; i++)
                {
                    endLoadingFunctions[i]();
                }
                endLoadingFunctions.splice(0, endLoadingFunctions.length);
                //end loading audio
                if(endLoadingAudio != null)
                {
                    that.playAudio(endLoadingAudio); 
                    endLoadingAudio = null;
                }
            }
            if (that.usePreloader)
            {
                //display preloader
                if (preloaderStateBody != null) preloaderStateBody();
                else that.defaultPreloader();
            }
        }
        //input2
        if (keyboardActive)
        {
            keysReleased.splice(0, keysReleased.length);
            keysPressed.splice(0, keysPressed.length);
        }
        if (mouseActive)
        {
            that.mousePressedButton = that.MouseButtons.NO_PRESSED;
            that.mouseReleasedButton = that.MouseButtons.NO_PRESSED;
        }
        if(touchActive)
        {
            that.touchReleased = false;
            that.touchPressed = false;
        }
    }

    var applyNewState = function()   //private
    {
        that.state = new nextState(nextStateParams);
        that.stateBody = null;
        nextState = null;
        nextStateParams = null;
        if(startFunction) startFunction();    
    }

    that.changeState = function (s, params) //example params {"name":"bob", "cars": 2}
    {
        startFunction = null;
        preloaderStateBody = null;
        nextState = s;
        nextStateParams = params;
        //first state
        if (!started)
        {
            started = true;
            applyNewState(); //apply it immediately since there isn't any active state
            //timing
            lastTime = Date.now();
            setUpGameLoop();
        }
    }
    that.setBodyFunction = function (b)
    {
         stateBody = b;
    }
    that.setPreloaderFunction = function (preloadF)
    {
        preloaderStateBody = preloadF;
    }
    that.setStartFunction = function(startF)
    {
        startFunction = startF;
    }


    //salvataggio
    that.itemExist = function (value) {
        try {
            if (localStorage.getItem(value) != null)
                return true;

            return false;
        }
        catch (e) {

        }

    }



    //SAVE/LOAD
    that.clearSaveData = function ()
    {
        try {
            localStorage.clear();
        }
        catch (e) {

        }
    }
    that.saveData = function (value, vr)
    {
        try
        {
            localStorage.setItem(value, vr);
        }
        catch (e) {
            that.msg("Save error");
        }
    }

    that.loadData = function (type, value)
    {
        if (type == "string")
        {
            return localStorage.getItem(value);
        }
        else if (type == "number")
        {
            return parseInt(localStorage.getItem(value));
        }
        else if (type == "float")
        {
            return parseFloat(localStorage.getItem(value));
        }
        else if (type == "boolean")
        {
            if (localStorage.getItem(value) == "true")
                return true;
            else if (localStorage.getItem(value) == "false")
                return false;
        }

    }

}






