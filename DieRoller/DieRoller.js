﻿var camera, scene, renderer;
var cubeGeometry, material, plane, planeGeometry;
var three_d6n, three_d10, three_d20; // Die meshes
var testBox; // For testing d6n geometry

var cannon_d6n, cannon_d10, cannon_d20; // Die bodies
var d6nVerts = [], d10Verts = [], d20Verts = []; // Vertex arrays for die models
var d6nFaces = [], d10Faces = [], d20Faces = []; // Face arrays for die models
var d6nGeo; // Die geometries
var light, light2, ambientLight, rectLightHelper;
var loader, textureLoader;

var physicsMaterial, physicsContactMaterial; // Cannon.js materials
var world, timeStep = 1/60; // Cannon.js world/update variables

function Main() {
    // Promise to run init, then run initCannon.
    promise = init().then(initCannon);
}

function init() {
    d = new $.Deferred();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.set(0, 2, 4);
    camera.rotation.set(-Math.PI / 4, 0, 0);

    scene = new THREE.Scene();
    scene.addEventListener('update', function () { });

    initLights();

    material = new THREE.MeshLambertMaterial({ color: 0x4f4f4f });

    // TEST this is for testing d6n mesh location
    var cubeGeo = new THREE.CubeGeometry(0.3, 0.3, 0.3);
    testBox = new THREE.Mesh(cubeGeo, material);
    scene.add(testBox);

    planeGeometry = new THREE.CubeGeometry(5, 0.1, 5);
    plane = new THREE.Mesh(planeGeometry, material);
    plane.position.set(0, -2, 0);
    scene.add(plane);

    loader = new THREE.ObjectLoader();

    loader.load("Assets/Dices/d6n.json", function (obj) {
        var materialObj = new THREE.MeshLambertMaterial({ color: 0x3479e5 });

        obj.scale.set(20, 20, 20);

        obj.traverse(function (child) {
            if (child instanceof THREE.Mesh) {
                child.material = materialObj;

                d6nGeo = new THREE.Geometry().fromBufferGeometry(child.geometry);

                d.resolve();
            }
        });

        three_d6n = obj;
        scene.add(three_d6n);

        console.log(three_d6n);
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

        cannon_d10 = obj;
        scene.add(cannon_d10);
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

        cannon_d20 = obj;
        scene.add(cannon_d20);
    });

    renderer = new THREE.WebGLRenderer({ antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    requestAnimationFrame(render);
    return d.promise();
}

function initCannon() {
    d = new $.Deferred();

    world = new CANNON.World(); // Create a new cannon.js world
    world.gravity.set(0, -9.82 / 2, 0); // Set the gravity
    world.broadphase = new CANNON.NaiveBroadphase(); // Broadphase algorithm detects collisions

    cannon_d6n = new CANNON.Body({ mass: 1 });

    var shape = new CANNON.Box(new CANNON.Vec3(0.15,0.15,0.15)); 
    cannon_d6n.addShape(shape);
    cannon_d6n.angularVelocity.set(0, 0, -3);
    //cannon_d6n.position.set(0.25, 0.25, 0.25);
    cannon_d6n.angularDamping = 0.5;
    world.addBody(cannon_d6n);

    var platformBody = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(0, -2, 0) });
    var platform = new CANNON.Box(new CANNON.Vec3(5, 0.1, 5));
    platformBody.addShape(platform);
    world.addBody(platformBody);

    physicsMaterial = new CANNON.Material("baseMaterial");
    physicsContactMaterial = new CANNON.ContactMaterial(
        physicsMaterial,
        physicsMaterial, 
        0.4,  // Friction coefficient
        0.2); // Restitution (bounciness)

    // Add material to the Cannon.js world
    world.addContactMaterial(physicsContactMaterial);

    return d.promise();
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
    requestAnimationFrame(render);

    updatePhysics();

    renderer.render(scene, camera);
}

function updatePhysics() {
    world.step(timeStep);

    // Reflect the cannon object's position onto the three mesh
    three_d6n.position.copy(cannon_d6n.position);
    testBox.position.copy(cannon_d6n.position);
    
    three_d6n.quaternion.copy(cannon_d6n.quaternion);
    testBox.quaternion.copy(cannon_d6n.quaternion);

    //three_d6n.position.x += 0.5;
    //three_d6n.position.y += 0.5;
    //three_d6n.position.z += 0.5;
}