"use client";

import { Canvas, ThreeEvent, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { feature, mesh as topoMesh } from "topojson-client";
import {
  geoCentroid,
  GeoPermissibleObjects,
  geoEquirectangular,
  geoPath,
} from "d3-geo";
import * as topojson from "@/lib/topojson";
import { useAppStore } from "@/store/useAppStore";
import { shallow } from "zustand/shallow";
import earcut from "earcut";
import { animateCameraTo } from "@/lib/utils";
import { getIso3FromGeom } from "@/lib/countryMap";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Feature as GJFeature, MultiPolygon, Polygon } from "geojson";

type CountryGeom = GJFeature<MultiPolygon | Polygon, any>;
type LonLat = [number, number];
type LinearRing = LonLat[];

/** Cartoon palette*/
const PALETTE = {
  ocean: "#2E8BFF",
  land: "#73D06B",
  borders: "#0A0A0A",
  rim: "#CFEFFF",
  selectedFill: "#D7FBE8",
  selectedEmissive: "#6EE7B7",
} as const;

/**Radii & motion */
const RADIUS = 1.8;
const PICK_EPS = 0.002;
const PICK_OFFSET   = 0.01;
const LIFT_TARGET = 0.12;
const LIFT_SPEED = 10;
const DENSIFY_STEP  = 0.18; 

/** Convert lon/lat to Vector3 on sphere. */
function latLonToVector3(lat: number, lon: number, radius = RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/** Unwrap ring to avoid antimeridian jumps. */
function unwrapRing(ring: LinearRing): LinearRing {
  if (!ring.length) return ring;
  const out: LinearRing = [];
  const first = ring[0] as LonLat;
  let prev = first[0];
  let offset = 0;
  for (const [lon, lat] of ring) {
    let L = lon + offset;
    const d = L - prev;
    if (d > 180) offset -= 360;
    else if (d < -180) offset += 360;
    L = lon + offset;
    out.push([L, lat]);
    prev = L;
  }
  return out;
}

/** Densify a ring so consecutive vertices are close in lon/lat. */
function densifyRing(ring: LinearRing, maxStepDeg = DENSIFY_STEP): LinearRing {
  if (ring.length < 2) return ring;
  const r = unwrapRing(ring);
  const out: LinearRing = [];

  for (let i = 0; i < r.length - 1; i++) {
    const p0 = r[i] as LonLat;
    const p1 = r[i + 1] as LonLat;
    const [lon0, lat0] = p0;
    const [lon1, lat1] = p1;

    out.push([lon0, lat0]);

    const dLon = lon1 - lon0;
    const dLat = lat1 - lat0;
    const steps = Math.max(
      0,
      Math.ceil(Math.max(Math.abs(dLon), Math.abs(dLat)) / maxStepDeg) - 1
    );

    for (let s = 1; s <= steps; s++) {
      const t = s / (steps + 1);
      out.push([lon0 + dLon * t, lat0 + dLat * t]);
    }
  }

  const last = r[r.length - 1] as LonLat;
  out.push(last);
  return out;
}

/** Triangulate polygon with holes onto a sphere radius (top surface). */
function ringsToGeometry(rings: LinearRing[], radius: number) {
  if (!rings.length) return new THREE.BufferGeometry();

  const dense = rings.map((rr) => densifyRing(rr, 0.25));

  const vertices2D: number[] = [];
  const holesIdx: number[] = [];

  dense.forEach((ring, idx) => {
    if (idx > 0) holesIdx.push(vertices2D.length / 2);
    for (const pt of ring) {
      const lon = (pt?.[0] as number) ?? 0;
      const lat = (pt?.[1] as number) ?? 0;
      vertices2D.push(lon, lat);
    }
  });

  const tris = earcut(vertices2D, holesIdx, 2);

  const positions: number[] = [];
  for (const i of tris) {
    const lon = vertices2D[i * 2] ?? 0;
    const lat = vertices2D[i * 2 + 1] ?? 0;
    const v = latLonToVector3(lat, lon, radius);
    positions.push(v.x, v.y, v.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.computeVertexNormals();
  return geometry;
}

/** Build extruded geometry for selected country */
function buildExtrudedCountryGeometry(
  featureGeom: CountryGeom,
  baseRadius: number,
  lift: number
) {
  const topRadius = baseRadius + Math.max(0, lift);

  let polys: LinearRing[][] = [];
  if (featureGeom.geometry.type === "Polygon") {
    const rings = (featureGeom.geometry.coordinates as number[][][]).map(
      (r) => r as LinearRing
    );
    if (rings.length) polys = [rings];
  } else {
    const mp = featureGeom.geometry.coordinates as number[][][][];
    polys = (mp || [])
      .map((poly) => (poly || []).map((r) => r as LinearRing))
      .filter((rings) => rings.length);
  }

  const topGeoms = polys.map((rings) => ringsToGeometry(rings, topRadius));
  const topMerged =
    topGeoms.length > 1
      ? BufferGeometryUtils.mergeGeometries(topGeoms, false)
      : topGeoms[0] ?? new THREE.BufferGeometry();

  return topMerged;
}

function makeCartoTexture(): THREE.Texture {
  const topo = topojson.getCountries110m();
  const countries = feature(topo as any, topo.objects.countries) as any;
  const borders = topoMesh(
    topo as any,
    topo.objects.countries,
    (a: any, b: any) => a !== b
  ) as any;

  const width = 4096;
  const height = 2048;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // 1) Use a strict equirectangular projection that matches SphereGeometry UVs
  const projection = geoEquirectangular()
    .translate([width / 2, height / 2])     // center at (W/2, H/2)
    .scale(width / (2 * Math.PI));          // 360° spans the full width

  const path = geoPath(projection, ctx as unknown as CanvasRenderingContext2D);

  // 2) Paint
  ctx.fillStyle = PALETTE.ocean;
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  path(countries as any);
  ctx.fillStyle = PALETTE.land;
  ctx.fill();

  ctx.beginPath();
  path(borders as any);
  ctx.strokeStyle = PALETTE.borders;
  ctx.lineWidth = Math.max(1, width / 2048);
  ctx.stroke();

  // 3) Build texture
  const tex = new THREE.CanvasTexture(canvas);
  // CanvasTexture defaults work; keep flipY as-is for CanvasTexture
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function PickMesh({ feature: f, onPick }: { feature: CountryGeom; onPick: (g: CountryGeom) => void }) {
  const geom = useMemo(() => buildExtrudedCountryGeometry(f, RADIUS + PICK_OFFSET, 0.001), [f]);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.01,           // a hair higher helps in some drivers
        colorWrite: false,       // still won’t render visually
        depthWrite: false,
        depthTest: false,        // can’t be hidden behind land
        side: THREE.DoubleSide,  //raycast both sides of thin tris
      }),
    []
  );
  return (
    <mesh
      geometry={geom}
      material={mat}
      frustumCulled={false}   // never culled off-screen by mistake
      renderOrder={-9999}     //evaluated early
      onPointerDown={(e) => { //more forgiving than click (mouseup can miss)
        e.stopPropagation();
        onPick(f);
      }}
    />
  );
}

function SelectedOverlay({
  featureGeom,
  onClick,
}: {
  featureGeom: CountryGeom | null;
  onClick: (g: CountryGeom) => void;
}) {
  const matSelected = useMemo(
    () =>
      new THREE.MeshToonMaterial({
        color: new THREE.Color(PALETTE.selectedFill),
        emissive: new THREE.Color(PALETTE.selectedEmissive),
        emissiveIntensity: 0.5,
      }),
    []
  );

  const [lift, setLift] = useState(0);

  useFrame((_, dt) => {
    const target = featureGeom ? LIFT_TARGET : 0;
    const next = THREE.MathUtils.lerp(lift, target, Math.min(1, dt * LIFT_SPEED));
    if (Math.abs(next - lift) > 0.0005) setLift(next);
  });

  const geom =
    useMemo(() => {
      if (!featureGeom) return null;
      return buildExtrudedCountryGeometry(featureGeom, RADIUS, lift);
    }, [featureGeom, lift]) || undefined;

  if (!featureGeom || !geom) return null;

  return (
    <mesh
      geometry={geom}
      material={matSelected}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick(featureGeom);
      }}
    />
  );
}

function Earth() {
  const tex = useMemo(() => {
    const t = makeCartoTexture();
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    t.needsUpdate = true;
    return t;
  }, []);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[RADIUS, 96, 96]} />
        <meshBasicMaterial map={tex} />
      </mesh>

      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[RADIUS, 64, 64]} />
        <meshBasicMaterial
          color={PALETTE.rim}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function Scene() {
  const [setSelected, setCameraTarget] = useAppStore(
    (s) => [s.setSelectedIso3, s.setCameraTarget],
    shallow
  );
  const selectedIso3 = useAppStore((s) => s.selectedIso3);
  const controls = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const [geoms, setGeoms] = useState<CountryGeom[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<CountryGeom | null>(null);

  useEffect(() => {
    if (!controls.current || !cameraRef.current) return;
    setCameraTarget((lat: number, lon: number) => {
      const target = latLonToVector3(lat, lon, RADIUS);
      animateCameraTo(cameraRef.current!, controls.current!, target, 6.2, 850);
    });
  }, [setCameraTarget]);

  useEffect(() => {
    const topo = topojson.getCountries110m();
    const fc = feature(topo as any, topo.objects.countries) as any;
    setGeoms(fc.features as CountryGeom[]);
  }, []);

  const onPick = (g: CountryGeom) => {
    const c = geoCentroid(g as unknown as GeoPermissibleObjects);
    const [lon, lat] = c;
    const iso3 = getIso3FromGeom(g as any);
    if (iso3) {
      setSelected(iso3, { lat, lon });
      setSelectedFeature(g);
    }
  };

  useEffect(() => {
    if (!selectedIso3) {
      setSelectedFeature(null);
      return;
    }
    const found =
      geoms.find((g) => getIso3FromGeom(g as any) === selectedIso3) || null;
    setSelectedFeature(found);
  }, [selectedIso3, geoms]);

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 6.5]} />
      <ambientLight intensity={1} />
      <directionalLight position={[6, 5, 4]} intensity={0.6} />

      <Earth />

      <Suspense fallback={null}>
        <group>
          {geoms.map((g, i) => (
            <PickMesh key={i} feature={g} onPick={onPick} />
          ))}
        </group>
      </Suspense>

      <SelectedOverlay featureGeom={selectedFeature} onClick={onPick} />

      <Stars radius={60} depth={50} count={3000} factor={4} fade />
      <OrbitControls ref={controls} enablePan={false} />
    </>
  );
}

export default function Globe() {
  return (
    <Canvas
      className="h-[60vh] md:h-[70vh] lg:h-[84vh] bg-transparent"
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
      }}
    >
      <Scene />
    </Canvas>
  );
}
