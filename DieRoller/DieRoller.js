var camera, scene, renderer;
var cubeGeometry, material, plane, planeGeometry;
var d6n, d10, d20; // Die models
var d10texture; // Die textures (not working yet)
var light, light2, ambientLight, rectLightHelper;
var loader, textureLoader;

var movingDown = true, movingUp = false;

'use strict';

Physijs.scripts.worker = 'lib/physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

function Main() {

    init();
}

function init() {


    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 2, 4);
    camera.rotation.set(-Math.PI / 4, 0, 0);

    scene = new Physijs.Scene();
    scene.setGravity(new THREE.Vector3(0, -30, 0)); // Gravity not really working?
    scene.addEventListener('update', function () { });

    initLights();

    textureLoader = new THREE.TextureLoader();

    cubeGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    material = Physijs.createMaterial(new THREE.MeshLambertMaterial({ color: 0x4f4f4f}));

    d10texture = Physijs.createMaterial(new THREE.MeshLambertMaterial());
    textureLoader.load("Assets/d10 numbers.png", function (texture) {
        d10texture.map = texture;
        material.needsUpdate = true;
    });
    //d10texture = Physijs.createMaterial(new THREE.MeshLambertMaterial({ map: textureLoader.load('Assets/d10 numbers.png') }));

    planeGeometry = new THREE.CubeGeometry(5, 0.1, 5);
    plane = new Physijs.BoxMesh(planeGeometry, material, 0);
    plane.position.set(0, -2, 0);
    scene.add(plane);

    loader = new THREE.ObjectLoader();

    loader.load("Assets/Dices/d6n.json", function (obj) {
        var materialObj = new THREE.MeshLambertMaterial({ color: 0x3479e5 });
        obj.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material = materialObj;
            }
        });
        obj.scale.set(20, 20, 20);
        obj.position.set(0, 0, 2);

        var geometry = loader.parseGeometries(obj);
        //geometry.computeBoundingBox();

        obj.geometry = geometry;

        d6n = new Physijs.ConvexMesh(obj);

        scene.add(d6n);
    });

    loader.load("Assets/Dices/d10.json", function (obj) {
        var materialObj = new THREE.MeshLambertMaterial({ color: 0xc92424 });
        obj.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material = materialObj;
            }
        });
        obj.scale.set(20, 20, 20);
        obj.position.set(2, 0, 0);
        scene.add(obj);
    });

    loader.load("Assets/Dices/d20.json", function (obj) {
        var materialObj = new THREE.MeshLambertMaterial({ color: 0x139615 });
        obj.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material = materialObj;
            }
        });
        obj.scale.set(20, 20, 20);
        obj.position.set(-2, 0, 0);
        scene.add(obj);
    });

    renderer = new THREE.WebGLRenderer({ antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    requestAnimationFrame(render);
}

function initLights() {

    light = new THREE.PointLight(0x43B536, 0.8, 100);
    light.position.set(-2, -2, 2);
    scene.add(light);

    light2 = new THREE.PointLight(0xffffff, 0.8, 100);
    light2.position.set(2, 2, -2);
    scene.add(light2);

    ambientLight = new THREE.AmbientLight(0xbfbfbf);
    scene.add(ambientLight);
}

function render() {
    scene.simulate();
    requestAnimationFrame(render);

    //d6n.position.y -= 0.01;

    renderer.render(scene, camera);
}

/*function animate() {

    requestAnimationFrame(animate);
    rounded_cube.rotation.x += 0.01;
    rounded_cube.rotation.y += 0.04;
    
    d10.rotation.x += 0.04;
    d10.rotation.y += 0.01;

    if (movingDown) {
        rounded_cube.position.y -= 0.01;
        d10.position.y -= 0.01;

        if (rounded_cube.position.y <= -2) {
            movingDown = false;
            movingUp = true;
        }
    }

    if (movingUp) {
        rounded_cube.position.y += 0.01;
        d10.position.y += 0.01;

        if (rounded_cube.position.y >= 0) {
            movingDown = true;
            movingUp = false;
        }
    }


    renderer.render(scene, camera);
}*/