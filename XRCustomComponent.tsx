import React, { useEffect, FunctionComponent } from 'react';
import { MeshBuilder, StandardMaterial, Color3, Vector3, Scene, WebXRDefaultExperience, WebXRHandTracking, Texture, Tools, Material } from '@babylonjs/core';
import { GUI3DManager, NearMenu, TouchHolographicButton } from '@babylonjs/gui';
import { ViewProps } from 'react-native';
import { XRFeatureDetails, IXRFeatureDetails, ArticulatedHandTracker, ArticulatedHandTrackerOptions } from 'mixed-reality-toolkit';

declare var _native : any;

export interface XRBaseProps extends ViewProps {
    scene?: Scene;
    xrExperience?: WebXRDefaultExperience;
    setXRFeatures: React.Dispatch<React.SetStateAction<Array<IXRFeatureDetails> | undefined>>;
};

// Function to draw the bars of the graph, given variable heights
function createBars(heights: any, barMaterial: Material, groundPos: Vector3, groundRot: Vector3, scene: Scene) {
    var waData = MeshBuilder.CreateBox("washington", {height: heights.WA, width: 0.03, depth: 0.03, updatable: true}, scene);
    waData.material = barMaterial;
    waData.rotation = groundRot;
    waData.position = groundPos.add(new Vector3(-0.27, heights.WA/2 + 0.04, 0.12));

    var ilData = MeshBuilder.CreateBox("illinois", {height: heights.IL, width: 0.03, depth: 0.03, updatable: true}, scene);
    ilData.material = barMaterial;
    ilData.rotation = groundRot;
    ilData.position = groundPos.add(new Vector3(0.07, heights.IL/2, 0));
    
    var txData = MeshBuilder.CreateBox("texas", {height: heights.TX, width: 0.03, depth: 0.03, updatable: true}, scene);
    txData.material = barMaterial;
    txData.rotation = groundRot;
    txData.position = groundPos.add(new Vector3(-0.04, heights.TX/2 -0.03, -0.12));

    return [waData, ilData, txData];
}

// Scale the data to range(0, 0.3) for heights
function scaleData(heights: any) {
    var maxVal = Math.max(heights.WA, heights.IL, heights.TX);

    var scaled = {
        WA: heights.WA/maxVal * 0.3,
        IL: heights.IL/maxVal * 0.3,
        TX: heights.TX/maxVal * 0.3
    }

    return scaled;
}

export const XRCustomComponent: FunctionComponent<XRBaseProps> = (props: XRBaseProps) => {

    // Load font for text
    useEffect(() => {
        (async () => {
            try {
                if (props.scene) {
                    const data = await Tools.LoadFileAsync('https://raw.githubusercontent.com/CedricGuillemet/dump/master/droidsans.ttf');
                    await _native.NativeCanvas.loadTTFAsync('droidsans', data);
                }
            } catch (err) {
                console.log(err);
            }
        })();
    }, [props.scene]);

    /* Scene content */
    useEffect(() => {
        if (!!props.scene &&
            !!props.xrExperience) {
            
            // Map
            const mapMesh = MeshBuilder.CreateGround("map", {width: 0.7, height: 0.4}, props.scene);

            const mapMaterial: StandardMaterial = new StandardMaterial("groundMaterial", props.scene);
            mapMaterial.diffuseTexture = new Texture("https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Map_of_USA_with_state_names.svg/1280px-Map_of_USA_with_state_names.svg.png", props.scene);

            mapMesh.material = mapMaterial;
            mapMesh.position = new Vector3(0, -0.2, 0.8);
            mapMesh.rotation = new Vector3(-0.3, 0, 0);

            // TODO: Get actual data from Data USA API- https://datausa.io/profile/geo/texas?compare=washington
            const populationData = {
                WA: 100,
                IL: 50,
                TX: 25
            };

            const povertyData = {
                WA: 20,
                IL: 40,
                TX: 60
            };

            // Scale the data to appropriate heights; set population as default
            let heights = scaleData(populationData);

            // Draw initial graph
            const barMaterial: StandardMaterial = new StandardMaterial("barMaterial", props.scene);
            barMaterial.diffuseColor = new Color3(0, 1, 0);
            var bars = createBars(heights, barMaterial, mapMesh.position, mapMesh.rotation, props.scene);

            // Near Menu + Buttons
            const manager = new GUI3DManager(props.scene);

            const near = new NearMenu("near");
            manager.addControl(near);
            near.scaling = new Vector3(0.1,0.1,0.1);

            const button0 = new TouchHolographicButton("button0");
            button0.text = "Population";
            const scene = props.scene;
            button0.onPointerClickObservable.add(function() {
                // Set bar color to green
                barMaterial.diffuseColor = new Color3(0, 1, 0);

                // Dispose of existing bars on map
                for (var i = 0; i < bars.length; i++) {
                    bars[i].dispose();
                }

                // Create new bars on map
                heights = scaleData(populationData);
                bars = createBars(heights, barMaterial, mapMesh.position, mapMesh.rotation, scene);
            });
            near.addButton(button0);

            const button1 = new TouchHolographicButton("button1");
            button1.text = "Poverty";
            button1.onPointerClickObservable.add(function() {
                // Set bar color to red
                barMaterial.diffuseColor = new Color3(1, 0, 0);

                // Dispose of existing bars on map
                for (var i = 0; i < bars.length; i++) {
                    bars[i].dispose();
                }

                // Create new bars on map
                heights = scaleData(povertyData);
                bars = createBars(heights, barMaterial, mapMesh.position, mapMesh.rotation, scene);
            });     
            near.addButton(button1);

            return () => {
                /* Clean up any content created in the scene */
                mapMesh?.dispose();
                manager?.dispose();
                near?.dispose();
                button0?.dispose();
                button1?.dispose();
                for (var i = 0; i < bars.length; i++) {
                    bars[i].dispose();
                }
            };
        }
    }, [props.scene, props.xrExperience]);

    useEffect(() => {
        if (!!props.scene &&
            !!props.xrExperience) {
            /* Define your required XR features for this scene */

            // Enable hand tracking with visuals
            const jointMaterial = new StandardMaterial("jointMaterial", props.scene);
            const articulatedHandOptions: ArticulatedHandTrackerOptions = {
                scene: props.scene,
                xr: props.xrExperience,
                jointMaterial: jointMaterial,
                pinchedColor: Color3.White(),
                unpinchedColor: Color3.Blue(),
                trackGestures: true,
                enablePointer: true
            };
            const articulatedHandTracker = new ArticulatedHandTracker(articulatedHandOptions);
            const requiredXRFeatures: Array<IXRFeatureDetails> = [new XRFeatureDetails(WebXRHandTracking.Name, articulatedHandTracker.getHandTrackingOptions())];
            props.setXRFeatures(requiredXRFeatures);

            return () => {
                props.setXRFeatures([]);
                articulatedHandTracker.dispose();
                jointMaterial.dispose();
            }
        }
    }, [props.scene, props.xrExperience]);

    return null;
};
