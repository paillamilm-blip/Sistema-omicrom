/* eslint-disable @typescript-eslint/no-explicit-any */
// ─────────────────────────────────────────────────────────────────────────────
// Type shims for Three.js ecosystem packages.
// These allow TypeScript to compile when node_modules are not fully installed.
// Once `npm install` runs in a networked environment, these are superseded by
// the actual @types/three declarations.
// ─────────────────────────────────────────────────────────────────────────────

declare module 'three' {
  export class Scene {
    add(...objects: any[]): void;
    remove(...objects: any[]): void;
    background: any;
    fog: any;
  }
  export class PerspectiveCamera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    position: Vector3;
    lookAt(v: Vector3 | number, y?: number, z?: number): void;
    aspect: number;
    updateProjectionMatrix(): void;
  }
  export class WebGLRenderer {
    constructor(params?: any);
    setSize(w: number, h: number): void;
    setPixelRatio(r: number): void;
    render(scene: Scene, camera: PerspectiveCamera): void;
    dispose(): void;
    domElement: HTMLCanvasElement;
    setClearColor(color: any, alpha?: number): void;
    setAnimationLoop(callback: ((time: number) => void) | null): void;
  }
  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number; y: number; z: number;
    set(x: number, y: number, z: number): this;
    setScalar(s: number): this;
    copy(v: Vector3): this;
    add(v: Vector3): this;
    multiplyScalar(s: number): this;
    normalize(): this;
    length(): number;
    distanceTo(v: Vector3): number;
    clone(): Vector3;
    lerp(v: Vector3, alpha: number): this;
  }
  export class Color {
    constructor(r?: number | string, g?: number, b?: number);
    setHSL(h: number, s: number, l: number): this;
    lerp(color: Color, alpha: number): this;
    clone(): Color;
    r: number; g: number; b: number;
  }
  export class BufferGeometry {
    setAttribute(name: string, attribute: any): this;
    setIndex(index: any): this;
    dispose(): void;
    computeBoundingSphere(): void;
    attributes: Record<string, any>;
  }
  export class Float32BufferAttribute {
    constructor(array: ArrayLike<number> | number, itemSize: number);
    needsUpdate: boolean;
    array: Float32Array;
  }
  export class Uint16BufferAttribute {
    constructor(array: ArrayLike<number> | number, itemSize: number);
  }
  export class Points {
    constructor(geometry?: BufferGeometry, material?: any);
    geometry: BufferGeometry;
    material: any;
    rotation: { x: number; y: number; z: number };
    visible: boolean;
  }
  export class LineSegments {
    constructor(geometry?: BufferGeometry, material?: any);
    geometry: BufferGeometry;
    material: any;
    rotation: { x: number; y: number; z: number };
    visible: boolean;
  }
  export class Line {
    constructor(geometry?: BufferGeometry, material?: any);
    geometry: BufferGeometry;
    material: any;
    rotation: { x: number; y: number; z: number };
    visible: boolean;
  }
  export class Mesh {
    constructor(geometry?: any, material?: any);
    geometry: any;
    material: any;
    position: Vector3;
    rotation: { x: number; y: number; z: number };
    scale: Vector3;
    visible: boolean;
  }
  export class Group {
    constructor();
    add(...objects: any[]): void;
    remove(...objects: any[]): void;
    rotation: { x: number; y: number; z: number };
    position: Vector3;
    children: any[];
  }
  export class PointsMaterial {
    constructor(params?: any);
    dispose(): void;
    opacity: number;
    size: number;
    color: Color;
    transparent: boolean;
    blending: number;
    depthWrite: boolean;
    vertexColors: boolean;
  }
  export class LineBasicMaterial {
    constructor(params?: any);
    dispose(): void;
    opacity: number;
    color: Color;
    transparent: boolean;
    blending: number;
    linewidth: number;
    vertexColors: boolean;
  }
  export class ShaderMaterial {
    constructor(params?: any);
    dispose(): void;
    uniforms: Record<string, { value: any }>;
    vertexShader: string;
    fragmentShader: string;
    transparent: boolean;
    blending: number;
    depthWrite: boolean;
    needsUpdate: boolean;
  }
  export class MeshBasicMaterial {
    constructor(params?: any);
    dispose(): void;
    color: Color;
    opacity: number;
    transparent: boolean;
  }
  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }
  export class TubeGeometry extends BufferGeometry {
    constructor(path?: any, tubularSegments?: number, radius?: number, radialSegments?: number, closed?: boolean);
  }
  export class CatmullRomCurve3 {
    constructor(points: Vector3[], closed?: boolean, curveType?: string, tension?: number);
    getPoints(divisions: number): Vector3[];
  }
  export class CurvePath {
    curves: any[];
    getPoints(divisions: number): Vector3[];
  }
  export const AdditiveBlending: number;
  export const NormalBlending: number;
  export class Clock {
    constructor(autoStart?: boolean);
    getElapsedTime(): number;
    getDelta(): number;
  }
  export class TextureLoader {
    load(url: string, onLoad?: (texture: any) => void): any;
  }
  export class CanvasTexture {
    constructor(canvas: HTMLCanvasElement);
    needsUpdate: boolean;
    dispose(): void;
  }
  export class Fog {
    constructor(color: any, near?: number, far?: number);
  }
  export class Raycaster {
    constructor();
    setFromCamera(coords: any, camera: any): void;
    intersectObjects(objects: any[], recursive?: boolean): any[];
    intersectObject(object: any, recursive?: boolean): any[];
  }
  export class Object3D {
    position: Vector3;
    rotation: { x: number; y: number; z: number };
    scale: Vector3;
    add(...objects: any[]): void;
    remove(...objects: any[]): void;
  }
}

declare module '@react-three/fiber' {
  export const Canvas: any;
  export function useFrame(callback: (state: any, delta: number) => void, priority?: number): void;
  export function useThree(): any;
  export function extend(objects: Record<string, any>): void;
}

declare module '@react-three/drei' {
  export const OrbitControls: any;
  export const Bloom: any;
  export const EffectComposer: any;
  export const Float: any;
  export const Stars: any;
  export function useTexture(url: string): any;
}

declare module '@react-three/postprocessing' {
  export const EffectComposer: any;
  export const Bloom: any;
  export const ChromaticAberration: any;
  export const Noise: any;
  export const Vignette: any;
}
