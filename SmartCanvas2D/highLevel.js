//Smart Canvas 2D Framework 
//Copyright 2012 Mattia Russomando

function Rectangle(x, y, w, h)
{
    var that = this;
    that.x = 0;
    that.y = 0;
    that.width = 0;
    that.height = 0;
    that.set = function (x, y, w, h) { that.x = x; that.y = y; that.width = w; that.height = h; }
    that.set(x, y, w, h);
}
function Point(x, y)
{
    var that = this;
    that.x = 0;
    that.y = 0;
    that.set = function (x, y) { that.x = x; that.y = y; }
    that.set(x, y);
}

function Image2D(url, x, y, endLoadingFunction) //endLoadingFunction can be null
{
    var that = this;
    that.texture = MyCanvas.loadTexture(url, function () { init(); if (endLoadingFunction != null) endLoadingFunction(); });
    that.position = new Point(x, y); 
    var sourceRect = new Rectangle(0, 0, 0, 0);
    var origin = new Point(0, 0);
    var originZero = true; //with origin.x == 0 and origin.y == 0 the class doesn't update originFactor (performances++)
    var originFactor = new Point(0, 0);
    var scaleX = 1;
    var scaleY = 1;
    var scale = 1;
    that.scaledWidth = 0; //for native size use texture.width and texture->height
    that.scaledHeight = 0;
    that.angle = 0;

    function init()
    {
        //DO NOT CHANGE
        sourceRect.width = that.texture.width;
        sourceRect.height = that.texture.height;
        that.setScale(scale); //updates scaleValue if before loading its value has changed
        if (!originZero) updateOrigin();
    }

    //SCALE
    that.setScale = function (value) //it sets scale and updates the render direct value
    {
        scale = value;
        that.scaledWidth = scaleX * scale * sourceRect.width;
        that.scaledHeight = scaleY * scale * sourceRect.height;
        if (!originZero) updateOrigin();
    }
    that.setScaleX = function (value) { scaleX = value; that.scaledWidth = scaleX * scale * sourceRect.width; that.scaledHeight = scaleY * scale * sourceRect.height; if (!originZero) updateOrigin(); }
    that.setScaleY = function (value) { scaleY = value; that.scaledWidth = scaleX * scale * sourceRect.width; that.scaledHeight = scaleY * scale * sourceRect.height; if (!originZero) updateOrigin(); }
    that.alpha = 1;
    that.flippedHorizontal = false;
    that.flippedVertical = false;
    //SOURCE RECT
    that.setSourceRect = function (x, y, w, h)
    {
        sourceRect.x = x; sourceRect.y = y; sourceRect.width = w; sourceRect.height = h;
        if (!originZero) updateOrigin();
    }
    that.setSourceX = function (x) { sourceRect.x = x; if (!originZero) updateOrigin(); }
    that.setSourceY = function (y) { sourceRect.x = y; if (!originZero) updateOrigin(); }
    that.setSourceW = function (w) { sourceRect.width = w; if (!originZero) updateOrigin(); }
    that.setSourceH = function (h) { sourceRect.height = h; if (!originZero) updateOrigin(); }
    that.getSourceX = function () { return sourceRect.x; }
    that.getSourceY = function () { return sourceRect.y; }
    that.getSourceW = function () { return sourceRect.width; }
    that.getSourceH = function () { return sourceRect.height; }

    //ORIGIN
    that.setOrigin = function(x, y) //0->1
    {
        if (x == 0 && y == 0) originZero = true;
        else originZero = false;
        origin.x = x; origin.y = y; 
        if (!originZero) updateOrigin();
    }
    that.centerOrigin = function()
    {
        originZero = false;
        origin.x = 0.5; origin.y = 0.5;
        if (!originZero) updateOrigin();
    }
    function updateOrigin()
    {
        originFactor.x = origin.x * that.scaledWidth;
        originFactor.y = origin.y * that.scaledHeight;
    }
    that.getOriginX = function () { return origin.x; }
    that.getOriginY = function () { return origin.y; }
   

    //RENDER
    that.render = function()
    {
        if (that.alpha != 1) MyCanvas.setAlpha(that.alpha);
        MyCanvas.fillTextureComplete2(that.texture, that.position.x - originFactor.x, that.position.y - originFactor.y, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
            that.scaledWidth, that.scaledHeight, that.flippedHorizontal, that.flippedVertical, that.angle, originFactor.x, originFactor.y);
        if (that.alpha != 1) MyCanvas.setAlpha(1);
    }
    
}



function Text2D(txt, x, y, font, size, color, center, fontStyle) 
{
    var that = this;
    that.position = new Point(x, y);
    var text = txt;
    var width = 0;
    var size = size;
    var font = font;
    var fontStyle = fontStyle;
    that.color = color;
    var fontString = getFontString();
    that.fill = true;
    that.strokeSize = 1;
    var shadowValue = 0;
    var shadowColor = null;
    var shadowOffset = null;
    var centered = center;
    that.alpha = 1;
    //set text width
    updateWidth();
    if (center) that.position.x -= width / 2;

    function getFontString()
    {
        return MyCanvas.getFontString(font, size, fontStyle);
    }

    function updateWidth()
    {
        MyCanvas.ctx.save();
        MyCanvas.ctx.font = fontString;
        width = MyCanvas.ctx.measureText(text).width;
        MyCanvas.ctx.restore();
    }

    that.setText = function (value)
    {
        var oldW = width;
        text = value;
        updateWidth();
        if (centered) that.position.x += (oldW - width) / 2;
    }
    that.getText = function () { return text; }

    that.setSize = function(value)
    {
        size = value;
        fontString = getFontString();
        updateWidth()
    }
    that.getSize = function () { return size; }

    that.setFont = function (value)
    {
        font = value;
        fontString = getFontString();
        updateWidth()
    }
    that.getFont = function () { return font; }

    that.setFontStyle = function (value)
    {
        fontStyle = value;
        fontString = getFontString();
        updateWidth()
    }
    that.getFontStyle = function () { return fontStyle; }

    that.setShadow = function (value, clr, offsetX, offsetY)
    {
        shadowValue = value;
        shadowColor = clr;
        shadowOffset.x = offsetX;
        shadowOffset.y = offsetY;
    }
    that.disableShadow = function()
    {
        shadowValue = 0;
        shadowColor = null;
        shadowOffset = null;
    }

    that.render = function()
    {
        if (that.alpha != 1) MyCanvas.setAlpha(that.alpha);
        if (shadowValue != 0)
            MyCanvas.setUpShadow(shadowValue, shadowColor, shadowOffset.x, shadowOffset.y);       
        if (that.fill)
        {
            MyCanvas.fillString(text, that.position.x, that.position.y, fontString, color, false);
        }
        else
        {
            MyCanvas.strokeString(text, that.position.x, that.position.y, fontString, color, false, that.strokeSize);
        }
        if (shadowValue != 0)
            MyCanvas.disableShadow();
        if (that.alpha != 1) MyCanvas.setAlpha(1);
    }
    
}

