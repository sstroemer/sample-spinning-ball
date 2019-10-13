// get canvas and context
let canvas = document.querySelector('canvas');
let ctx    = canvas.getContext('2d');

// --------------------------------------------------------------------
// ------------------- SETTINGS

// ball parameters
let size = 10;
let mass = 10;
const gravity = 10;
const ey = 0.8;
const alpha = 2./4.;
const spinFriction = 1 / 100.;
const dragCoeff = 1 / 2000.0;
const spinCoeff = 1 / 4000.0;

// this adjusts a mismatch between size/dr/dx/dy/...
const scale = 5;

// ball state
let x, y, dx, dy, rot, dr, lastx, lasty;

// --------------------------------------------------------------------
// ------------------- SETUP & INITIALIZATION

const edge = {
    NONE: 0,
    LEFT: -2,
    RIGHT: 2,
    TOP: -1,
    BOTTOM: 1
};

// canvas size
canvas.width  = document.querySelector('#btn_spawn').offsetWidth;
canvas.height = window.innerHeight - document.querySelector('#btn_spawn').offsetHeight * 12;
let width  = canvas.width;
let height = canvas.height;

window.onresize = function(event) {
    canvas.width  = document.querySelector('#btn_spawn').offsetWidth;
    canvas.height = window.innerHeight - document.querySelector('#btn_spawn').offsetHeight * 12;
    width  = canvas.width;
    height = canvas.height;
};

// start the animation loop
spawn();
requestAnimationFrame(loop);

// --------------------------------------------------------------------
// ------------------- MOVING / DRAWING STUFF

// the main animation loop
let lastTime;
function loop(currentTime) {
    if (!lastTime) {
        lastTime=currentTime;
    }
    let dt = currentTime - lastTime;
    lastTime = currentTime;

    // check for collisions
    collision();

    // update everything
    update(dt / 1000);

    // redraw
    draw();

    requestAnimationFrame(loop);
}

// check and handle all collisions
function collision() {
    let impact = edge.NONE;

    if (y+size >= height) impact = edge.BOTTOM;
    if (y-size <= 0) impact = edge.TOP;
    if (x+size >= width) impact = edge.RIGHT;
    if (x-size <= 0) impact = edge.LEFT;

    if (impact === edge.NONE) {
        // no collision detected
        return;
    }

    // get correct orientation of collision (base is BOTTOM)
    let cx = 0;
    let cy = 0;
    if (impact === edge.BOTTOM) {
        cx = dx;
        cy = dy;
    } else if (impact === edge.TOP) {
        cx = -dx;
        cy = -dy;
    } else if (impact === edge.LEFT) {
        cx = dy;
        cy = -dx;
    } else if (impact === edge.RIGHT) {
        cx = -dy;
        cy = dx;
    }

    // get angle of impact (in [-90, 90])
    let theta = Math.abs(Math.atan2(cy, cx) / Math.PI * 180);
    if (theta > 90)  theta -= 90;
    if (theta < -90) theta += 90;

    // make coefficient of restitution vary in [-1,1] for AOIs in [-90,90] degrees
    let ex = -(90 - theta)/90 + theta/90;

    // =======================================================================================================
    // calculate new velocities
    // see: https://pdfs.semanticscholar.org/5a4a/c4105406ff2055344e943093687002da8513.pdf
    cy = -ey * cy;// - (1 + ey)*sy;
    cx = ((1 - alpha*ex) / (1 + alpha)) * cx + alpha * (1 + ex) / (1 + alpha) * ((size/scale) * dr);
    dr = ((alpha - ex) / (1 + alpha)) * dr + (1 + ex) / (1 + alpha) * (cx/scale) / (size/scale);
    // =======================================================================================================

    // reverse orientation
    if (impact === edge.BOTTOM) {
        dx = cx;
        dy = cy;
    } else if (impact === edge.TOP) {
        dx = -cx;
        dy = -cy;
    } else if (impact === edge.LEFT) {
        dx = -cy;
        dy = cx;
    } else if (impact === edge.RIGHT) {
        dx = cy;
        dy = -cx;
    }
}

// our draw function
function draw() {
    // remove the drawn cross
    ctx.beginPath();
        ctx.fillStyle = "#26a69a";
        ctx.arc(lastx, lasty, size, 0, 2*Math.PI);
    ctx.fill();
    // save current position
    lastx = x;
    lasty = y;

    // clear canvas (with some alpha to create a trail)
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;

    // draw border
    ctx.strokeRect(0, 0, width, height);

    // white background
    ctx.beginPath();
        ctx.fillStyle = "#FFFFFF";
        ctx.arc(x, y, size, 0, 2*Math.PI);
    ctx.fill();

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

// respawns a new ball with random
function spawn() {
    // reset ball position
    x = width*0.5;
    y = height*0.5;
    rot = 0;

    // choose random angle & speed
    let angle = Math.random() * 2 * Math.PI;
    let speed = 200 + Math.random() * 1000;

    // set initial speed
    dx = speed * Math.sin(angle);
    dy = speed * Math.cos(angle);

    // apply some rotation
    dr = (-0.5 + Math.random()) * 60;
}

// updates the ball position
function update(dt) {
    // get current velocity
    let velsq = dx*dx + dy*dy;
    let velocity = Math.sqrt(velsq);
    // get normalised vector of motion
    let nx = dx / velocity;
    let ny = dy / velocity;

    // slow down spin (through air resistance)
    dr *= (1 - spinFriction);

    // calculate drag
    // drag depends (quadratic) on size and velocity: http://www.physics.usyd.edu.au/~cross/TRAJECTORIES/42.%20Ball%20Trajectories.pdf
    let dragF = size*size * velsq * dragCoeff;
    let dragA = dragF / mass;

    // constrain the drag acceleration (just to be safe)
    dragA = Math.min(dragA*dt, Math.sqrt(velocity));

    // calculate magnus force and acceleration
    // see: http://spiff.rit.edu/richmond/baseball/traj/traj.html or others
    let magnusF = (spinCoeff * ((size * dr / Math.sqrt(velsq))*0.5)) * velsq * size*size;
    let magnusA = magnusF / mass;

    // apply magnus force
    if (document.querySelector('#switch_magnus').checked) {
        dx -= ny * magnusA * dt;
        dy += nx * magnusA * dt;
    }

    // apply drag
    if (document.querySelector('#switch_drag').checked) {
        dx -= nx * dragA * dt;
        dy -= ny * dragA * dt;
    }

    // apply gravity
    if (document.querySelector('#switch_gravity').checked) {
        dy += gravity;
    }

    // update position and angle of the ball
    x += dx * dt;
    y += dy * dt;
    rot += dr * dt;

    // constrain ball into area
    x = Math.min(Math.max(x, size), width-size);
    y = Math.min(Math.max(y, size), height-size);
}