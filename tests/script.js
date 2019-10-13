// todo: rotation on collision with wall doesn't update in a meaningful way:
// it should sometimes (?) reverse/ mirror the direction the ball is moving?!


// get canvas and context
var canvas = document.querySelector('canvas');
var ctx    = canvas.getContext('2d');


// --------------------------------------------------------------------
// ------------------- SETTINGS

// position/angle of the ball
var x = 0;
var y = height*0.5;
var rot = 0;

// speed of the ball
var dx = 0;
var dy = 0;

// rotation of the ball
var dr = 0;

// ball parameters
var size = 10
var mass = 10;
var spinCoef = 0.001;
var friction = 0;
var gravity = 0;

// canvas size
canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.8;
var width  = canvas.width;
var height = canvas.height;



// --------------------------------------------------------------------
// ------------------- SETUP & INITIALIZATION

// start the animation loop
spawn();
requestAnimationFrame(loop);


// --------------------------------------------------------------------
// ------------------- MOVING / DRAWING STUFF

// the main animation loop
var lastTime;
function loop(currentTime) {
    if (!lastTime) {
        lastTime=currentTime;
    }
    dt = currentTime - lastTime
    lastTime = currentTime;


    // constrain ball into area
    x = Math.min(Math.max(x, size), width-size);
    y = Math.min(Math.max(y, size), height-size);

    // coefficient of restitution \in [0,1]
    let e = 0.9;

    // be careful. our rotation (right now CW pos) is mirrored to the theoretical onee (CCW pos)
    // our y coordinate is top centered (theory is bottom - z - centered)

    // handle all possible collisions here
    if (y+size >= height) {
        dr = -(2*size*(-dr) - 5*(dx - 0)) / (7 * size);
        dx = (-2*size*(-dr) + 5*dx + 2*0) / 7;
        dy = -(-e*(-dy) + (1+e) * 0);
    } else if (y-size <= 0) {
        dr = -(2*size*(-dr) - 5*((-dx) - 0)) / (7 * size);
        dx = -(-2*size*(-dr) + 5*(-dx) + 2*0) / 7;
        dy = (-e*(dy) + (1+e) * 0);
    }
    if (x+size >= width) {
        dr = -(2*size*(-dr) - 5*((-dy) - 0)) / (7 * size);
        dy = -(-2*size*(-dr) + 5*(-dy) + 2*0) / 7;
        dx = -(-e*(-dx) + (1+e) * 0);
    } else if (x-size <= 0) {
        dr = -(2*size*(-dr) - 5*(dy - 0)) / (7 * size);
        dy = (-2*size*(-dr) + 5*dy + 2*0) / 7;
        dx = (-e*dx + (1+e) * 0);
    }

    update(dt / 1000);
    stats();
    draw();
    requestAnimationFrame(loop);
}

// our draw function
function draw() {
    // clear canvas
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // draw border
    ctx.strokeRect(0, 0, width, height);

    // draw ball
    ctx.beginPath();
        // full circle
        ctx.arc(x, y, size, 0, 2*Math.PI);

        // middle cross
        ctx.moveTo(x + size*Math.cos(rot), y + size*Math.sin(rot));
        ctx.lineTo(x - size*Math.cos(rot), y - size*Math.sin(rot));
        ctx.moveTo(x + size*Math.cos(rot + Math.PI/2), y + size*Math.sin(rot + Math.PI/2));
        ctx.lineTo(x - size*Math.cos(rot + Math.PI/2), y - size*Math.sin(rot + Math.PI/2));
    ctx.stroke();
}

// respawns a new ball with the correct settings
function spawn() {
    // reset ball position
    x = 3*size;
    y = height*0.5;
    rot = 0;

    // choose new mass
    mass = 1 + Math.random()*30;

    // set initial speed
    dx = width / 3;
    dy = 0;

    // apply some rotation
    dr = (-0.5 + Math.random()) * 16 * Math.PI;
}

// updates the ball position
function update(dt) {
    // we assume air-friction slows down movement/spin in a similar way
    dx *= (1 - friction);
    dy *= (1 - friction);
    dr *= (1 - 2*friction);

    // get velocity and circumference of the ball
    let velocity = Math.sqrt(dx*dx + dy*dy);
    let circumference = 2 * Math.PI * size;

    // calculate force and acceleration
    let force = (spinCoef * velocity * circumference * circumference * dr) / (2 * size);
    let acceleration = force / mass;

    // get normalised vector of motion
    let nx = dx / velocity;
    let ny = dy / velocity;

    // update the current velocity based on acceleration
    dx -= ny * acceleration * dt;
    dy += nx * acceleration * dt;

    // apply gravity
    dy += gravity;

    // update position and angle of the ball
    x += dx * dt;
    y += dy * dt;
    rot += dr * dt;
}

// outputs the current stats
function stats() {
    statsDisplay.innerHTML = "Speed: " + Math.round(Math.sqrt(dx*dx+dy*dy)) +
    "; Angular speed: " + Math.round(dr) + "; Mass: " + Math.round(mass) + "; Gravity: " + ((gravity > 0) ? "on" : "off");
}