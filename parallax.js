// Copyright (C) 2014 Ryan Mitchener
// Free under the terms of MIT license:

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.


// Parallax object
var Parallax = function(selector, options) {
    // Polyfill for transforms
    if (document.body.style.transform !== undefined) {
        this.transform = "transform";
    } else if (document.body.style.webkitTransform !== undefined) {
        this.transform = "webkitTransform";
    } else if (document.body.style.msTransform !== undefined) {
        this.transform = "msTransform";
    }

    // Configure options
    this.options = options || {};
    this.options.parallaxLevel = (this.options.parallaxLevel !== undefined) ? this.options.parallaxLevel : .8;
    this.options.dimens = (this.options.dimens !== undefined) ? this.options.dimens : null; // Only used to fix bugs. Only option is "full"
    this.options.position = (this.options.position !== undefined) ? this.options.position : "center"; // Options are center, top, and top center
    this.options.scaleToParallax = (this.options.scaleToParallax !== undefined) ? this.options.scaleToParallax : true;
    this.options.animateOnScroll = (this.options.animateOnScroll !== undefined) ? this.options.animateOnScroll : false;

    // Set up variables
    this.hasVideo = false;
    this.videoToggle = false; // Flag for request animation frame to update the frame 30fps
    this.useFallback = (navigator.userAgent.match(/Android|iPad|iPhone|iPod/i)) ? true : false;
    this.items = document.querySelectorAll(selector);
    this.canvases = [];
    this.ctx = [];
    this.currentSlide = 1; // Used in animateOnScroll to know which parallax item is currently snapped to the top
    this.animating = false; // Lets Parallax know if animateOnScroll is currently animating
    this.preventAnimateOnScroll = false; // Stops the mouse and keyboard events if options.animateOnScroll is true

    // Set up layout for parallax
    this.layout();
    this.onResize();

    // Set load listeners for images
    for (var i=0, l=this.items.length; i < l; i++) {
        if (this.items[i].tagName === "VIDEO") {
            if (this.hasVideo === false && this.useFallback === false) {
                this.hasVideo = true;
            }
            if (this.items[i].readyState >= 2) {
                this.onVideoLoad.call(this, i);
            } else {
                this.items[i].addEventListener("loadedmetadata", this.onVideoLoad.bind(this, i));
            }
        } else if (this.items[i].complete === true) {
            this.onImageLoad(i);
        } else {
            this.items[i].addEventListener('load', this.onImageLoad.bind(this, i));
        }
    }

    // Attach events
    if (this.useFallback === false) {
        window.addEventListener('scroll', this.updateCanvases.bind(this));
        if (this.options.animateOnScroll === true) {
            window.addEventListener('keydown', this.handleSlideEvents.bind(this));
            window.addEventListener('mousewheel', this.handleSlideEvents.bind(this)); // Safari
            window.addEventListener('wheel', this.handleSlideEvents.bind(this));
        }
    }
    window.addEventListener('resize', this.onResize.bind(this));
}


// Set up request animation frame
window.requestAnimFrame = (function() { 
    return window.requestAnimationFrame || 
    function(callback) {
        window.setTimeout(callback, 1000 / 60); 
    }
})();


// Layout appropriate elements
Parallax.prototype.layout = function() {
    for (var i=0, l=this.items.length; i < l; i++) {
        if (this.useFallback === false) {
            var canvas = document.createElement("canvas");
            canvas.className = "parallax-item";
            this.canvases.push(canvas);
            this.items[i].parentElement.insertBefore(canvas, this.items[i]);
            this.ctx.push(canvas.getContext('2d'));
        } else {
            // Set the container's position to relative if it is static
            if (getComputedStyle(this.items[i].parentElement).position === "static") {
                this.items[i].parentElement.style.position = "relative";
            }

            // Create fallback container
            var cont = document.createElement("div");
            cont.className = "parallax-item";

            // Create fallback image
            var imgCont = document.createElement("div");
            imgCont.className = "parallax-fallback-img";
            imgCont.className += (this.items[i].getAttribute('data-pattern') !== null) ? " parallax-pattern" : "";
            imgCont.style.backgroundImage = "url(" + this.items[i].src + ")";

            // Attach fallback
            cont.appendChild(imgCont);
            this.items[i].parentElement.insertBefore(cont, this.items[i]);
        }
    }
}


// Event listener for image load
Parallax.prototype.onImageLoad = function(index) {
    if (this.useFallback === false) {
        if (this.items[index].getAttribute('data-pattern') !== null) {
            var pattern = this.ctx[index].createPattern(this.items[index], "repeat");
            this.ctx[index].fillStyle = pattern;
        }
        this.canvases[index].className += " parallax-visible";
        this.updateCanvases();
    } else {
        this.items[index].parentElement.querySelector('.parallax-item').className += " parallax-visible";
    }
}


// Event listener for video load
Parallax.prototype.onVideoLoad = function(i) {
    if (this.useFallback === false) {
        this.canvases[i].className += " parallax-visible";
        this.items[i].play();
        this.playVideoFrame.call(this);
    } else {
        this.items[i].parentElement.querySelector('.parallax-item').className += " parallax-visible";   
    }
}

// Play a video
Parallax.prototype.playVideoFrame = function() {
    if (this.videoToggle) {
        this.updateCanvases();
    }
    this.videoToggle = !this.videoToggle;
    requestAnimFrame(this.playVideoFrame.bind(this));
}


// Resize canvases on window resize
Parallax.prototype.onResize = function(ev) {
    for (var i=0, l=this.items.length; i < l; i++) {
        if (this.useFallback === false) {
            // This is to fix a chrome bug where on vertical window resize, vh units do not recalculate
            if (this.options.dimens === "full") {
                this.canvases[i].parentElement.style.height = window.innerHeight + "px";
            } else {
                this.canvases[i].style.left = this.canvases[i].parentElement.offsetLeft + "px";
            }
            this.canvases[i].width = this.canvases[i].parentElement.offsetWidth;
            this.canvases[i].height = this.canvases[i].parentElement.offsetHeight;

            // Reset the pattern based on the new canvas size
            if (this.items[i].getAttribute('data-pattern') !== null) {
                var pattern = this.ctx[i].createPattern(this.items[i], "repeat");
                this.ctx[i].fillStyle = pattern;
            }
        } else {
            if (this.options.dimens === "full") {
                this.items[i].parentElement.style.height = window.innerHeight + "px";
            }
        }
    }

    // Update canvases if not in fallback mode
    if (this.useFallback === false) {
        this.updateCanvases();
    }
}


// Scale and parallax images on the canvases
Parallax.prototype.updateCanvases = function() {
    for (var i=0, l=this.canvases.length; i < l; i++) {
        // Move the fixed position canvases
        if (this.transform === "msTransform") {
            this.canvases[i].style[this.transform] = "translate(0px, " + (window.pageYOffset - this.canvases[i].parentElement.offsetTop) * -1 + "px)";
        } else {
            this.canvases[i].style[this.transform] = "translate3d(0px, " + (window.pageYOffset - this.canvases[i].parentElement.offsetTop) * -1 + "px, 0px)";
        }

        // Skip redrawing canvases that are not in sight
        if (pageYOffset < this.canvases[i].parentElement.offsetTop - innerHeight ||
            pageYOffset > this.canvases[i].parentElement.offsetTop + this.canvases[i].height) {
            continue;
        }

        // Set up misc variables
        var parallaxLevel = (Array.isArray(this.options.parallaxLevel)) ? this.options.parallaxLevel[i] : this.options.parallaxLevel;
        if (this.items[i].tagName === "VIDEO") {
            var multiplier = this.items[i].videoWidth / this.items[i].videoHeight;
        } else {
            var multiplier = this.items[i].width / this.items[i].height;
        }

        // Render canvas if image is a pattern
        if (this.ctx[i].fillStyle instanceof CanvasPattern) {
            var patternOffset = (pageYOffset * parallaxLevel) - this.canvases[i].parentElement.offsetTop;
            this.ctx[i].clearRect(0, 0, this.canvases[i].width, this.canvases[i].height);
            this.ctx[i].translate(0, patternOffset);
            this.ctx[i].fillRect(0, -patternOffset, this.canvases[i].width, this.canvases[i].height);
            this.ctx[i].translate(0, -patternOffset);
            continue;
        }

        // Get the desired height of the canvas for scale
        if (this.options.position === "center") {
            if (this.canvases[i].height < innerHeight && this.options.scaleToParallax === true) {
                // This only scales the image the amount necessary for the parallax (really only noticeable at low parallax levels)
                var desiredHeight = Math.min(innerHeight, this.canvases[i].height + (innerHeight * this.options.parallaxLevel));
            } else {
                // This will scale the image to at least the viewport size
                var desiredHeight = Math.max(innerHeight, this.canvases[i].height);
            }
        } else if (this.options.position === "top" || this.options.position === "top center") {
            var desiredHeight = this.canvases[i].height;
        }
        
        // If the desired height of the image causes the image's width to be less than the parent, 
        // adjust the height so that the width will fill the parent while maintaining the aspect ratio
        if (desiredHeight * multiplier < this.canvases[i].parentElement.offsetWidth) {
            var newMult = this.canvases[i].parentElement.offsetWidth / (desiredHeight * multiplier);
            desiredHeight *= newMult;
        }

        // Get the position values
        var posX = Math.min(0, (this.canvases[i].width - desiredHeight * multiplier) / 2);
        var remainder = (desiredHeight - this.canvases[i].height) / 2; // Distance above and below the vertically centered canvas
        var center = this.canvases[i].parentElement.offsetTop - ((innerHeight - this.canvases[i].height) / 2); // The scroll value when this canvas is vertically centered
        var centerOffset = pageYOffset - center; // The distance the canvas is from its center point
        if (this.options.position === "center") {
            var posY = (centerOffset * parallaxLevel) - remainder;
        } else if (this.options.position === "top") {
            var posY = pageYOffset * this.options.parallaxLevel;
        } else if (this.options.position === "top center") {
            var posY = (pageYOffset * parallaxLevel) - remainder;
        }

        // Draw the canvas
        this.ctx[i].clearRect(0, 0, this.canvases[i].width, this.canvases[i].height);
        this.ctx[i].drawImage(this.items[i], posX, posY, desiredHeight * multiplier, desiredHeight);
    }
}


// Handles the mouse and keyboard events for the option animateOnScroll
Parallax.prototype.handleSlideEvents = function(ev) {
    var direction = null;
    if (this.preventAnimateOnScroll == true) {
        return;
    } else if (ev instanceof KeyboardEvent) {
        if (ev.which === 38 || ev.which === 33) { // Up
            ev.preventDefault();
            direction = "up";
        } else if (ev.which === 40 || ev.which === 34) { // Down
            ev.preventDefault();
            direction = "down";
        }
    } else if (ev instanceof WheelEvent) {
        ev.preventDefault();
        // Handle Safari
        if (ev.type === "mousewheel") {
            if (ev.wheelDeltaY > 0) {
                direction = "up";    
            } else if (ev.wheelDeltaY < 0) {
                direction = "down";
            }
        } else if (ev.deltaY < 0) { // Up
            direction = "up";
        } else if (ev.deltaY > 0) { // Down
            direction = "down";
        }
    }

    // Set the current slide to the closest slide in case the user has moved at all 
    this.currentSlide = this.findNearestSlide();

    if (direction === "up" && this.animating === false) {
        if (this.currentSlide == 1 && pageYOffset >= 0) {
            this.slideTo(0, true);
        } else {
            this.currentSlide = (this.currentSlide - 1 < 1) ? 1 : this.currentSlide - 1;
            this.slideTo(this.currentSlide);
        }
    } else if (direction === "down" && this.animating === false) {
        if (this.currentSlide == this.items.length && pageYOffset <= document.body.scrollHeight - innerHeight) {
            this.slideTo(document.body.scrollHeight - innerHeight, true);
        } else {
            this.currentSlide = (this.currentSlide + 1 > this.items.length) ? this.items.length : this.currentSlide + 1;
            this.slideTo(this.currentSlide);
        }        
    }
}


// Finds the closest slide to the current scroll position
Parallax.prototype.findNearestSlide = function() {
    var closest = {distance: null, index: null};
    for (var i=0, l=this.items.length; i < l; i++) {
        var distance = Math.abs(this.items[i].parentElement.offsetTop - pageYOffset);
        if (distance === 0) {
            return i + 1;
        } else if (distance < closest.distance || closest.distance === null) {
            closest.distance = distance;
            closest.index = i;
        }
    }
    return closest.index + 1;
}


// Animates to an image. 
// The num parameter the number of the image to go to (starting at 1) or the scrollTop to scroll to (if isPixelAmount is true)
Parallax.prototype.slideTo = function(num, isPixelAmount) { 
    this.animating = true;
    this.iteration = 0;
    this.startValue = pageYOffset;
    this.difference = (isPixelAmount === true) ? num - pageYOffset : this.items[num - 1].parentElement.offsetTop - pageYOffset;
    this.frames = (navigator.userAgent.indexOf("Chrome") !== -1) ? 60 : 40;
    requestAnimFrame(this.animateScroll.bind(this));
}


// Used in conjunction with animateTo
Parallax.prototype.animateScroll = function() {
    var posY = this.easeInOutQuart(this.iteration, this.startValue, this.difference, this.frames);
    window.scrollTo(0, posY);
    this.iteration++;

    if (this.iteration <= this.frames) {
        requestAnimFrame(this.animateScroll.bind(this));
    } else {
        this.animating = false;
    }
}


// Easing function based on Kirupa's port of Robert Penner's work
Parallax.prototype.easeInOutQuart = function(currentIteration, startValue, changeInValue, totalIterations) {
    if ((currentIteration /= totalIterations / 2) < 1) {
        return changeInValue / 2 * Math.pow(currentIteration, 4) + startValue;
    }
    return -changeInValue/2 * (Math.pow(currentIteration - 2, 4) - 2) + startValue;
}


// Instantiate Parallax
// new Parallax();