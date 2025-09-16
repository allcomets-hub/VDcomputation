let body;
let face;

function preload() {
  body = loadImage('body.png');
  let n = int(random(1, 5));
  let imgName = n + ".png";  
  face = loadImage(imgName); 
}

function setup() {
  createCanvas(400, 400);
  background('beige');
  image(body, 0, 0);
  image(face, 132, 134);
}

